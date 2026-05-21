import os
import sys
import zipfile
import urllib.request
import random
import uuid
import subprocess
import numpy as np
import torch
import rasterio
from PIL import Image
from transformers import AutoModel

# Configuration
DATA_DIR = "/Users/aaravsingh/Desktop/GROSPATIAL MODEL/data"
ZIP_URL = "http://weegee.vision.ucmerced.edu/datasets/UCMerced_LandUse.zip"
ZIP_PATH = os.path.join(DATA_DIR, "UCMerced_LandUse.zip")
EXTRACT_DIR = os.path.join(DATA_DIR, "ucmerced")
WEB_DIR = os.path.join(DATA_DIR, "ucmerced", "web")
SQL_PATH = os.path.join(DATA_DIR, "seed_data.sql")

# 21 UC Merced Classes with tactical base coordinates (Bay Area & Yosemite focus)
CLASS_COORDINATES = {
    "agricultural": (37.524, -120.892),       # Central Valley Farms
    "airplane": (37.619, -122.375),           # SFO Runways
    "baseballdiamond": (37.768, -122.467),    # SF Park Diamonds
    "beach": (37.502, -122.518),              # Half Moon Bay
    "buildings": (37.789, -122.401),          # SF Financial District
    "chaparral": (37.865, -122.233),          # Berkeley Hills Chaparral
    "denseresidential": (37.794, -122.407),   # SF Chinatown
    "forest": (37.745, -119.533),             # Yosemite Valley
    "freeway": (37.827, -122.291),            # Oakland MacArthur Maze
    "golfcourse": (36.568, -121.951),         # Pebble Beach
    "harbor": (37.806, -122.405),             # SF Fisherman's Wharf
    "intersection": (37.7749, -122.4194),     # SF Downtown Intersections
    "landside": (37.250, -115.810),           # Desert Area 51 Lands
    "mediumresidential": (37.760, -122.435),  # SF Mission District
    "mobilehomepark": (37.382, -122.012),     # Sunnyvale Residential
    "overpass": (37.662, -122.122),           # Hayward Overpasses
    "parkinglot": (37.422, -122.084),         # Googleplex parking lots
    "river": (37.826, -122.479),              # SF Bay / Golden Gate
    "runway": (37.613, -122.390),             # SFO Main Runway
    "sparseresidential": (37.452, -122.148),  # Palo Alto Estates
    "storagetanks": (37.925, -122.378),       # Richmond Refinery Storage
    "tenniscourt": (37.770, -122.468)         # SF Golden Gate tennis
}

def report_progress(block_num, block_size, total_size):
    read_so_far = block_num * block_size
    if total_size > 0:
        percent = min(100, read_so_far * 100 / total_size)
        sys.stdout.write(f"\rDownloading dataset: {percent:.1f}% ({read_so_far / (1024*1024):.1f}MB / {total_size / (1024*1024):.1f}MB)")
        sys.stdout.flush()
    else:
        sys.stdout.write(f"\rDownloading dataset: {read_so_far / (1024*1024):.1f}MB downloaded")
        sys.stdout.flush()

def download_dataset():
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(ZIP_PATH):
        print(f"Dataset zip already exists at {ZIP_PATH}, skipping download.")
        return True

    print(f"Downloading UC Merced Land Use Dataset from {ZIP_URL}...")
    try:
        urllib.request.urlretrieve(ZIP_URL, ZIP_PATH, report_progress)
        print("\nDownload complete.")
        return True
    except Exception as e:
        print(f"\nFailed to download from primary source: {str(e)}")
        return False

def extract_dataset():
    if os.path.exists(os.path.join(EXTRACT_DIR, "UCMerced_LandUse")):
        print("Dataset already unzipped.")
        return True
    
    print(f"Extracting zip file {ZIP_PATH} to {EXTRACT_DIR}...")
    try:
        with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
            zip_ref.extractall(EXTRACT_DIR)
        print("Extraction complete.")
        return True
    except Exception as e:
        print(f"Failed to unzip dataset: {str(e)}")
        return False

