FROM python:3.12-slim

# Install system dependencies for rasterio and numpy
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip
RUN pip install --upgrade pip

# Install dependencies directly
# (Using requirements based on worker.py imports)
RUN pip install \
    numpy \
    pika \
    rasterio \
    torch \
    torchvision \
    transformers

COPY . /app/

CMD ["python", "worker.py"]
