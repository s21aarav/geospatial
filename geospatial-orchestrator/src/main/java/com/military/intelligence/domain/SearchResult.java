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
    private double vitScore;
    private double ndviScore;
    private double ndwiScore;
    private double brightnessScore;
    private double hybridScore;
    private String explanation;

    public SearchResult(String filename, double latitude, double longitude, double similarityScore, 
                        String terrainClass, float ndvi, float ndwi, float brightness,
                        double vitScore, double ndviScore, double ndwiScore, double brightnessScore,
                        double hybridScore, String explanation) {
        this.filename = filename;
        this.latitude = latitude;
        this.longitude = longitude;
        this.similarityScore = similarityScore;
        this.terrainClass = terrainClass;
        this.ndvi = ndvi;
        this.ndwi = ndwi;
        this.brightness = brightness;
        this.vitScore = vitScore;
        this.ndviScore = ndviScore;
        this.ndwiScore = ndwiScore;
        this.brightnessScore = brightnessScore;
        this.hybridScore = hybridScore;
        this.explanation = explanation;
    }

    public String getFilename() { return filename; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public double getSimilarityScore() { return similarityScore; }
    public String getTerrainClass() { return terrainClass; }
    public float getNdvi() { return ndvi; }
    public float getNdwi() { return ndwi; }
    public float getBrightness() { return brightness; }
    public double getVitScore() { return vitScore; }
    public double getNdviScore() { return ndviScore; }
    public double getNdwiScore() { return ndwiScore; }
    public double getBrightnessScore() { return brightnessScore; }
    public double getHybridScore() { return hybridScore; }
    public String getExplanation() { return explanation; }
}
