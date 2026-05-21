# Geospatial Intelligence Search Platform

A Palantir-style tactical terrain search application using EuroSAT multispectral satellite imagery, Vision Transformer (ViT) embeddings, and real-time telemetry processing.

---

## Technical Stack
- **Frontend**: React + Vite + Leaflet Maps (`http://localhost:5173`)
- **Backend Orchestrator**: Spring Boot (`http://localhost:8080`)
- **AI Inference Worker**: Python + PyTorch running on Apple Silicon GPU (`mps`)
- **Messaging & Cache**: RabbitMQ + Redis
- **Vector Database**: PostgreSQL 18 + `pgvector`

---

## 🚀 Native Local Stack (Recommended for macOS M1/M2/M3)

Running services natively on macOS ensures the AI worker can leverage the **Apple Silicon GPU (`mps`)** for sub-50ms inference.

### Starting the Stack

1. **Start Database and Broker Services:**
   ```bash
   brew services start postgresql@18
   brew services start redis
   brew services start rabbitmq
   ```

2. **Start the AI Inference Worker (Terminal 1):**
   ```bash
   ./ai-worker-env/bin/python ai-worker/worker.py
   ```

3. **Start the Spring Boot Backend (Terminal 2):**
   ```bash
   cd geospatial-orchestrator && ./mvnw spring-boot:run
   ```

4. **Start the React Frontend (Terminal 3):**
   ```bash
   cd frontend && npm run dev
   ```

### Stopping the Stack

1. **Stop Node, Java, and Python Processes:**
   Press `Ctrl + C` in the respective terminal windows running the processes. 

   *Alternatively, force stop them from any terminal:*
   ```bash
   # Kill running frontend, backend, and worker processes
   killall node
   killall java
   pkill -f worker.py
   ```

2. **Stop Homebrew Services:**
   ```bash
   brew services stop postgresql@18
   brew services stop redis
   brew services stop rabbitmq
   ```

---

## 🐳 Docker Stack (Alternative)

You can run the application services inside Docker. However, the **AI worker must run natively** in order to utilize the macOS GPU.

### Starting the Stack

1. **Spin up Infrastructure, Backend, and Frontend:**
   ```bash
   docker-compose up -d
   ```

2. **Start the AI GPU Worker Natively:**
   ```bash
   ./ai-worker-env/bin/python ai-worker/worker.py
   ```

### Stopping the Stack

1. **Stop Docker Containers:**
   ```bash
   docker-compose down
   ```

2. **Stop the AI GPU Worker:**
   Press `Ctrl + C` in its terminal, or run:
   ```bash
   pkill -f worker.py
   ```
