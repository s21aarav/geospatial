package com.military.intelligence.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "evaluation_results")
public class EvaluationResult {

    @Id
    private UUID id;
    
    private UUID runId;
    private String queryFilename;
    private String queryClass;
    private String predictedClass;
    private Boolean isCorrectTop1;
    private Float latencyMs;

    public EvaluationResult() {
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getRunId() { return runId; }
    public void setRunId(UUID runId) { this.runId = runId; }

    public String getQueryFilename() { return queryFilename; }
    public void setQueryFilename(String queryFilename) { this.queryFilename = queryFilename; }

    public String getQueryClass() { return queryClass; }
    public void setQueryClass(String queryClass) { this.queryClass = queryClass; }

    public String getPredictedClass() { return predictedClass; }
    public void setPredictedClass(String predictedClass) { this.predictedClass = predictedClass; }

    public Boolean getIsCorrectTop1() { return isCorrectTop1; }
    public void setIsCorrectTop1(Boolean isCorrectTop1) { this.isCorrectTop1 = isCorrectTop1; }

    public Float getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Float latencyMs) { this.latencyMs = latencyMs; }
}
