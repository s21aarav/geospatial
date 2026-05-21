package com.military.intelligence.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import java.sql.Timestamp;

@Entity
@Table(name = "evaluation_runs")
public class EvaluationRun {

    @Id
    private UUID id;
    
    private Timestamp runDate;
    private String mode;
    private Float top1Accuracy;
    private Float top3Accuracy;
    private Float top5Accuracy;
    private Float mrr;
    private Float averageLatencyMs;

    public EvaluationRun() {
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Timestamp getRunDate() { return runDate; }
    public void setRunDate(Timestamp runDate) { this.runDate = runDate; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public Float getTop1Accuracy() { return top1Accuracy; }
    public void setTop1Accuracy(Float top1Accuracy) { this.top1Accuracy = top1Accuracy; }

    public Float getTop3Accuracy() { return top3Accuracy; }
    public void setTop3Accuracy(Float top3Accuracy) { this.top3Accuracy = top3Accuracy; }

    public Float getTop5Accuracy() { return top5Accuracy; }
    public void setTop5Accuracy(Float top5Accuracy) { this.top5Accuracy = top5Accuracy; }

    public Float getMrr() { return mrr; }
    public void setMrr(Float mrr) { this.mrr = mrr; }

    public Float getAverageLatencyMs() { return averageLatencyMs; }
    public void setAverageLatencyMs(Float averageLatencyMs) { this.averageLatencyMs = averageLatencyMs; }
}
