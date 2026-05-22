package com.military.intelligence.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.military.intelligence.domain.StatePayload;
import com.military.intelligence.domain.TaskMetric;
import com.military.intelligence.domain.VectorResponsePayload;
import com.military.intelligence.repository.TacticalTerrainRepository;
import com.military.intelligence.repository.TaskMetricRepository;
import com.rabbitmq.client.Channel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class VectorResponseListenerTest {

    private VectorResponseListener listener;
    private TacticalTerrainRepository repository;
    private StateManager stateManager;
    private SseRegistry sseRegistry;
    private ObjectMapper objectMapper;
    private TaskMetricRepository taskMetricRepository;
    private Channel channel;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(TacticalTerrainRepository.class);
        stateManager = Mockito.mock(StateManager.class);
        sseRegistry = Mockito.mock(SseRegistry.class);
        objectMapper = new ObjectMapper();
        taskMetricRepository = Mockito.mock(TaskMetricRepository.class);
        channel = Mockito.mock(Channel.class);
        
        listener = new VectorResponseListener(repository, stateManager, sseRegistry, objectMapper, taskMetricRepository);
    }

    @Test
    void testTaskMetricsCalculation() throws Exception {
        UUID taskId = UUID.randomUUID();
        long queuedAt = System.currentTimeMillis() - 1000;
        long dispatchedAt = queuedAt + 200;
        long embeddingCompletedAt = dispatchedAt + 500;
        
        Map<String, Object> filters = new HashMap<>();
        filters.put("queuedAt", queuedAt);
        StatePayload state = new StatePayload(null, null, null, null, filters);
        Mockito.when(stateManager.getState(taskId)).thenReturn(state);
        
        Mockito.when(repository.findNearestNeighborsNative(
                Mockito.anyString(), Mockito.anyInt(), Mockito.anyDouble(), Mockito.any(), Mockito.anyString(), 
                Mockito.anyDouble(), Mockito.anyDouble(), Mockito.anyDouble(), 
                Mockito.anyDouble(), Mockito.anyDouble(), Mockito.anyDouble(), Mockito.anyDouble(),
                Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
        )).thenReturn(Collections.emptyList());

        VectorResponsePayload payload = new VectorResponsePayload();
        payload.setTaskId(taskId);
        payload.setVector(Collections.singletonList(0.5f));
        payload.setDispatchedAt(dispatchedAt);
        payload.setEmbeddingCompletedAt(embeddingCompletedAt);
        
        byte[] body = objectMapper.writeValueAsBytes(payload);
        MessageProperties props = new MessageProperties();
        props.setDeliveryTag(1L);
        Message message = new Message(body, props);
        
        listener.handleVectorResponse(message, channel);
        
        ArgumentCaptor<TaskMetric> metricCaptor = ArgumentCaptor.forClass(TaskMetric.class);
        Mockito.verify(taskMetricRepository, Mockito.times(1)).save(metricCaptor.capture());
        
        TaskMetric metric = metricCaptor.getValue();
        assertNotNull(metric);
        assertTrue(metric.getQueueTimeMs() >= 200);
        assertTrue(metric.getEmbeddingTimeMs() >= 500);
        assertTrue(metric.getTotalTimeMs() >= 1000);
    }
}
