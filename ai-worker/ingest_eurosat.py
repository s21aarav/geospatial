import os
import sys
import zipfile
import uuid
import time
import subprocess
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
import torch.nn.functional as F
import rasterio
from PIL import Image
from transformers import AutoModel

# Configuration
DATA_DIR = "/Users/aaravsingh/Desktop/GROSPATIAL MODEL/data"
ZIP_PATH = "/Users/aaravsingh/Downloads/EuroSAT_MS.zip"
EXTRACT_DIR = os.path.join(DATA_DIR, "eurosat")
WEB_DIR = os.path.join(EXTRACT_DIR, "web")
SQL_PATH = os.path.join(DATA_DIR, "seed_eurosat.sql")
BATCH_SIZE = 64

# EuroSAT 10 Classes with generic European base coordinates
CLASS_COORDINATES = {
    "AnnualCrop": (48.8566, 2.3522),       # France
    "Forest": (47.5162, 14.5501),          # Austria
    "HerbaceousVegetation": (41.8719, 12.5674), # Italy
    "Highway": (51.1657, 10.4515),         # Germany
    "Industrial": (52.5200, 13.4050),      # Berlin
    "Pasture": (53.1424, -7.6921),         # Ireland
    "PermanentCrop": (40.4637, -3.7492),   # Spain
    "Residential": (51.5074, -0.1278),     # London
    "River": (47.4979, 19.0402),           # Budapest (Danube)
    "SeaLake": (43.7696, 11.2558)          # Florence (near lakes/sea)
}

class EuroSATDataset(Dataset):
    def __init__(self, root_dir):
        self.root_dir = root_dir
        self.samples = []
        
        # Traverse directories to find TIFFs
        for root, _, files in os.walk(self.root_dir):
            if 'web' in root: continue
            for file in files:
                if file.lower().endswith(('.tif', '.tiff', '.jpg', '.jpeg')):
                    # category is usually the parent directory name
                    category = os.path.basename(root)
                    if category not in CLASS_COORDINATES and category != os.path.basename(self.root_dir):
                        # Attempt to normalize category name if it doesn't match perfectly
                        pass
                    self.samples.append((os.path.join(root, file), category))
                    
        print(f"Found {len(self.samples)} EuroSAT images.")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        file_path, category = self.samples[idx]
        try:
            with rasterio.open(file_path) as src:
                # EuroSAT MS has 13 bands. 
                # Sentinel-2 true color: B04 (Red), B03 (Green), B02 (Blue), B08 (NIR)
                if src.count >= 13:
                    r = src.read(4).astype(np.float32)
                    g = src.read(3).astype(np.float32)
                    b = src.read(2).astype(np.float32)
                    nir = src.read(8).astype(np.float32)
                    arr = np.stack([r, g, b], axis=0)
                    
                    ndvi = float(np.mean((nir - r) / (nir + r + 1e-8)))
                    ndwi = float(np.mean((g - nir) / (g + nir + 1e-8)))
                    brightness = float(np.mean(r + g + b) / 3.0) # approx
                else:
                    bands = []
                    for i in range(1, min(4, src.count + 1)):
                        bands.append(src.read(i).astype(np.float32))
                    arr = np.stack(bands, axis=0)
                    ndvi = 0.0
                    ndwi = 0.0
                    brightness = float(np.mean(arr))
                
                # Padding to 3 channels if necessary
                if arr.shape[0] < 3:
                    pad_width = ((0, 3 - arr.shape[0]), (0, 0), (0, 0))
                    arr = np.pad(arr, pad_width, mode='constant', constant_values=0)
                    
                arr = np.nan_to_num(arr, nan=0.0)
                
                # Min-Max Scaling per channel
                norm_arr = np.zeros_like(arr, dtype=np.float32)
                for i in range(arr.shape[0]):
                    band = arr[i]
                    p2, p98 = np.percentile(band, (2, 98))
                    if p98 - p2 == 0:
                        norm_arr[i] = 0
                    else:
                        norm_arr[i] = np.clip((band - p2) / (p98 - p2), 0, 1)

                # Convert to tensor (3, H, W)
                tensor = torch.tensor(norm_arr)
                
                # EuroSAT is 64x64. ViT needs 224x224. 
                # We use interpolate on a 4D tensor, so we unsqueeze then squeeze
                tensor_4d = tensor.unsqueeze(0)
                upscaled = F.interpolate(tensor_4d, size=(224, 224), mode='bilinear', align_corners=False)
                tensor = upscaled.squeeze(0)
                
                # Cap brightness for normalization ease
                if brightness > 10000: brightness = 10000.0
                
                return tensor, file_path, category, norm_arr, ndvi, ndwi, brightness
        except Exception as e:
            # Return empty tensor if read fails
            return torch.zeros((3, 224, 224)), file_path, category, np.zeros((3, 64, 64)), 0.0, 0.0, 0.0

