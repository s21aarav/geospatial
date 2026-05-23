import pytest
import numpy as np
import torch
import uuid
import sys
import os

# Ensure ai-worker is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ingest_eurosat

def test_eurosat_process_batch():
    # Mock parameters
    class MockModel:
        def __call__(self, tensors):
            class MockOutput:
                # Mock embedding size of 768
                last_hidden_state = torch.rand((tensors.shape[0], 197, 768))
            return MockOutput()

    model = MockModel()
    device = torch.device("cpu")
    tensors = torch.rand((2, 3, 224, 224))
    file_paths = ["/fake/path/AnnualCrop/1.tif", "/fake/path/Forest/2.tif"]
    categories = ["AnnualCrop", "Forest"]
    norm_arrays = [torch.rand((3, 64, 64)), torch.rand((3, 64, 64))]
    ndvis = [0.5, 0.6]
    ndwis = [-0.1, 0.2]
    brightnesses = [120.0, 80.0]
    data_rows = []

    # Inject dummy output dir to avoid permission/file errors
    ingest_eurosat.WEB_DIR = "/tmp/fake_web_dir"

    ingest_eurosat.process_batch(
        model, device, tensors, file_paths, categories,
        norm_arrays, ndvis, ndwis, brightnesses, data_rows
    )

    # We expect 2 data rows appended
    assert len(data_rows) == 2
    row1 = data_rows[0]
    
    # Check row structure for execute_values:
    # (id, filename, latitude, longitude, terrain_class, ndvi, ndwi, brightness, vector_str)
    assert len(row1) == 9
    assert isinstance(row1[0], str) # uuid
    assert "AnnualCrop/1.png" in row1[1]
    assert isinstance(row1[2], float) # lat
    assert isinstance(row1[3], float) # lon
    assert row1[4] == "AnnualCrop"
    assert row1[5] == 0.5
    assert row1[6] == -0.1
    assert row1[7] == 120.0
    assert isinstance(row1[8], str) # vector string
    assert row1[8].startswith("[") and row1[8].endswith("]")
