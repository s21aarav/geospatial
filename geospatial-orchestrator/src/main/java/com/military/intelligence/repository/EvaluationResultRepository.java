package com.military.intelligence.repository;

import com.military.intelligence.domain.EvaluationResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EvaluationResultRepository extends JpaRepository<EvaluationResult, UUID> {
    List<EvaluationResult> findByRunId(UUID runId);
}
