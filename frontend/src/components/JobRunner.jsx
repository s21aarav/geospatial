import React, { useEffect } from 'react';
import axios from 'axios';
import ExecutionPipeline from './ExecutionPipeline';
import MapResults from './MapResults';

const API_BASE = 'http://localhost:8080/api/v1/intelligence';

export default function JobRunner({ job, isActive, updateJob }) {
  // 1. Handle Upload if no taskId and status is UPLOADING
  useEffect(() => {
    if (job.status === 'UPLOADING' && !job.taskId && job.file) {
      let isMounted = true;
      const doUpload = async () => {
        updateJob(job.id, { events: [{status: 'UPLOADING', name: 'Secure Transfer', desc: 'Transferring raw payload to ingestion node'}] });
        
        const formData = new FormData();
        formData.append('file', job.file);
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
            updateJob(job.id, { taskId: response.data.task_id });
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
  }, [job.status, job.taskId, job.file, job.id]); // Intentionally omitting job.params to prevent re-uploads

  // 2. Handle SSE if taskId exists and not completed
  useEffect(() => {
    if (!job.taskId || job.status === 'COMPLETED' || job.status === 'ERROR') return;

    let eventSource = new EventSource(`${API_BASE}/stream/${job.taskId}`);

    eventSource.addEventListener('status', (e) => {
      try {
        const payload = JSON.parse(e.data);
        console.log(`SSE Update [${job.id}]:`, payload);
        
        updateJob(job.id, (prevJob) => {
            let updates = { status: payload.status };
            
            if (payload.status !== 'QUEUED' && payload.status !== 'PROCESSING') {
               updates.events = [...prevJob.events, payload];
            }
            
            if (payload.status === 'COMPLETED') {
              updates.results = payload.results;
              if (payload.queryStats) {
                  updates.queryStats = payload.queryStats;
              }
            } else if (payload.status === 'FAILED' || payload.status === 'ERROR') {
              updates.status = 'ERROR';
              updates.visualStatus = 'ERROR';
              updates.errorMsg = payload.error || 'Unknown error occurred in processing pipeline.';
            }
            return updates;
        });

        if (payload.status === 'COMPLETED' || payload.status === 'FAILED' || payload.status === 'ERROR') {
            eventSource.close();
        }
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    });

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error", err);
      updateJob(job.id, {
        status: 'ERROR',
        visualStatus: 'ERROR',
        errorMsg: "Real-time telemetry stream lost connection to orchestrator."
      });
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  // We omit job.events and other constantly changing fields to prevent reconnecting SSE
  }, [job.taskId, job.id, updateJob]); // Run once when taskId is available

  return (
    <div className={`w-full flex flex-col items-center ${isActive ? '' : 'hidden'}`}>
      {job.status === 'ERROR' && (
        <div className="glass-panel border-tactical-danger/50 max-w-2xl w-full p-4 text-center mt-4 rounded">
          <h3 className="text-tactical-danger font-mono font-bold">SYSTEM FAILURE</h3>
          <p className="text-tactical-danger/80 font-mono text-sm">{job.errorMsg}</p>
        </div>
      )}

      {job.status !== 'IDLE' && job.status !== 'ERROR' && (
        <ExecutionPipeline 
          events={job.events} 
          currentStatus={job.status} 
          onVisualCompletion={() => {
              if (job.visualStatus !== 'COMPLETED') {
                  updateJob(job.id, { visualStatus: 'COMPLETED' });
              }
          }}
        />
      )}

      {job.visualStatus === 'COMPLETED' && job.status === 'COMPLETED' && (
        <div className="w-full flex flex-col items-center animate-fade-in mt-8">
          <div className="w-full border-t border-tactical-muted/20 my-8 mb-4"></div>
          <MapResults results={job.results} queryStats={job.queryStats} isActive={isActive} />
        </div>
      )}
    </div>
  );
}
