package com.military.intelligence.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.military.intelligence.config.RabbitMQConfig;
import com.rabbitmq.client.Channel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class StatusListener {

    private static final Logger log = LoggerFactory.getLogger(StatusListener.class);
    
    private final SseRegistry sseRegistry;
    private final ObjectMapper objectMapper;

    public StatusListener(SseRegistry sseRegistry, ObjectMapper objectMapper) {
        this.sseRegistry = sseRegistry;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitMQConfig.STATUS_QUEUE, ackMode = "MANUAL")
    public void handleStatusUpdate(Message message, Channel channel) {
        long deliveryTag = message.getMessageProperties().getDeliveryTag();
        try {
            JsonNode payload = objectMapper.readTree(message.getBody());
            UUID taskId = UUID.fromString(payload.get("taskId").asText());
            
            // Forward directly to SSE client
            sseRegistry.sendEvent(taskId, payload);
            
            channel.basicAck(deliveryTag, false);
            log.debug("Status updated for task {}: {}", taskId, payload.get("status").asText());

        } catch (Exception e) {
            log.error("Error processing status update", e);
            try {
                channel.basicReject(deliveryTag, false);
            } catch (Exception ex) {
                log.error("Failed to reject status message", ex);
            }
        }
    }
}
