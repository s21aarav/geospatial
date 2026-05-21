package com.military.intelligence.controller;

import com.military.intelligence.domain.EvaluationRun;
import com.military.intelligence.domain.EvaluationResult;
import com.military.intelligence.repository.EvaluationRunRepository;
import com.military.intelligence.repository.EvaluationResultRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.sql.Timestamp;

@RestController
@RequestMapping("/api/v1/intelligence/evaluations")
@CrossOrigin(origins = "*")
public class EvaluationController {

    private final EvaluationRunRepository runRepository;
    private final EvaluationResultRepository resultRepository;

    public EvaluationController(EvaluationRunRepository runRepository, EvaluationResultRepository resultRepository) {
        this.runRepository = runRepository;
        this.resultRepository = resultRepository;
    }

    @PostMapping("/run")
    public ResponseEntity<?> saveRun(@RequestBody EvaluationRun run) {
        try {
            run.setId(UUID.randomUUID());
            run.setRunDate(new Timestamp(System.currentTimeMillis()));
            EvaluationRun saved = runRepository.save(run);
            return ResponseEntity.ok(Map.of("runId", saved.getId()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to save run: " + e.getMessage());
        }
    }

    @PostMapping("/results")
    public ResponseEntity<?> saveResults(@RequestBody List<EvaluationResult> results) {
        try {
            for (EvaluationResult res : results) {
                if (res.getId() == null) {
                    res.setId(UUID.randomUUID());
                }
            }
            resultRepository.saveAll(results);
            return ResponseEntity.ok(Map.of("status", "success", "count", results.size()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to save results: " + e.getMessage());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory() {
        try {
            List<EvaluationRun> history = runRepository.findAll(Sort.by(Sort.Direction.DESC, "runDate"));
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to fetch history: " + e.getMessage());
        }
    }
}
