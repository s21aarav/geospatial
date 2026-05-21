package com.military.intelligence.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "tactical_terrain")
public class TacticalTerrain {

    @Id
    private UUID id;

    private String filename;
    private double latitude;
    private double longitude;
    private String terrainClass;
    private float ndvi;
    private float ndwi;
    private float brightness;

    // We don't map the vector directly to JPA because we will use native queries for similarity search.
    // This keeps the entity lightweight and avoids complex custom Hibernate types for pgvector.

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    
    public String getTerrainClass() { return terrainClass; }
    public void setTerrainClass(String terrainClass) { this.terrainClass = terrainClass; }
    
    public float getNdvi() { return ndvi; }
    public void setNdvi(float ndvi) { this.ndvi = ndvi; }
    
    public float getNdwi() { return ndwi; }
    public void setNdwi(float ndwi) { this.ndwi = ndwi; }
    
    public float getBrightness() { return brightness; }
    public void setBrightness(float brightness) { this.brightness = brightness; }
}
