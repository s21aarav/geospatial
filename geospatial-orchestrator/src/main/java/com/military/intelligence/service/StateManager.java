package com.military.intelligence.service;

import com.military.intelligence.domain.StatePayload;
import com.military.intelligence.domain.TaskStatus;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
public class StateManager {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String PREFIX = "task:";

    public StateManager(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void updateState(UUID taskId, StatePayload payload) {
        redisTemplate.opsForValue().set(PREFIX + taskId.toString(), payload, Duration.ofHours(24));
    }

    public StatePayload getState(UUID taskId) {
        Object val = redisTemplate.opsForValue().get(PREFIX + taskId.toString());
        if (val instanceof StatePayload) {
            return (StatePayload) val;
        }
        return new StatePayload(TaskStatus.FAILED, null, "Task not found", null, null);
    }
}
