package com.military.intelligence.domain;

import java.util.List;
import java.util.UUID;

public class VectorResponsePayload {
    private UUID taskId;
    private List<Float> vector;
    private float ndvi;
    private float ndwi;
    private float brightness;
    private Long dispatchedAt;
    private Long embeddingCompletedAt;
    private Boolean hasHeatmap;

    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }

    public List<Float> getVector() { return vector; }
    public void setVector(List<Float> vector) { this.vector = vector; }
    
    public float getNdvi() { return ndvi; }
    public void setNdvi(float ndvi) { this.ndvi = ndvi; }
    
    public float getNdwi() { return ndwi; }
    public void setNdwi(float ndwi) { this.ndwi = ndwi; }
    
    public float getBrightness() { return brightness; }
    public void setBrightness(float brightness) { this.brightness = brightness; }
    
    public Long getDispatchedAt() { return dispatchedAt; }
    public void setDispatchedAt(Long dispatchedAt) { this.dispatchedAt = dispatchedAt; }
    
    public Long getEmbeddingCompletedAt() { return embeddingCompletedAt; }
    public void setEmbeddingCompletedAt(Long embeddingCompletedAt) { this.embeddingCompletedAt = embeddingCompletedAt; }
    
    public Boolean getHasHeatmap() { return hasHeatmap; }
    public void setHasHeatmap(Boolean hasHeatmap) { this.hasHeatmap = hasHeatmap; }
}
