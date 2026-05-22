package com.military.intelligence.repository;

import com.military.intelligence.domain.TacticalTerrain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TacticalTerrainRepository extends JpaRepository<TacticalTerrain, UUID>, TacticalTerrainRepositoryCustom {
}

