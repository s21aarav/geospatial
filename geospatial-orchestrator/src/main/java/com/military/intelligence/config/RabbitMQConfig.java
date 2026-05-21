package com.military.intelligence.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "geo_exchange";
    public static final String INGEST_QUEUE = "image_ingestion_queue";
    public static final String RESPONSE_QUEUE = "vector_response_queue";
    public static final String STATUS_QUEUE = "vector_status_queue";
    public static final String DLQ = "image_ingestion_dlq";

    @Bean
    DirectExchange geoExchange() {
        return new DirectExchange(EXCHANGE);
    }

    @Bean
    Queue ingestQueue() {
        return QueueBuilder.durable(INGEST_QUEUE)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", DLQ)
                .build();
    }

    @Bean
    Queue responseQueue() {
        return QueueBuilder.durable(RESPONSE_QUEUE).build();
    }

    @Bean
    Queue statusQueue() {
        return QueueBuilder.durable(STATUS_QUEUE).build();
    }

    @Bean
    Queue deadLetterQueue() {
        return QueueBuilder.durable(DLQ).build();
    }

    @Bean
    Binding ingestBinding(Queue ingestQueue, DirectExchange geoExchange) {
        return BindingBuilder.bind(ingestQueue).to(geoExchange).with("ai.extract");
    }

    @Bean
    Binding responseBinding(Queue responseQueue, DirectExchange geoExchange) {
        return BindingBuilder.bind(responseQueue).to(geoExchange).with("ai.response");
    }

    @Bean
    Binding statusBinding(Queue statusQueue, DirectExchange geoExchange) {
        return BindingBuilder.bind(statusQueue).to(geoExchange).with("ai.status");
    }
}
