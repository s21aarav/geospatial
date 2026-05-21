package com.military.intelligence.domain;

import java.util.List;

public class StatePayload {
    private TaskStatus status;
    private List<SearchResult> results;
    private String error;
    private java.util.Map<String, Object> queryStats;
    private java.util.Map<String, Object> searchFilters;

    public StatePayload() {}

    public StatePayload(TaskStatus status, List<SearchResult> results, String error, java.util.Map<String, Object> queryStats, java.util.Map<String, Object> searchFilters) {
        this.status = status;
        this.results = results;
        this.error = error;
        this.queryStats = queryStats;
        this.searchFilters = searchFilters;
    }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public List<SearchResult> getResults() { return results; }
    public void setResults(List<SearchResult> results) { this.results = results; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    
    public java.util.Map<String, Object> getQueryStats() { return queryStats; }
    public void setQueryStats(java.util.Map<String, Object> queryStats) { this.queryStats = queryStats; }
    
    public java.util.Map<String, Object> getSearchFilters() { return searchFilters; }
    public void setSearchFilters(java.util.Map<String, Object> searchFilters) { this.searchFilters = searchFilters; }
}
