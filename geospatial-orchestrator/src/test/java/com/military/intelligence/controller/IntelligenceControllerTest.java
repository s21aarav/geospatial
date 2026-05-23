package com.military.intelligence.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.military.intelligence.domain.IngestionPayload;
import com.military.intelligence.domain.StatePayload;
import com.military.intelligence.service.SseRegistry;
import com.military.intelligence.service.StateManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IntelligenceControllerTest {

    private IntelligenceController controller;
    private StateManager stateManager;
    private RabbitTemplate rabbitTemplate;
    private SseRegistry sseRegistry;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        stateManager = Mockito.mock(StateManager.class);
        rabbitTemplate = Mockito.mock(RabbitTemplate.class);
        sseRegistry = Mockito.mock(SseRegistry.class);
        objectMapper = new ObjectMapper();
        controller = new IntelligenceController(rabbitTemplate, stateManager, sseRegistry, objectMapper);
    }

    @Test
    void testHybridWeightNormalization() {
        byte[] validTiffHeader = new byte[] { 0x49, 0x49, 0x2A, 0x00, 0x00 };
        MockMultipartFile nonEmptyFile = new MockMultipartFile("file", "test.tif", "image/tiff", validTiffHeader);
        
        // Call with weights summing to 2.0 (1.0 + 0.5 + 0.3 + 0.2 = 2.0)
        ResponseEntity<?> response = controller.uploadImage(
                nonEmptyFile, null, 5, 0.0, null, "HYBRID", 1.0, 0.5, 0.3, 0.2, null, null, null, null
        );
        assertEquals(202, response.getStatusCode().value());
        
        // Capture StateManager state update to verify normalized weights
        ArgumentCaptor<StatePayload> stateCaptor = ArgumentCaptor.forClass(StatePayload.class);
        Mockito.verify(stateManager, Mockito.atLeastOnce()).updateState(Mockito.any(UUID.class), stateCaptor.capture());
        
        Map<String, Object> filters = stateCaptor.getValue().getSearchFilters();
        assertEquals(0.5, (double) filters.get("vitWeight"), 0.001);
        assertEquals(0.25, (double) filters.get("ndviWeight"), 0.001);
        assertEquals(0.15, (double) filters.get("ndwiWeight"), 0.001);
        assertEquals(0.10, (double) filters.get("brightnessWeight"), 0.001);
        
        assertTrue(filters.containsKey("queuedAt"));
    }

    @Test
    void testSpectralWeightNormalization() {
        byte[] validTiffHeader = new byte[] { 0x49, 0x49, 0x2A, 0x00, 0x00 };
        MockMultipartFile file = new MockMultipartFile("file", "test.tif", "image/tiff", validTiffHeader);
        
        ResponseEntity<?> response = controller.uploadImage(
                file, null, 5, 0.0, null, "SPECTRAL_ONLY", 1.0, 0.3, 0.1, 0.1, null, null, null, null
        );
        
        assertEquals(202, response.getStatusCode().value());
        
        ArgumentCaptor<StatePayload> stateCaptor = ArgumentCaptor.forClass(StatePayload.class);
        Mockito.verify(stateManager, Mockito.atLeastOnce()).updateState(Mockito.any(UUID.class), stateCaptor.capture());
        
        Map<String, Object> filters = stateCaptor.getValue().getSearchFilters();
        assertEquals(1.0, (double) filters.get("vitWeight"), 0.001); // Untouched in Spectral mode
        assertEquals(0.6, (double) filters.get("ndviWeight"), 0.001);
        assertEquals(0.2, (double) filters.get("ndwiWeight"), 0.001);
        assertEquals(0.2, (double) filters.get("brightnessWeight"), 0.001);
    }
}
