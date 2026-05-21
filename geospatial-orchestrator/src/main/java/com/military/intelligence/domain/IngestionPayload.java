package com.military.intelligence.domain;

import java.util.UUID;

public class IngestionPayload {
    private UUID taskId;
    private String filePath;

    public IngestionPayload(UUID taskId, String filePath) {
        this.taskId = taskId;
        this.filePath = filePath;
    }

    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
}
