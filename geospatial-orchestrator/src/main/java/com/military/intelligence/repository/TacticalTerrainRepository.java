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
            SELECT t.filename, t.latitude, t.longitude, 
                   (1 - (t.embedding <=> CAST(:vectorString AS vector))) as score,
                   t.terrain_class, t.ndvi, t.ndwi, t.brightness
            FROM tactical_terrain t
            WHERE (CAST(:terrainClass AS VARCHAR) IS NULL OR t.terrain_class = CAST(:terrainClass AS VARCHAR))
              AND (1 - (t.embedding <=> CAST(:vectorString AS vector))) >= :threshold
            ORDER BY t.embedding <=> CAST(:vectorString AS vector)
            LIMIT :topK
            """, nativeQuery = true)
    List<Object[]> findNearestNeighborsNative(
            @Param("vectorString") String vectorString, 
            @Param("topK") int topK,
            @Param("threshold") double threshold,
            @Param("terrainClass") String terrainClass);
}
