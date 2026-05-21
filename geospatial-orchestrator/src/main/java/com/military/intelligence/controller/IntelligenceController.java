package com.military.intelligence.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.military.intelligence.config.RabbitMQConfig;
import com.military.intelligence.domain.IngestionPayload;
import com.military.intelligence.domain.StatePayload;
import com.military.intelligence.domain.TaskStatus;
import com.military.intelligence.service.SseRegistry;
import com.military.intelligence.service.StateManager;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/intelligence")
@CrossOrigin(origins = "*") // For local dev with Vite
public class IntelligenceController {

    private final RabbitTemplate rabbitTemplate;
    private final StateManager stateManager;
    private final SseRegistry sseRegistry;
    private final ObjectMapper objectMapper;
    private static final String UPLOAD_DIR = "/tmp/geo_ingest/";

    public IntelligenceController(RabbitTemplate rabbitTemplate, StateManager stateManager, SseRegistry sseRegistry, ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.stateManager = stateManager;
        this.sseRegistry = sseRegistry;
        this.objectMapper = objectMapper;
        
        // Ensure upload directory exists
        new File(UPLOAD_DIR).mkdirs();
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "topK", defaultValue = "5") int topK,
            @RequestParam(value = "threshold", defaultValue = "0.0") double threshold,
            @RequestParam(value = "terrainClass", required = false) String terrainClass) {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        UUID taskId = UUID.randomUUID();
        // Preserve original extension so rasterio/PIL can detect format
        String originalName = file.getOriginalFilename();
        String extension = ".tiff";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }
        Path destination = Paths.get(UPLOAD_DIR + taskId + extension);

        try {
            // Save file natively
            Files.write(destination, file.getBytes());
            
            java.util.Map<String, Object> filters = new java.util.HashMap<>();
            filters.put("topK", topK);
            filters.put("threshold", threshold);
            if (terrainClass != null && !terrainClass.isEmpty()) {
                filters.put("terrainClass", terrainClass);
            }

            // Update State to QUEUED
            StatePayload initialState = new StatePayload(TaskStatus.QUEUED, null, null, null, filters);
            stateManager.updateState(taskId, initialState);

            // Publish to RabbitMQ
            IngestionPayload payload = new IngestionPayload(taskId, destination.toString());
            String jsonPayload = objectMapper.writeValueAsString(payload);
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, "ai.extract", jsonPayload);

            // Update State to PROCESSING (since it's now in the queue)
            StatePayload processingState = new StatePayload(TaskStatus.PROCESSING, null, null, null, filters);
            stateManager.updateState(taskId, processingState);

            // Also emit AMQP_ROUTING step directly to UI
            Map<String, String> amqpStep = Map.of(
                "taskId", taskId.toString(),
                "status", "AMQP_ROUTING",
                "name", "AMQP Queue Routing Protocol",
                "desc", "Dispatching raw bytes to High-Speed Event Bus"
            );
            sseRegistry.sendEvent(taskId, amqpStep);

            // Return 202 Accepted immediately
            return ResponseEntity.accepted().body(Map.of("task_id", taskId.toString()));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to process upload: " + e.getMessage());
        }
    }

    @GetMapping(value = "/stream/{task_id}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamStatus(@PathVariable("task_id") UUID taskId) {
        // Create emitter with 30 minute timeout
        SseEmitter emitter = new SseEmitter(1800000L);
        sseRegistry.register(taskId, emitter);

        // Immediately send current state
        StatePayload currentState = stateManager.getState(taskId);
        try {
            emitter.send(SseEmitter.event().name("status").data(currentState));
        } catch (Exception e) {
            emitter.completeWithError(e);
        }

        return emitter;
    }

    @GetMapping(value = "/images/{category}/{filename}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getImage(@PathVariable("category") String category, @PathVariable("filename") String filename) {
        try {
            Path imagePath = Paths.get("/Users/aaravsingh/Desktop/GROSPATIAL MODEL/data/eurosat/web/", category, filename);
            if (Files.exists(imagePath)) {
                byte[] imageBytes = Files.readAllBytes(imagePath);
                return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(imageBytes);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Serves original EuroSAT multispectral TIF files for evaluation benchmarks.
     */
    @GetMapping(value = "/tif/{category}/{filename}", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> getTif(@PathVariable("category") String category, @PathVariable("filename") String filename) {
        try {
            // EuroSAT MS dataset path
            Path tifPath = Paths.get("/Users/aaravsingh/Desktop/GROSPATIAL MODEL/data/eurosat/EuroSAT_MS/", category, filename);
            if (Files.exists(tifPath)) {
                byte[] tifBytes = Files.readAllBytes(tifPath);
                return ResponseEntity.ok()
                        .header("Content-Disposition", "attachment; filename=" + filename)
                        .body(tifBytes);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
