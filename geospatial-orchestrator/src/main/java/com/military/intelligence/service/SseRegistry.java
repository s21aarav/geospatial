package com.military.intelligence.service;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

@Service
public class SseRegistry {
    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final List<SseEmitter> globalEmitters = new CopyOnWriteArrayList<>();

    public void register(UUID taskId, SseEmitter emitter) {
        emitters.put(taskId, emitter);
        emitter.onCompletion(() -> emitters.remove(taskId));
        emitter.onTimeout(() -> emitters.remove(taskId));
        emitter.onError(e -> emitters.remove(taskId));
    }

    public void registerGlobal(SseEmitter emitter) {
        globalEmitters.add(emitter);
        emitter.onCompletion(() -> globalEmitters.remove(emitter));
        emitter.onTimeout(() -> globalEmitters.remove(emitter));
        emitter.onError(e -> globalEmitters.remove(emitter));
    }

    public void sendEvent(UUID taskId, Object payload) {
        SseEmitter emitter = emitters.get(taskId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().name("status").data(payload));
            } catch (Exception e) {
                emitters.remove(taskId);
            }
        }

        for (SseEmitter globalEmitter : globalEmitters) {
            try {
                globalEmitter.send(SseEmitter.event().name("status").data(payload));
            } catch (Exception e) {
                globalEmitters.remove(globalEmitter);
            }
        }
    }
}

