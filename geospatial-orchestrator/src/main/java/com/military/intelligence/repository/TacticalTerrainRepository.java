package com.military.intelligence.repository;

import com.military.intelligence.domain.SearchResult;
import com.military.intelligence.domain.TacticalTerrain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TacticalTerrainRepository extends JpaRepository<TacticalTerrain, UUID> {

    @Query(value = """
            SELECT * FROM (
                SELECT t.filename, t.latitude, t.longitude, 
                       (1 - (t.embedding <=> CAST(:vectorString AS vector))) as vitScore,
                       t.terrain_class, t.ndvi, t.ndwi, t.brightness,
                       (1 - LEAST(ABS(CAST(:queryNdvi AS FLOAT) - t.ndvi) / 2.0, 1.0)) as ndviScore,
                       (1 - LEAST(ABS(CAST(:queryNdwi AS FLOAT) - t.ndwi) / 2.0, 1.0)) as ndwiScore,
                       (1 - LEAST(ABS(CAST(:queryBrightness AS FLOAT) - t.brightness) / 10000.0, 1.0)) as brightnessScore,
                       LEAST(GREATEST(CASE 
                          WHEN CAST(:searchMode AS VARCHAR) = 'VIT_ONLY' THEN (1 - (t.embedding <=> CAST(:vectorString AS vector)))
                          WHEN CAST(:searchMode AS VARCHAR) = 'SPECTRAL_ONLY' THEN 
                             (CAST(:ndviWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryNdvi AS FLOAT) - t.ndvi) / 2.0, 1.0)) + 
                              CAST(:ndwiWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryNdwi AS FLOAT) - t.ndwi) / 2.0, 1.0)) + 
                              CAST(:brightnessWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryBrightness AS FLOAT) - t.brightness) / 10000.0, 1.0))) / 
                             COALESCE(NULLIF((CAST(:ndviWeight AS FLOAT) + CAST(:ndwiWeight AS FLOAT) + CAST(:brightnessWeight AS FLOAT)), 0.0), 1.0)
                          ELSE
                             (CAST(:vitWeight AS FLOAT) * (1 - (t.embedding <=> CAST(:vectorString AS vector))) +
                              CAST(:ndviWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryNdvi AS FLOAT) - t.ndvi) / 2.0, 1.0)) + 
                              CAST(:ndwiWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryNdwi AS FLOAT) - t.ndwi) / 2.0, 1.0)) + 
                              CAST(:brightnessWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryBrightness AS FLOAT) - t.brightness) / 10000.0, 1.0)))
                       END, 0.0), 1.0) as final_score
                FROM tactical_terrain t
                WHERE (CAST(:terrainClass AS VARCHAR) IS NULL OR t.terrain_class = CAST(:terrainClass AS VARCHAR))
                  AND (CAST(:minLat AS FLOAT) IS NULL OR t.latitude >= CAST(:minLat AS FLOAT))
                  AND (CAST(:maxLat AS FLOAT) IS NULL OR t.latitude <= CAST(:maxLat AS FLOAT))
                  AND (CAST(:minLon AS FLOAT) IS NULL OR t.longitude >= CAST(:minLon AS FLOAT))
                  AND (CAST(:maxLon AS FLOAT) IS NULL OR t.longitude <= CAST(:maxLon AS FLOAT))
            ) sub
            WHERE final_score >= :threshold
            ORDER BY final_score DESC
            LIMIT :topK
            """, nativeQuery = true)
    List<Object[]> findNearestNeighborsNative(
            @Param("vectorString") String vectorString, 
            @Param("topK") int topK,
            @Param("threshold") double threshold,
            @Param("terrainClass") String terrainClass,
            @Param("searchMode") String searchMode,
            @Param("queryNdvi") double queryNdvi,
            @Param("queryNdwi") double queryNdwi,
            @Param("queryBrightness") double queryBrightness,
            @Param("vitWeight") double vitWeight,
            @Param("ndviWeight") double ndviWeight,
            @Param("ndwiWeight") double ndwiWeight,
            @Param("brightnessWeight") double brightnessWeight,
            @Param("minLat") Double minLat,
            @Param("maxLat") Double maxLat,
            @Param("minLon") Double minLon,
            @Param("maxLon") Double maxLon);
}
