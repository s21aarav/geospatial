import json
import logging
import numpy as np
import pika
import rasterio
import torch
import torch.nn.functional as F
import cv2
import time
import gc
import threading
from transformers import AutoModel

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Asynchronous GPU Memory Flusher State for 8GB Mac Swap Prevention
last_activity_time = time.time()
cleanup_needed = False
cleanup_lock = threading.Lock()

def idle_cleanup_worker():
    global last_activity_time, cleanup_needed
    logger.info("Background lazy GPU memory flusher initialized.")
    while True:
        time.sleep(2)
        with cleanup_lock:
            # If idle for more than 10 seconds since last activity, free MPS cache once
            if cleanup_needed and (time.time() - last_activity_time > 10):
                logger.info("Worker idle for 10s. Running lazy GPU cache cleanup...")
                try:
                    if hasattr(torch.mps, 'empty_cache'):
                        torch.mps.empty_cache()
                    gc.collect()
                except Exception as e:
                    logger.error(f"Error during lazy GPU flusher cleanup: {e}")
                cleanup_needed = False

# 1. Model Initialization & Mac M1 GPU Setup
logger.info("Initializing Apple Silicon MPS Device...")
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
logger.info(f"Using device: {device}")

logger.info("Downloading/Loading Vision Transformer (ViT) Foundation Model...")
# The official Prithvi model does not support AutoModel directly. Using standard ViT for pipeline execution.
model = AutoModel.from_pretrained("google/vit-base-patch16-224", output_attentions=True)
model.to(device)
if device.type == "mps":
    model.half()
model.eval()

# Warmup Apple Silicon (MPS) device to compile Metal Performance Shaders
logger.info("Warming up MPS device with a dummy forward pass...")
with torch.no_grad():
    dummy_input = torch.randn(1, 3, 224, 224).to(device)
    if device.type == "mps":
        dummy_input = dummy_input.half()
    _ = model(dummy_input)
logger.info("MPS Warmup complete.")

# RabbitMQ Configuration
import os
RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'localhost')
INGEST_QUEUE = 'image_ingestion_queue'
RESPONSE_EXCHANGE = 'geo_exchange'
RESPONSE_ROUTING_KEY = 'ai.response'
STATUS_ROUTING_KEY = 'ai.status'

def publish_status(ch, task_id, status_code, status_name, desc):
    payload = {
        "taskId": task_id,
        "status": status_code,
        "name": status_name,
        "desc": desc
    }
    ch.basic_publish(
        exchange=RESPONSE_EXCHANGE,
        routing_key=STATUS_ROUTING_KEY,
        body=json.dumps(payload)
    )

def preprocess_tiff(file_path: str, ch, task_id):
    logger.info(f"Preprocessing file: {file_path}")
    
    with rasterio.open(file_path) as src:
        if src.count >= 13:
            # EuroSAT MS: Extract Sentinel-2 True Color (Red=B04, Green=B03, Blue=B02, NIR=B08)
            r = src.read(4).astype(np.float32)
            g = src.read(3).astype(np.float32)
            b = src.read(2).astype(np.float32)
            nir = src.read(8).astype(np.float32)
            arr = np.stack([r, g, b], axis=0)
            
            ndvi = float(np.mean((nir - r) / (nir + r + 1e-8)))
            ndwi = float(np.mean((g - nir) / (g + nir + 1e-8)))
            brightness = float(np.mean(r + g + b) / 3.0)
        else:
            bands = []
            for i in range(1, min(4, src.count + 1)):
                bands.append(src.read(i).astype(np.float32))
            arr = np.stack(bands, axis=0) # Shape: (3, H, W)
            ndvi = 0.0
            ndwi = 0.0
            brightness = float(np.mean(arr))
        
        if arr.shape[0] < 3:
            pad_width = ((0, 3 - arr.shape[0]), (0, 0), (0, 0))
            arr = np.pad(arr, pad_width, mode='constant', constant_values=0)
            
        arr = np.nan_to_num(arr, nan=0.0)

        norm_arr = np.zeros_like(arr, dtype=np.float32)
        for i in range(arr.shape[0]):
            band = arr[i]
            p2, p98 = np.percentile(band, (2, 98))
            if p98 - p2 == 0:
                norm_arr[i] = 0
            else:
                norm_arr[i] = np.clip((band - p2) / (p98 - p2), 0, 1)

        tensor = torch.tensor(norm_arr).unsqueeze(0) # Shape: (1, 3, H, W)
        
        _, _, h, w = tensor.shape
        if h != 224 or w != 224:
            tensor = F.interpolate(tensor, size=(224, 224), mode='bilinear', align_corners=False)
            
        tensor = tensor.to(device)
        if device.type == "mps":
            tensor = tensor.half()
        
        if brightness > 10000: brightness = 10000.0
        
        return tensor, ndvi, ndwi, brightness

