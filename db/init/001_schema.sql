-- Initialization schema for the Hybrid Multispectral Retrieval Engine
-- IMPORTANT: This schema creates the tables and indexes but does NOT insert the 27,000 EuroSAT vectors.
-- You must ingest or load the dataset vectors separately.

CREATE EXTENSION IF NOT EXISTS vector;

-- Core geospatial dataset table
CREATE TABLE IF NOT EXISTS tactical_terrain (
    id UUID PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    terrain_class VARCHAR(100),
    ndvi REAL,
    ndwi REAL,
    brightness REAL,
    embedding vector(768)
);

-- Performance metrics per individual task
CREATE TABLE IF NOT EXISTS task_metrics (
    task_id UUID PRIMARY KEY,
    dispatched_at BIGINT,
    embedding_completed_at BIGINT,
    db_search_started_at BIGINT,
    completed_at BIGINT,
    total_time_ms BIGINT,
    embedding_time_ms BIGINT,
    db_search_time_ms BIGINT,
    queue_time_ms BIGINT
);

-- Aggregated evaluation benchmark runs
CREATE TABLE IF NOT EXISTS evaluation_runs (
    id UUID PRIMARY KEY,
    run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mode VARCHAR(50),
    top1_accuracy REAL,
    top3_accuracy REAL,
    top5_accuracy REAL,
    mrr REAL,
    average_latency_ms REAL
);

-- Individual evaluation query outcomes
CREATE TABLE IF NOT EXISTS evaluation_results (
    id UUID PRIMARY KEY,
    run_id UUID REFERENCES evaluation_runs(id),
    query_filename VARCHAR(255),
    query_class VARCHAR(100),
    predicted_class VARCHAR(100),
    is_correct_top1 BOOLEAN,
    latency_ms REAL
);

-- Indexes for optimized hybrid searching
CREATE INDEX IF NOT EXISTS idx_tactical_terrain_class ON tactical_terrain(terrain_class);
CREATE INDEX IF NOT EXISTS idx_tactical_terrain_ndvi ON tactical_terrain(ndvi);
CREATE INDEX IF NOT EXISTS idx_tactical_terrain_ndwi ON tactical_terrain(ndwi);

-- HNSW Vector Index for fast semantic nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_tactical_terrain_embedding 
ON tactical_terrain USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
