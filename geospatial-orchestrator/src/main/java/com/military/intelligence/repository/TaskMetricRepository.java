package com.military.intelligence.repository;

import com.military.intelligence.domain.TaskMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TaskMetricRepository extends JpaRepository<TaskMetric, UUID> {
}