def generate_synthetic_dataset():
    print("INBUILT RESILIENCE: Creating high-quality synthetic land-use GeoTIFF dataset...")
    os.makedirs(os.path.join(EXTRACT_DIR, "UCMerced_LandUse", "Images"), exist_ok=True)
    
    # Generate 10 images per class for a fast, working mockup
    for category in CLASS_COORDINATES.keys():
        cat_dir = os.path.join(EXTRACT_DIR, "UCMerced_LandUse", "Images", category)
        os.makedirs(cat_dir, exist_ok=True)
        print(f"Generating synthetic TIFFs for class '{category}'...")
        
        for i in range(10):
            tif_name = f"{category}{i:02d}.tif"
            tif_path = os.path.join(cat_dir, tif_name)
            
            # Create a 256x256 image with unique texture/colors based on category
            arr = np.zeros((256, 256, 3), dtype=np.uint8)
            # Pick base color
            if category in ["agricultural", "golfcourse", "tenniscourt"]:
                base_color = [34, 139 + random.randint(-20, 20), 34] # ForestGreen-ish
            elif category in ["airplane", "buildings", "parkinglot", "runway", "freeway", "overpass"]:
                base_color = [100 + random.randint(-10, 10), 100 + random.randint(-10, 10), 100 + random.randint(-10, 10)] # Grey asphalt
            elif category == "forest":
                base_color = [0, 80 + random.randint(-20, 20), 0] # Dark green
            elif category in ["beach", "landside"]:
                base_color = [238, 214 + random.randint(-15, 15), 175] # Sandy beige
            elif category in ["river", "harbor"]:
                base_color = [0, 70 + random.randint(-15, 15), 140 + random.randint(-20, 20)] # Blue-ish water
            else:
                base_color = [random.randint(50, 200), random.randint(50, 200), random.randint(50, 200)]
                
            arr[:, :, 0] = base_color[0]
            arr[:, :, 1] = base_color[1]
            arr[:, :, 2] = base_color[2]
            
            # Add patterns (e.g. grids for roads, stripes for runways, noise for forest)
            if category in ["runway", "freeway"]:
                # Add a white stripe in center
                arr[120:136, :, :] = 255
            elif category == "parkinglot":
                # Add white grid lines
                for x in range(0, 256, 40):
                    arr[:, x:x+2, :] = 255
            elif category == "forest":
                # Add noise
                noise = np.random.randint(-30, 30, (256, 256, 3))
                arr = np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
            elif category == "baseballdiamond":
                # Circle pattern
                for y in range(256):
                    for x in range(256):
                        if (x-128)**2 + (y-128)**2 < 50**2:
                            arr[y, x] = [139, 69, 19] # Dirt brown
                            
            # Add significant distinct noise to ensure unique tensors post-normalization
            noise = np.random.randint(-40, 40, (256, 256, 3))
            arr = np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
                            
            # Save as TIFF using Pillow
            img = Image.fromarray(arr)
            img.save(tif_path, format="TIFF")
            
    print("Synthetic dataset generation complete.")

