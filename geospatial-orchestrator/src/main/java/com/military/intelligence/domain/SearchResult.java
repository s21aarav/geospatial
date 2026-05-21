package com.military.intelligence.domain;

public class SearchResult {
    private String filename;
    private double latitude;
    private double longitude;
    private double similarityScore;
    private String terrainClass;
    private float ndvi;
    private float ndwi;
    private float brightness;

    public SearchResult(String filename, double latitude, double longitude, double similarityScore, 
                        String terrainClass, float ndvi, float ndwi, float brightness) {
        this.filename = filename;
        this.latitude = latitude;
        this.longitude = longitude;
        this.similarityScore = similarityScore;
        this.terrainClass = terrainClass;
        this.ndvi = ndvi;
        this.ndwi = ndwi;
        this.brightness = brightness;
    }

    public String getFilename() { return filename; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public double getSimilarityScore() { return similarityScore; }
    public String getTerrainClass() { return terrainClass; }
    public float getNdvi() { return ndvi; }
    public float getNdwi() { return ndwi; }
    public float getBrightness() { return brightness; }
}
