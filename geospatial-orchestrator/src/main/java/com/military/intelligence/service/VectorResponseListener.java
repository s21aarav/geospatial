package com.military.intelligence.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.military.intelligence.config.RabbitMQConfig;
import com.military.intelligence.domain.SearchResult;
import com.military.intelligence.domain.StatePayload;
import com.military.intelligence.domain.TaskMetric;
import com.military.intelligence.domain.TaskStatus;
import com.military.intelligence.domain.VectorResponsePayload;
import com.military.intelligence.repository.TacticalTerrainRepository;
import com.military.intelligence.repository.TaskMetricRepository;
import com.rabbitmq.client.Channel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class VectorResponseListener {

    private static final Logger log = LoggerFactory.getLogger(VectorResponseListener.class);
    
    private final TacticalTerrainRepository repository;
    private final StateManager stateManager;
    private final SseRegistry sseRegistry;
    private final ObjectMapper objectMapper;
    private final TaskMetricRepository taskMetricRepository;

    public VectorResponseListener(TacticalTerrainRepository repository, StateManager stateManager, SseRegistry sseRegistry, ObjectMapper objectMapper, TaskMetricRepository taskMetricRepository) {
        this.repository = repository;
        this.stateManager = stateManager;
        this.sseRegistry = sseRegistry;
        this.objectMapper = objectMapper;
        this.taskMetricRepository = taskMetricRepository;
    }

    @RabbitListener(queues = RabbitMQConfig.RESPONSE_QUEUE, ackMode = "MANUAL")
    public void handleVectorResponse(Message message, Channel channel) {
        long deliveryTag = message.getMessageProperties().getDeliveryTag();
        try {
            VectorResponsePayload payload = objectMapper.readValue(message.getBody(), VectorResponsePayload.class);
            log.info("Received vector for task: {}", payload.getTaskId());

            // Emit HNSW search start
            sseRegistry.sendEvent(payload.getTaskId(), java.util.Map.of(
                "taskId", payload.getTaskId().toString(),
                "status", "HNSW_GREEDY_SEARCH",
                "name", "HNSW Greedy Search Graph Routing",
                "desc", "Traversing O(log N) superhighways to find vector neighborhood"
            ));
            Thread.sleep(300);

            // Format vector to string "[0.1, 0.2, ...]" for pgvector CAST
            String vectorString = "[" + payload.getVector().stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(",")) + "]";

            // Get search filters
            StatePayload currentState = stateManager.getState(payload.getTaskId());
            java.util.Map<String, Object> filters = currentState != null ? currentState.getSearchFilters() : null;
            int topK = 5;
            double threshold = 0.0;
            String terrainClass = null;
            String searchMode = "HYBRID";
            double vitWeight = 0.70;
            double ndviWeight = 0.15;
            double ndwiWeight = 0.10;
            double brightnessWeight = 0.05;

            if (filters != null) {
                if (filters.containsKey("topK")) { topK = Integer.parseInt(filters.get("topK").toString()); }
                if (filters.containsKey("threshold")) { threshold = Double.parseDouble(filters.get("threshold").toString()); }
                if (filters.containsKey("terrainClass")) { terrainClass = (String) filters.get("terrainClass"); }
                if (filters.containsKey("searchMode")) { searchMode = (String) filters.get("searchMode"); }
                if (filters.containsKey("vitWeight")) { vitWeight = Double.parseDouble(filters.get("vitWeight").toString()); }
                if (filters.containsKey("ndviWeight")) { ndviWeight = Double.parseDouble(filters.get("ndviWeight").toString()); }
                if (filters.containsKey("ndwiWeight")) { ndwiWeight = Double.parseDouble(filters.get("ndwiWeight").toString()); }
                if (filters.containsKey("brightnessWeight")) { brightnessWeight = Double.parseDouble(filters.get("brightnessWeight").toString()); }
            }

            long dbSearchStart = System.currentTimeMillis();

            // Search PostgreSQL pgvector
            List<Object[]> rows = repository.findNearestNeighborsNative(
                    vectorString, topK, threshold, terrainClass, searchMode, 
                    payload.getNdvi(), payload.getNdwi(), payload.getBrightness(),
                    vitWeight, ndviWeight, ndwiWeight, brightnessWeight);
            
            long dbSearchEnd = System.currentTimeMillis();
            
            // Emit Cosine Similarity step
            sseRegistry.sendEvent(payload.getTaskId(), java.util.Map.of(
                "taskId", payload.getTaskId().toString(),
                "status", "COSINE_SIMILARITY",
                "name", "PostgreSQL Vector Cosine Distance",
                "desc", "Computing exact spatial distance using native pgvector ops"
            ));
            Thread.sleep(300);

            List<SearchResult> results = new ArrayList<>();
            for (Object[] row : rows) {
                String filename = (String) row[0];
                double lat = ((Number) row[1]).doubleValue();
                double lon = ((Number) row[2]).doubleValue();
                double vitScore = ((Number) row[3]).doubleValue();
                String tClass = (String) row[4];
                float ndvi = ((Number) row[5]).floatValue();
                float ndwi = ((Number) row[6]).floatValue();
                float brightness = ((Number) row[7]).floatValue();
                double ndviScore = ((Number) row[8]).doubleValue();
                double ndwiScore = ((Number) row[9]).doubleValue();
                double brightnessScore = ((Number) row[10]).doubleValue();
                double hybridScore = ((Number) row[11]).doubleValue();

                double displayScore = hybridScore;
                if ("VIT_ONLY".equals(searchMode)) displayScore = vitScore;
                
                String explanation = generateExplanation(searchMode, vitScore, ndviScore, ndwiScore, brightnessScore);
                
                results.add(new SearchResult(filename, lat, lon, displayScore, tClass, ndvi, ndwi, brightness,
                                             vitScore, ndviScore, ndwiScore, brightnessScore, hybridScore, explanation));
            }
            
            java.util.Map<String, Object> queryStats = new java.util.HashMap<>();
            queryStats.put("ndvi", payload.getNdvi());
            queryStats.put("ndwi", payload.getNdwi());
            queryStats.put("brightness", payload.getBrightness());
            queryStats.put("searchMode", searchMode);
            queryStats.put("vitWeight", vitWeight);
            queryStats.put("ndviWeight", ndviWeight);
            queryStats.put("ndwiWeight", ndwiWeight);
            queryStats.put("brightnessWeight", brightnessWeight);

            long completedAt = System.currentTimeMillis();
            long queuedAt = filters != null && filters.containsKey("queuedAt") ? Long.parseLong(filters.get("queuedAt").toString()) : completedAt;
            long dispatchedAt = payload.getDispatchedAt() != null ? payload.getDispatchedAt() : queuedAt;
            long embeddingCompletedAt = payload.getEmbeddingCompletedAt() != null ? payload.getEmbeddingCompletedAt() : dbSearchStart;
            
            long queueTimeMs = dispatchedAt - queuedAt;
            long embeddingTimeMs = embeddingCompletedAt - dispatchedAt;
            long dbSearchTimeMs = dbSearchEnd - dbSearchStart;
            long totalTimeMs = completedAt - queuedAt;

            java.util.Map<String, Object> taskMetrics = new java.util.HashMap<>();
            taskMetrics.put("queueTimeMs", queueTimeMs > 0 ? queueTimeMs : 0);
            taskMetrics.put("embeddingTimeMs", embeddingTimeMs > 0 ? embeddingTimeMs : 0);
            taskMetrics.put("dbSearchTimeMs", dbSearchTimeMs > 0 ? dbSearchTimeMs : 0);
            taskMetrics.put("totalTimeMs", totalTimeMs > 0 ? totalTimeMs : 0);
            
            queryStats.put("taskMetrics", taskMetrics);

            // Persist Task Metrics
            TaskMetric metric = new TaskMetric();
            metric.setTaskId(payload.getTaskId());
            metric.setDispatchedAt(dispatchedAt);
            metric.setEmbeddingCompletedAt(embeddingCompletedAt);
            metric.setDbSearchStartedAt(dbSearchStart);
            metric.setCompletedAt(completedAt);
            metric.setQueueTimeMs(queueTimeMs > 0 ? queueTimeMs : 0);
            metric.setEmbeddingTimeMs(embeddingTimeMs > 0 ? embeddingTimeMs : 0);
            metric.setDbSearchTimeMs(dbSearchTimeMs > 0 ? dbSearchTimeMs : 0);
            metric.setTotalTimeMs(totalTimeMs > 0 ? totalTimeMs : 0);
            taskMetricRepository.save(metric);

            // Emit final map object to match the schema
            sseRegistry.sendEvent(payload.getTaskId(), java.util.Map.of(
                "taskId", payload.getTaskId().toString(),
                "status", "COMPLETED",
                "name", "Intelligence Aggregation Complete",
                "desc", "Pipeline finished",
                "results", results,
                "queryStats", queryStats
            ));
            
            StatePayload finalState = new StatePayload(TaskStatus.COMPLETED, results, null, queryStats, filters);
            stateManager.updateState(payload.getTaskId(), finalState);

            channel.basicAck(deliveryTag, false);
            log.info("Task {} completed successfully.", payload.getTaskId());

        } catch (Exception e) {
            log.error("Error processing vector response", e);
            try {
                // Reject message to DLQ
                channel.basicReject(deliveryTag, false);
            } catch (Exception ex) {
                log.error("Failed to reject message", ex);
            }
        }
    }

    private String generateExplanation(String searchMode, double vit, double ndvi, double ndwi, double bright) {
        if ("VIT_ONLY".equals(searchMode)) {
            if (vit > 0.8) return "Strong semantic ViT match. Visual structure is nearly identical.";
            if (vit > 0.6) return "Moderate semantic ViT match. Similar visual patterns detected.";
            return "Weak semantic match. Geometry differs significantly.";
        } else if ("SPECTRAL_ONLY".equals(searchMode)) {
            if (ndvi > 0.8 && ndwi > 0.8) return "Excellent multispectral alignment on both vegetation and water profiles.";
            if (ndvi > 0.8) return "Strong vegetation density match regardless of structure.";
            return "Spectral profiles are correlated based on raw pixel reflectance.";
        } else {
            if (vit > 0.8 && ndvi > 0.8) return "Exceptional hybrid match. Both geometry and vegetation physics align perfectly.";
            if (vit > 0.7 && ndvi < 0.5) return "Strong structural match, but spectral profile (vegetation/water) differs.";
            if (vit < 0.6 && ndvi > 0.8) return "Structurally distinct, but spectral physics are highly similar.";
            return "Balanced hybrid match leveraging both semantic structure and spectral telemetry.";
        }
    }
}