def preprocess_tiff(file_path, device):
    with rasterio.open(file_path) as src:
        bands = []
        for i in range(1, min(4, src.count + 1)):
            bands.append(src.read(i))
        
        arr = np.stack(bands, axis=0) # Shape: (3, H, W)
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

        target_h, target_w = 224, 224
        _, h, w = norm_arr.shape
        if h > target_h or w > target_w:
            start_y = max(0, (h - target_h) // 2)
            start_x = max(0, (w - target_w) // 2)
            norm_arr = norm_arr[:, start_y:start_y+target_h, start_x:start_x+target_w]
            
        _, h, w = norm_arr.shape
        if h < target_h or w < target_w:
            pad_h = max(0, target_h - h)
            pad_w = max(0, target_w - w)
            norm_arr = np.pad(norm_arr, ((0, 0), (0, pad_h), (0, pad_w)), mode='constant')
            
        tensor = torch.tensor(norm_arr).unsqueeze(0).to(device)
        return tensor

def process_and_seed():
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Inference Device: {device}")
    
    print("Loading ViT Model...")
    model = AutoModel.from_pretrained("google/vit-base-patch16-224")
    model.to(device)
    model.eval()
    
    images_dir = os.path.join(EXTRACT_DIR, "UCMerced_LandUse", "Images")
    if not os.path.exists(images_dir):
        print(f"Error: Images directory not found at {images_dir}")
        return
        
    os.makedirs(WEB_DIR, exist_ok=True)
    
    categories = sorted(os.listdir(images_dir))
    categories = [c for c in categories if os.path.isdir(os.path.join(images_dir, c))]
    
    print(f"Found {len(categories)} categories: {categories}")
    
    sql_statements = ["-- Seeding Tactical Terrain Dataset\n", "DELETE FROM tactical_terrain;\n"]
    
    processed_count = 0
    
    for category in categories:
        cat_dir = os.path.join(images_dir, category)
        # Create output class directory in web assets
        os.makedirs(os.path.join(WEB_DIR, category), exist_ok=True)
        
        base_lat, base_lon = CLASS_COORDINATES.get(category, (37.7749, -122.4194))
        
        files = sorted([f for f in os.listdir(cat_dir) if f.endswith(('.tif', '.tiff', '.TIF', '.TIFF'))])
        print(f"Processing {len(files)} files in class '{category}'...")
        
        for file_name in files:
            tif_path = os.path.join(cat_dir, file_name)
            
            # 1. Compute Embedding Vector
            try:
                tensor = preprocess_tiff(tif_path, device)
                with torch.no_grad():
                    outputs = model(tensor)
                last_hidden_state = outputs.last_hidden_state
                vector = torch.mean(last_hidden_state, dim=1).squeeze(0).cpu().numpy().tolist()
                
                # Format to exactly 768-D
                if len(vector) > 768:
                    vector = vector[:768]
                elif len(vector) < 768:
                    vector.extend([0.0] * (768 - len(vector)))
            except Exception as e:
                print(f"Error vectorizing {file_name}: {str(e)}")
                continue
                
            # 2. Save web-compatible PNG thumbnail
            try:
                png_name = file_name.rsplit('.', 1)[0] + ".png"
                png_path = os.path.join(WEB_DIR, category, png_name)
                with Image.open(tif_path) as img:
                    img.save(png_path, "PNG")
                relative_db_path = f"{category}/{png_name}"
            except Exception as e:
                print(f"Error converting {file_name} to PNG: {str(e)}")
                continue
                
            # 3. Generate Coordinates (tactical cluster + random jitter)
            # ~0.005 jitter is about 500 meters, keeping images tightly clustered but distinct
            jitter_lat = base_lat + random.uniform(-0.006, 0.006)
            jitter_lon = base_lon + random.uniform(-0.006, 0.006)
            
            # 4. Generate SQL statement
            record_id = uuid.uuid4()
            vector_str = "[" + ",".join(map(str, vector)) + "]"
            
            sql = f"INSERT INTO tactical_terrain (id, filename, latitude, longitude, embedding) VALUES ('{record_id}', '{relative_db_path}', {jitter_lat}, {jitter_lon}, '{vector_str}');\n"
            sql_statements.append(sql)
            
            processed_count += 1
            if processed_count % 100 == 0:
                print(f"Generated embeddings and PNGs for {processed_count} images.")
                
    # Write to seed_data.sql
    print(f"Writing SQL seed script containing {processed_count} entries to {SQL_PATH}...")
    with open(SQL_PATH, 'w') as f:
        f.writelines(sql_statements)
        
    # Execute SQL script in postgres
    print("Injecting SQL seed script into PostgreSQL...")
    try:
        result = subprocess.run(["psql", "-d", "postgres", "-f", SQL_PATH], capture_output=True, text=True)
        if result.returncode == 0:
            print("Successfully populated tactical_terrain table!")
            print(result.stdout.strip().split('\n')[-1]) # Print the final lines/results
        else:
            print(f"Error executing SQL script: {result.stderr}")
    except Exception as e:
        print(f"Subprocess run failed: {str(e)}")

def main():
    # Make sure download directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    
    download_success = download_dataset()
    if download_success:
        extract_success = extract_dataset()
        if not extract_success:
            generate_synthetic_dataset()
    else:
        print("Falling back to generating a resilient synthetic dataset...")
        generate_synthetic_dataset()
        
    process_and_seed()
    print("Bulk geospatial dataset seeding execution completed.")

if __name__ == "__main__":
    main()