def create_png_thumbnail(norm_arr, out_path):
    # Convert normalized (0-1) float array back to (0-255) image
    arr_255 = (norm_arr * 255).astype(np.uint8)
    # Transpose from (C, H, W) to (H, W, C)
    arr_hwc = np.transpose(arr_255, (1, 2, 0))
    img = Image.fromarray(arr_hwc)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, format="PNG")

def process_batch(model, device, tensors, file_paths, categories, norm_arrays, ndvis, ndwis, brightnesses, sql_statements):
    tensors = tensors.to(device)
    
    with torch.no_grad():
        outputs = model(tensors)
        
    last_hidden_state = outputs.last_hidden_state
    vectors = torch.mean(last_hidden_state, dim=1).cpu().numpy()
    
    for i in range(len(file_paths)):
        file_path = file_paths[i]
        category = categories[i]
        norm_arr = norm_arrays[i].numpy()
        ndvi_val = float(ndvis[i])
        ndwi_val = float(ndwis[i])
        brightness_val = float(brightnesses[i])
        vector = vectors[i].tolist()
        
        # Check if valid tensor was read
        if torch.sum(tensors[i]) == 0:
            continue
            
        if len(vector) > 768:
            vector = vector[:768]
        elif len(vector) < 768:
            vector.extend([0.0] * (768 - len(vector)))
            
        file_name = os.path.basename(file_path)
        png_name = file_name.rsplit('.', 1)[0] + ".png"
        png_path = os.path.join(WEB_DIR, category, png_name)
        create_png_thumbnail(norm_arr, png_path)
        
        relative_db_path = f"{category}/{png_name}"
        base_lat, base_lon = CLASS_COORDINATES.get(category, (48.8566, 2.3522))
        
        # Tactical jitter (~500m spread)
        jitter_lat = base_lat + np.random.uniform(-0.005, 0.005)
        jitter_lon = base_lon + np.random.uniform(-0.005, 0.005)
        
        record_id = uuid.uuid4()
        vector_str = "[" + ",".join(map(str, vector)) + "]"
        
        sql = f"INSERT INTO tactical_terrain (id, filename, latitude, longitude, terrain_class, ndvi, ndwi, brightness, embedding) VALUES ('{record_id}', '{relative_db_path}', {jitter_lat}, {jitter_lon}, '{category}', {ndvi_val}, {ndwi_val}, {brightness_val}, '{vector_str}');\n"
        sql_statements.append(sql)

def main():
    if not os.path.exists(ZIP_PATH) and not os.path.exists(EXTRACT_DIR):
        print(f"Error: {ZIP_PATH} not found. Please place the downloaded dataset in the data folder.")
        sys.exit(1)
        
    if os.path.exists(ZIP_PATH) and not os.path.exists(EXTRACT_DIR):
        print(f"Extracting {ZIP_PATH} to {EXTRACT_DIR}...")
        with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
            zip_ref.extractall(EXTRACT_DIR)
        print("Extraction complete.")

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Inference Device: {device}")
    
    print("Loading ViT Model...")
    model = AutoModel.from_pretrained("google/vit-base-patch16-224")
    model.to(device)
    model.eval()

    dataset = EuroSATDataset(EXTRACT_DIR)
    if len(dataset) == 0:
        print("No EuroSAT GeoTIFFs found. Check extraction path.")
        sys.exit(1)

    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    
    sql_statements = ["-- Seeding EuroSAT Dataset\n", "DELETE FROM tactical_terrain;\n"]
    
    start_time = time.time()
    processed = 0
    total = len(dataset)
    
    print(f"Starting bulk ingestion of {total} images using batch size {BATCH_SIZE}...")
    sys.stdout.flush()
    
    for batch_idx, (tensors, file_paths, categories, norm_arrays, ndvis, ndwis, brightnesses) in enumerate(dataloader):
        process_batch(model, device, tensors, file_paths, categories, norm_arrays, ndvis, ndwis, brightnesses, sql_statements)
        processed += len(file_paths)
        if processed % (BATCH_SIZE * 5) == 0 or processed == total:
            elapsed = time.time() - start_time
            rate = processed / elapsed
            print(f"Processed {processed}/{total} images. ({rate:.2f} images/sec)")
            sys.stdout.flush()
            
    # Write SQL
    print(f"Writing SQL seed script to {SQL_PATH}...")
    with open(SQL_PATH, 'w') as f:
        f.writelines(sql_statements)
        
    # Execute SQL
    print("Injecting SQL seed script into PostgreSQL...")
    try:
        result = subprocess.run(["psql", "-d", "postgres", "-f", SQL_PATH], capture_output=True, text=True)
        if result.returncode == 0:
            print("Successfully populated tactical_terrain table with EuroSAT!")
        else:
            print(f"Error executing SQL script: {result.stderr}")
    except Exception as e:
        print(f"Subprocess run failed: {str(e)}")

    print(f"Total time elapsed: {time.time() - start_time:.2f} seconds.")

if __name__ == "__main__":
    main()
