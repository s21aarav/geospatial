import pytest
import numpy as np
import torch
import os
import tempfile
import rasterio
from PIL import Image

import worker

def test_preprocess_tiff_basic():
    # Create a temporary dummy TIFF
    with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
        tmp_path = tmp.name
        
    try:
        # Create a dummy image using rasterio
        arr = np.random.randint(0, 255, (3, 64, 64), dtype=np.uint8)
        with rasterio.open(
            tmp_path,
            'w',
            driver='GTiff',
            height=64,
            width=64,
            count=3,
            dtype=arr.dtype
        ) as dst:
            dst.write(arr)
            
        # Mock rabbitmq channel (we just pass None)
        tensor, ndvi, ndwi, brightness = worker.preprocess_tiff(tmp_path, None, "test_task")
        
        # Verify shape is interpolated to (1, 3, 224, 224)
        assert tensor.shape == (1, 3, 224, 224)
        # Verify normalization bounds
        assert torch.min(tensor) >= 0.0
        assert torch.max(tensor) <= 1.0
        # Verify metrics
        assert isinstance(ndvi, float)
        assert isinstance(ndwi, float)
        assert isinstance(brightness, float)
        
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
