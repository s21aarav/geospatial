package com.military.intelligence.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class TacticalTerrainRepositoryCustomImpl implements TacticalTerrainRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @SuppressWarnings("unchecked")
    public List<Object[]> findNearestNeighborsNative(
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
            Double maxLon) {

        StringBuilder sql = new StringBuilder();
        boolean isSpectralOnly = "SPECTRAL_ONLY".equals(searchMode);

        sql.append("WITH filtered_candidates AS (\n");
        if (isSpectralOnly) {
            sql.append("    SELECT t.filename, t.latitude, t.longitude, t.terrain_class, t.ndvi, t.ndwi, t.brightness, t.target_polygon, 0.0 as vitScore\n");
            sql.append("    FROM tactical_terrain t\n");
            sql.append("    WHERE 1=1\n");
            if (terrainClass != null) {
                sql.append("      AND t.terrain_class = :terrainClass\n");
            }
            if (minLat != null) sql.append("      AND t.latitude >= :minLat\n");
            if (maxLat != null) sql.append("      AND t.latitude <= :maxLat\n");
            if (minLon != null) sql.append("      AND t.longitude >= :minLon\n");
            if (maxLon != null) sql.append("      AND t.longitude <= :maxLon\n");
        } else {
            sql.append("    SELECT t.filename, t.latitude, t.longitude, t.terrain_class, t.ndvi, t.ndwi, t.brightness, t.target_polygon, (1 - (t.embedding <=> CAST(:vectorString AS vector))) as vitScore\n");
            sql.append("    FROM tactical_terrain t\n");
            sql.append("    WHERE 1=1\n");
            if (terrainClass != null) {
                sql.append("      AND t.terrain_class = :terrainClass\n");
            }
            if (minLat != null) sql.append("      AND t.latitude >= :minLat\n");
            if (maxLat != null) sql.append("      AND t.latitude <= :maxLat\n");
            if (minLon != null) sql.append("      AND t.longitude >= :minLon\n");
            if (maxLon != null) sql.append("      AND t.longitude <= :maxLon\n");
            sql.append("    ORDER BY t.embedding <=> CAST(:vectorString AS vector)\n");
            sql.append("    LIMIT 300\n");
        }
        sql.append(")\n");

        sql.append("SELECT * FROM (\n");
        sql.append("    SELECT c.filename, c.latitude, c.longitude, c.vitScore,\n");
        sql.append("           c.terrain_class, c.ndvi, c.ndwi, c.brightness,\n");
        sql.append("           (1 - LEAST(ABS(CAST(:queryNdvi AS FLOAT) - c.ndvi) / 2.0, 1.0)) as ndviScore,\n");
        sql.append("           (1 - LEAST(ABS(CAST(:queryNdwi AS FLOAT) - c.ndwi) / 2.0, 1.0)) as ndwiScore,\n");
        sql.append("           (1 - LEAST(ABS(CAST(:queryBrightness AS FLOAT) - c.brightness) / 10000.0, 1.0)) as brightnessScore,\n");
        sql.append("           LEAST(GREATEST(CASE\n");
        sql.append("              WHEN CAST(:searchMode AS VARCHAR) = 'VIT_ONLY' THEN c.vitScore\n");
        sql.append("              WHEN CAST(:searchMode AS VARCHAR) = 'SPECTRAL_ONLY' THEN\n");
        sql.append("                 (CAST(:ndviWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryNdvi AS FLOAT) - c.ndvi) / 2.0, 1.0)) +\n");
        sql.append("                  CAST(:ndwiWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryNdwi AS FLOAT) - c.ndwi) / 2.0, 1.0)) +\n");
        sql.append("                  CAST(:brightnessWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryBrightness AS FLOAT) - c.brightness) / 10000.0, 1.0))) /\n");
        sql.append("                 COALESCE(NULLIF((CAST(:ndviWeight AS FLOAT) + CAST(:ndwiWeight AS FLOAT) + CAST(:brightnessWeight AS FLOAT)), 0.0), 1.0)\n");
        sql.append("              ELSE\n");
        sql.append("                 (CAST(:vitWeight AS FLOAT) * c.vitScore +\n");
        sql.append("                  CAST(:ndviWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryNdvi AS FLOAT) - c.ndvi) / 2.0, 1.0)) +\n");
        sql.append("                  CAST(:ndwiWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryNdwi AS FLOAT) - c.ndwi) / 2.0, 1.0)) +\n");
        sql.append("                  CAST(:brightnessWeight AS FLOAT) * (1 - LEAST(ABS(CAST(:queryBrightness AS FLOAT) - c.brightness) / 10000.0, 1.0)))\n");
        sql.append("           END, 0.0), 1.0) as final_score,\n");
        sql.append("           c.target_polygon\n");
        sql.append("    FROM filtered_candidates c\n");
        sql.append(") sub\n");
        sql.append("WHERE final_score >= CAST(:threshold AS FLOAT)\n");
        sql.append("ORDER BY final_score DESC\n");
        sql.append("LIMIT :topK");

        Query query = entityManager.createNativeQuery(sql.toString());

        if (!isSpectralOnly) {
            query.setParameter("vectorString", vectorString);
        }
        if (terrainClass != null) {
            query.setParameter("terrainClass", terrainClass);
        }
        if (minLat != null) query.setParameter("minLat", minLat);
        if (maxLat != null) query.setParameter("maxLat", maxLat);
        if (minLon != null) query.setParameter("minLon", minLon);
        if (maxLon != null) query.setParameter("maxLon", maxLon);

        query.setParameter("queryNdvi", queryNdvi);
        query.setParameter("queryNdwi", queryNdwi);
        query.setParameter("queryBrightness", queryBrightness);
        query.setParameter("searchMode", searchMode);
        query.setParameter("vitWeight", vitWeight);
        query.setParameter("ndviWeight", ndviWeight);
        query.setParameter("ndwiWeight", ndwiWeight);
        query.setParameter("brightnessWeight", brightnessWeight);
        query.setParameter("threshold", threshold);
        query.setParameter("topK", topK);

        return query.getResultList();
    }
}
