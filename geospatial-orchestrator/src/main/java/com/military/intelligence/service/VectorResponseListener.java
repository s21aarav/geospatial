package com.military.intelligence.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.military.intelligence.config.RabbitMQConfig;
import com.military.intelligence.domain.SearchResult;
import com.military.intelligence.domain.StatePayload;
import com.military.intelligence.domain.TaskStatus;
import com.military.intelligence.domain.VectorResponsePayload;
import com.military.intelligence.repository.TacticalTerrainRepository;
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

    public VectorResponseListener(TacticalTerrainRepository repository, StateManager stateManager, SseRegistry sseRegistry, ObjectMapper objectMapper) {
        this.repository = repository;
        this.stateManager = stateManager;
        this.sseRegistry = sseRegistry;
        this.objectMapper = objectMapper;
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
            if (filters != null) {
                if (filters.containsKey("topK")) {
                    topK = Integer.parseInt(filters.get("topK").toString());
                }
                if (filters.containsKey("threshold")) {
                    threshold = Double.parseDouble(filters.get("threshold").toString());
                }
                if (filters.containsKey("terrainClass")) {
                    terrainClass = (String) filters.get("terrainClass");
                }
            }

            // Search PostgreSQL pgvector
            List<Object[]> rows = repository.findNearestNeighborsNative(vectorString, topK, threshold, terrainClass);
            
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
                double score = ((Number) row[3]).doubleValue();
                String tClass = (String) row[4];
                float ndvi = ((Number) row[5]).floatValue();
                float ndwi = ((Number) row[6]).floatValue();
                float brightness = ((Number) row[7]).floatValue();
                
                results.add(new SearchResult(filename, lat, lon, score, tClass, ndvi, ndwi, brightness));
            }
            
            java.util.Map<String, Object> queryStats = java.util.Map.of(
                "ndvi", payload.getNdvi(),
                "ndwi", payload.getNdwi(),
                "brightness", payload.getBrightness()
            );

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
}