def callback(ch, method, properties, body):
    try:
        t_start = time.time()
        payload = json.loads(body)
        task_id = payload.get("taskId")
        file_path = payload.get("filePath")
        
        dispatched_at = int(time.time() * 1000)
        logger.info(f"Received task: {task_id}")
        
        t_before_ack = time.time()
        publish_status(ch, task_id, "FAIR_DISPATCH_ACK", "Fair Dispatch & Consumer ACK", "RabbitMQ dynamically allocating task to prevent OOM")
        t_after_ack = time.time()
        
        t_before_prep = time.time()
        tensor, ndvi, ndwi, brightness = preprocess_tiff(file_path, ch, task_id)
        t_after_prep = time.time()
        
        t_before_infer = time.time()
        with torch.no_grad():
            outputs = model(tensor)
        t_after_infer = time.time()
            
        last_hidden_state = outputs.last_hidden_state 
        vector = torch.mean(last_hidden_state, dim=1).squeeze(0).cpu().numpy().tolist()
        
        # --- XAI Heatmap Generation ---
        has_heatmap = False
        t_before_xai = time.time()
        try:
            attentions = outputs.attentions
            if attentions:
                # Get the attention from the last layer
                last_layer_attn = attentions[-1]
                # Average across all heads
                avg_attn = torch.mean(last_layer_attn, dim=1)
                # Attention of [CLS] token (index 0) to all patch tokens (index 1:)
                cls_attn = avg_attn[0, 0, 1:]
                
                # Reshape to 14x14 grid (196 patches)
                grid_size = int(np.sqrt(cls_attn.size(0)))
                attn_grid = cls_attn.reshape(grid_size, grid_size).cpu().numpy()
                
                # Normalize between 0 and 255
                attn_grid = attn_grid - np.min(attn_grid)
                attn_grid = attn_grid / (np.max(attn_grid) + 1e-8)
                attn_grid = np.uint8(255 * attn_grid)
                
                # Resize to original 224x224
                heatmap = cv2.resize(attn_grid, (224, 224), interpolation=cv2.INTER_CUBIC)
                heatmap_color = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
                
                # Read the original image from the tensor to overlay the heatmap
                orig_img = tensor.squeeze(0).cpu().numpy().transpose(1, 2, 0) # (224, 224, 3)
                orig_img = np.uint8(orig_img * 255)
                # Ensure orig_img is BGR for OpenCV
                orig_img = cv2.cvtColor(orig_img, cv2.COLOR_RGB2BGR)
                
                # Superimpose heatmap
                superimposed = cv2.addWeighted(orig_img, 0.6, heatmap_color, 0.4, 0)
                
                heatmap_path = f"/tmp/geo_ingest/{task_id}_heatmap.png"
                cv2.imwrite(heatmap_path, superimposed)
                has_heatmap = True
        except Exception as e:
            logger.error(f"Failed to generate XAI heatmap: {e}")
        t_after_xai = time.time()
        
        if len(vector) > 768:
            vector = vector[:768]
        elif len(vector) < 768:
            vector.extend([0.0] * (768 - len(vector)))
            
        embedding_completed_at = int(time.time() * 1000)
            
        response_payload = {
            "taskId": task_id,
            "vector": vector,
            "ndvi": ndvi,
            "ndwi": ndwi,
            "brightness": brightness,
            "dispatchedAt": dispatched_at,
            "embeddingCompletedAt": embedding_completed_at,
            "hasHeatmap": has_heatmap
        }
        
        t_before_pub = time.time()
        ch.basic_publish(
            exchange=RESPONSE_EXCHANGE,
            routing_key=RESPONSE_ROUTING_KEY,
            body=json.dumps(response_payload)
        )
        t_after_pub = time.time()
        logger.info(f"Successfully processed and published vector for task: {task_id}")
        
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
        # Defer GPU cache cleanup to background flusher to keep latency consistently ~13ms
        global last_activity_time, cleanup_needed
        with cleanup_lock:
            last_activity_time = time.time()
            cleanup_needed = True
        
        t_end = time.time()
        
        logger.info(f"TIMING BREAKDOWN for task {task_id}:")
        logger.info(f"  - Ack Publish: {(t_after_ack - t_before_ack) * 1000:.2f} ms")
        logger.info(f"  - Preprocessing: {(t_after_prep - t_before_prep) * 1000:.2f} ms")
        logger.info(f"  - Inference (Model): {(t_after_infer - t_before_infer) * 1000:.2f} ms")
        logger.info(f"  - Heatmap Gen: {(t_after_xai - t_before_xai) * 1000:.2f} ms")
        logger.info(f"  - Publish Response: {(t_after_pub - t_before_pub) * 1000:.2f} ms")
        logger.info(f"  - Total Callback Time: {(t_end - t_start) * 1000:.2f} ms")
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        ch.basic_reject(delivery_tag=method.delivery_tag, requeue=False)

def main():
    # Start background GPU cache flusher daemon thread
    flusher_thread = threading.Thread(target=idle_cleanup_worker, daemon=True)
    flusher_thread.start()
    
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    
    channel.queue_declare(queue=INGEST_QUEUE, durable=True, arguments={
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": "image_ingestion_dlq"
    })
    
    channel.basic_qos(prefetch_count=1)
    
    channel.basic_consume(queue=INGEST_QUEUE, on_message_callback=callback)
    
    logger.info('Worker initialized and waiting for messages. To exit press CTRL+C')
    channel.start_consuming()

if __name__ == '__main__':
    main()
