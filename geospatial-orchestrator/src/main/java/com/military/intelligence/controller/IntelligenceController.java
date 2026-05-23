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
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/v1/intelligence")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:5173}")
public class IntelligenceController {

    private final RabbitTemplate rabbitTemplate;
    private final StateManager stateManager;
    private final SseRegistry sseRegistry;
    private final ObjectMapper objectMapper;
    
    @Value("${app.upload.dir:/tmp/geo_ingest/}")
    private String uploadDir;

    @Value("${app.data.dir:./data}")
    private String dataDir;

    public IntelligenceController(RabbitTemplate rabbitTemplate, StateManager stateManager, SseRegistry sseRegistry, ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.stateManager = stateManager;
        this.sseRegistry = sseRegistry;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        new File(uploadDir).mkdirs();
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "taskId", required = false) String taskIdStr,
            @RequestParam(value = "topK", defaultValue = "5") int topK,
            @RequestParam(value = "threshold", defaultValue = "0.0") double threshold,
            @RequestParam(value = "terrainClass", required = false) String terrainClass,
            @RequestParam(value = "searchMode", defaultValue = "HYBRID") String searchMode,
            @RequestParam(value = "vitWeight", defaultValue = "0.70") double vitWeight,
            @RequestParam(value = "ndviWeight", defaultValue = "0.15") double ndviWeight,
            @RequestParam(value = "ndwiWeight", defaultValue = "0.10") double ndwiWeight,
            @RequestParam(value = "brightnessWeight", defaultValue = "0.05") double brightnessWeight,
            @RequestParam(value = "minLat", required = false) Double minLat,
            @RequestParam(value = "maxLat", required = false) Double maxLat,
            @RequestParam(value = "minLon", required = false) Double minLon,
            @RequestParam(value = "maxLon", required = false) Double maxLon) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
            }

            // Secure Magic Bytes Validation
            byte[] header = new byte[4];
            try (java.io.InputStream is = file.getInputStream()) {
                int bytesRead = is.read(header, 0, 4);
                if (bytesRead < 4) {
                    return ResponseEntity.badRequest().body(Map.of("error", "File is too small to be a valid image"));
                }
            }
            boolean isJpeg = (header[0] == (byte) 0xFF && header[1] == (byte) 0xD8);
            boolean isPng = (header[0] == (byte) 0x89 && header[1] == (byte) 0x50 && header[2] == (byte) 0x4E && header[3] == (byte) 0x47);
            boolean isTiffI = (header[0] == (byte) 0x49 && header[1] == (byte) 0x49 && header[2] == (byte) 0x2A && header[3] == (byte) 0x00);
            boolean isTiffM = (header[0] == (byte) 0x4D && header[1] == (byte) 0x4D && header[2] == (byte) 0x00 && header[3] == (byte) 0x2A);
            if (!isJpeg && !isPng && !isTiffI && !isTiffM) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid file signature. Only real JPEG, PNG, and TIFF images are allowed."));
            }

            // Generate UUID and path
            UUID taskId = (taskIdStr != null && !taskIdStr.trim().isEmpty()) ? UUID.fromString(taskIdStr) : UUID.randomUUID();
            String originalFilename = file.getOriginalFilename();
            String extension = (originalFilename != null && originalFilename.contains(".")) ? originalFilename.substring(originalFilename.lastIndexOf(".")) : ".tiff";
            String newFilename = taskId + extension;
            Path destination = Paths.get(uploadDir + newFilename);

            // Save file natively
            Files.write(destination, file.getBytes());
            
            // Normalize weights
            if ("HYBRID".equals(searchMode)) {
                double total = vitWeight + ndviWeight + ndwiWeight + brightnessWeight;
                if (total > 0) {
                    vitWeight /= total;
                    ndviWeight /= total;
                    ndwiWeight /= total;
                    brightnessWeight /= total;
                }
            } else if ("SPECTRAL_ONLY".equals(searchMode)) {
                double total = ndviWeight + ndwiWeight + brightnessWeight;
                if (total > 0) {
                    ndviWeight /= total;
                    ndwiWeight /= total;
                    brightnessWeight /= total;
                }
            }
            
            java.util.Map<String, Object> filters = new java.util.HashMap<>();
            filters.put("topK", topK);
            filters.put("threshold", threshold);
            filters.put("searchMode", searchMode);
            filters.put("vitWeight", vitWeight);
            filters.put("ndviWeight", ndviWeight);
            filters.put("ndwiWeight", ndwiWeight);
            filters.put("brightnessWeight", brightnessWeight);
            filters.put("queuedAt", System.currentTimeMillis());
            if (terrainClass != null && !terrainClass.isEmpty()) {
                filters.put("terrainClass", terrainClass);
            }
            if (minLat != null) filters.put("minLat", minLat);
            if (maxLat != null) filters.put("maxLat", maxLat);
            if (minLon != null) filters.put("minLon", minLon);
            if (maxLon != null) filters.put("maxLon", maxLon);

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

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamGlobalStatus() {
        // Create emitter with 30 minute timeout for global updates
        SseEmitter emitter = new SseEmitter(1800000L);
        sseRegistry.registerGlobal(emitter);
        return emitter;
    }

    @GetMapping(value = "/images/{category}/{filename}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getImage(@PathVariable("category") String category, @PathVariable("filename") String filename) {
        try {
            Path basePath = Paths.get(dataDir, "eurosat", "web").toAbsolutePath().normalize();
            Path imagePath = basePath.resolve(Paths.get(category, filename)).toAbsolutePath().normalize();
            
            // Path traversal protection
            if (!imagePath.startsWith(basePath)) {
                return ResponseEntity.badRequest().build();
            }
            
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
    
    @GetMapping(value = "/heatmap/{taskId}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getHeatmap(@PathVariable("taskId") UUID taskId) {
        try {
            Path heatmapPath = Paths.get(uploadDir + taskId + "_heatmap.png");
            if (Files.exists(heatmapPath)) {
                byte[] imageBytes = Files.readAllBytes(heatmapPath);
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
    @GetMapping(value = "/tif/{category}/{filename}", produces = "image/tiff")
    public ResponseEntity<byte[]> getTif(@PathVariable("category") String category, @PathVariable("filename") String filename) {
        try {
            // EuroSAT MS dataset path
            Path basePath = Paths.get(dataDir, "eurosat", "EuroSAT_MS").toAbsolutePath().normalize();
            Path tifPath = basePath.resolve(Paths.get(category, filename)).toAbsolutePath().normalize();
            
            // Path traversal protection
            if (!tifPath.startsWith(basePath)) {
                return ResponseEntity.badRequest().build();
            }
            
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
