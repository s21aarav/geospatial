package com.military.intelligence.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "task_metrics")
public class TaskMetric {

    @Id
    private UUID taskId;
    
    private Long dispatchedAt;
    private Long embeddingCompletedAt;
    private Long dbSearchStartedAt;
    private Long completedAt;
    
    private Long totalTimeMs;
    private Long embeddingTimeMs;
    private Long dbSearchTimeMs;
    private Long queueTimeMs;

    public TaskMetric() {
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public Long getDispatchedAt() {
        return dispatchedAt;
    }

    public void setDispatchedAt(Long dispatchedAt) {
        this.dispatchedAt = dispatchedAt;
    }

    public Long getEmbeddingCompletedAt() {
        return embeddingCompletedAt;
    }

    public void setEmbeddingCompletedAt(Long embeddingCompletedAt) {
        this.embeddingCompletedAt = embeddingCompletedAt;
    }

    public Long getDbSearchStartedAt() {
        return dbSearchStartedAt;
    }

    public void setDbSearchStartedAt(Long dbSearchStartedAt) {
        this.dbSearchStartedAt = dbSearchStartedAt;
    }

    public Long getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Long completedAt) {
        this.completedAt = completedAt;
    }

    public Long getTotalTimeMs() {
        return totalTimeMs;
    }

    public void setTotalTimeMs(Long totalTimeMs) {
        this.totalTimeMs = totalTimeMs;
    }

    public Long getEmbeddingTimeMs() {
        return embeddingTimeMs;
    }

    public void setEmbeddingTimeMs(Long embeddingTimeMs) {
        this.embeddingTimeMs = embeddingTimeMs;
    }

    public Long getDbSearchTimeMs() {
        return dbSearchTimeMs;
    }

    public void setDbSearchTimeMs(Long dbSearchTimeMs) {
        this.dbSearchTimeMs = dbSearchTimeMs;
    }

    public Long getQueueTimeMs() {
        return queueTimeMs;
    }

    public void setQueueTimeMs(Long queueTimeMs) {
        this.queueTimeMs = queueTimeMs;
    }
}
