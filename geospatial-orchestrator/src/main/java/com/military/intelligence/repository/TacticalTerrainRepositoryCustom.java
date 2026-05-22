package com.military.intelligence.repository;

import java.util.List;

public interface TacticalTerrainRepositoryCustom {
    List<Object[]> findNearestNeighborsNative(
            String vectorString, 
            int topK,
            double threshold,
            String terrainClass,
            String searchMode,
            double queryNdvi,
            double queryNdwi,
            double queryBrightness,
            double vitWeight,
            double ndviWeight,
            double ndwiWeight,
            double brightnessWeight,
            Double minLat,
            Double maxLat,
            Double minLon,
            Double maxLon);
}
