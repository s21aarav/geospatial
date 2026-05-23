import React, { useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import ExecutionPipeline from './ExecutionPipeline';
import MapResults from './MapResults';

const API_BASE = 'http://localhost:8080/api/v1/intelligence';

export default function JobRunner({ job, isActive, updateJob }) {
  const uploadInitiated = useRef(false);

  // 1. Handle Upload if status is UPLOADING
  useEffect(() => {
    if (job.status === 'UPLOADING' && job.file && !uploadInitiated.current) {
      uploadInitiated.current = true;
      let isMounted = true;
      const doUpload = async () => {
        updateJob(job.id, { events: [{status: 'UPLOADING', name: 'Secure Transfer', desc: 'Transferring raw payload to ingestion node'}] });
        
        const formData = new FormData();
        formData.append('file', job.file);
        if (job.taskId) {
            formData.append('taskId', job.taskId);
        }
        formData.append('topK', job.params.topK);
        formData.append('threshold', job.params.threshold);
        formData.append('searchMode', job.params.searchMode);
        formData.append('vitWeight', job.params.vitWeight);
        formData.append('ndviWeight', job.params.ndviWeight);
        formData.append('ndwiWeight', job.params.ndwiWeight);
        formData.append('brightnessWeight', job.params.brightnessWeight);
        if (job.params.terrainClass) {
            formData.append('terrainClass', job.params.terrainClass);
        }
        if (job.params.bounds) {
            formData.append('minLat', job.params.bounds[0]);
            formData.append('maxLat', job.params.bounds[1]);
            formData.append('minLon', job.params.bounds[2]);
            formData.append('maxLon', job.params.bounds[3]);
        }

        try {
          const response = await axios.post(`${API_BASE}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (response.status === 202 && isMounted) {
            // Already has taskId pre-generated and stored in job state
          }
        } catch (err) {
          if (isMounted) {
            updateJob(job.id, { 
              status: 'ERROR', 
              visualStatus: 'ERROR',
              errorMsg: typeof err.response?.data === 'string' ? err.response.data : (err.response?.data?.error || err.response?.data?.message || err.message || "Upload failed")
            });
          }
        }
      };
      doUpload();
      return () => { isMounted = false; };
    }
  }, [job.status, job.file, job.id]); // Intentionally omitting job.params to prevent re-uploads

  const handleVisualCompletion = useCallback(() => {
    if (job.visualStatus !== 'COMPLETED') {
        updateJob(job.id, { visualStatus: 'COMPLETED' });
    }
  }, [job.id, job.visualStatus, updateJob]);

  return (
    <div className={`w-full flex flex-col items-center ${isActive ? '' : 'hidden'}`}>
      {job.status === 'ERROR' && (
        <div className="glass-panel border-tactical-danger/50 max-w-2xl w-full p-4 text-center mt-4 rounded">
          <h3 className="text-tactical-danger font-mono font-bold">SYSTEM FAILURE</h3>
          <p className="text-tactical-danger/80 font-mono text-sm">{job.errorMsg}</p>
        </div>
      )}

      {job.status !== 'IDLE' && job.status !== 'ERROR' && (
        <div className="w-full float-2">
          <ExecutionPipeline 
              events={job.events} 
              currentStatus={job.status} 
              errorMsg={job.errorMsg}
              startTime={job.startTime}
              endTime={job.endTime}
              onVisualCompletion={handleVisualCompletion} 
          />
        </div>
      )}
      
      {job.visualStatus === 'COMPLETED' && job.status === 'COMPLETED' && isActive && (
        <div className="w-full flex flex-col items-center animate-fade-in mt-4 float-3">
          <MapResults 
              results={job.results} 
              queryStats={job.queryStats} 
              isActive={isActive} 
              taskId={job.taskId}
          />
        </div>
      )}
    </div>
  );
}
