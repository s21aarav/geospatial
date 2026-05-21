import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dropzone from './components/Dropzone';
import ExecutionPipeline from './components/ExecutionPipeline';
import MapResults from './components/MapResults';
import EvaluationDashboard from './components/EvaluationDashboard';

const API_BASE = 'http://localhost:8080/api/v1/intelligence';

function App() {
  const [view, setView] = useState('SEARCH'); // SEARCH, EVALUATION
  const [status, setStatus] = useState('IDLE'); // IDLE, UPLOADING, QUEUED, PROCESSING, COMPLETED, ERROR
  const [taskId, setTaskId] = useState(null);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [events, setEvents] = useState([]);
  
  // Advanced search controls
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.0);
  const [terrainClass, setTerrainClass] = useState("");
  const [queryStats, setQueryStats] = useState(null);

  const handleUpload = async (file) => {
    setStatus('UPLOADING');
    setTaskId(null);
    setResults([]);
    setErrorMsg(null);
    setQueryStats(null);
    setEvents([{status: 'UPLOADING', name: 'Secure Transfer', desc: 'Transferring raw payload to ingestion node'}]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('topK', topK);
    formData.append('threshold', threshold);
    if (terrainClass) {
        formData.append('terrainClass', terrainClass);
    }

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 202) {
        setTaskId(response.data.task_id);
      }
    } catch (err) {
      setStatus('ERROR');
      setErrorMsg(err.response?.data || err.message);
    }
  };

  useEffect(() => {
    if (!taskId) return;

    let eventSource = new EventSource(`${API_BASE}/stream/${taskId}`);

    eventSource.addEventListener('status', (e) => {
      try {
        const payload = JSON.parse(e.data);
        console.log("SSE Update:", payload);
        
        setStatus(payload.status);
        
        if (payload.status !== 'QUEUED' && payload.status !== 'PROCESSING') {
           setEvents(prev => [...prev, payload]);
        }
        
        if (payload.status === 'COMPLETED') {
          setResults(payload.results);
          if (payload.queryStats) {
              setQueryStats(payload.queryStats);
          }
          eventSource.close();
        } else if (payload.status === 'FAILED' || payload.status === 'ERROR') {
          setStatus('ERROR');
          setErrorMsg(payload.error || 'Unknown error occurred in processing pipeline.');
          eventSource.close();
        }
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    });

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error", err);
      setStatus('ERROR');
      setErrorMsg("Real-time telemetry stream lost connection to orchestrator.");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [taskId]);

  return (
    <div className="min-h-screen p-8 flex flex-col items-center">
      <header className="mb-12 text-center relative w-full flex justify-between items-center max-w-6xl mx-auto">
        <h1 className="text-2xl font-mono tracking-[0.3em] text-tactical-text uppercase">
          Palantir <span className="text-tactical-muted opacity-50">|</span> Geospatial Search
        </h1>
        <button 
          onClick={() => setView(view === 'SEARCH' ? 'EVALUATION' : 'SEARCH')}
          className="font-mono text-tactical-accent text-sm hover:text-tactical-text transition-colors border border-tactical-accent/30 px-4 py-2"
        >
          {view === 'SEARCH' ? 'OPEN EVALUATION DASHBOARD' : 'OPEN SEARCH INTERFACE'}
        </button>
      </header>

      <main className="w-full flex-grow flex flex-col items-center justify-start gap-8 relative z-10">
        
        {view === 'EVALUATION' ? (
          <EvaluationDashboard onBack={() => setView('SEARCH')} />
        ) : (
          <>
            {(status === 'IDLE' || status === 'ERROR') && (
              <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 w-full">
                    <Dropzone onUpload={handleUpload} />
                </div>
            
            <div className="glass-panel p-6 w-full md:w-80 border-tactical-muted/30 shrink-0">
                <h2 className="text-tactical-accent font-mono text-sm tracking-widest mb-4">SEARCH PARAMETERS</h2>
                
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-tactical-text font-mono text-xs mb-2">TOP-K MATCHES: {topK}</label>
                        <input 
                            type="range" min="1" max="20" value={topK} 
                            onChange={(e) => setTopK(e.target.value)}
                            className="w-full accent-tactical-accent"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-tactical-text font-mono text-xs mb-2">SIMILARITY THRESHOLD: {threshold.toFixed(2)}</label>
                        <input 
                            type="range" min="0" max="1" step="0.05" value={threshold} 
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            className="w-full accent-tactical-accent"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-tactical-text font-mono text-xs mb-2">TERRAIN FILTER</label>
                        <select 
                            value={terrainClass} 
                            onChange={(e) => setTerrainClass(e.target.value)}
                            className="w-full bg-tactical-bg border border-tactical-muted/30 text-tactical-text font-mono text-xs p-2 focus:outline-none focus:border-tactical-accent"
                        >
                            <option value="">ALL TERRAINS</option>
                            <option value="AnnualCrop">Annual Crop</option>
                            <option value="Forest">Forest</option>
                            <option value="HerbaceousVegetation">Herbaceous Vegetation</option>
                            <option value="Highway">Highway</option>
                            <option value="Industrial">Industrial</option>
                            <option value="Pasture">Pasture</option>
                            <option value="PermanentCrop">Permanent Crop</option>
                            <option value="Residential">Residential</option>
                            <option value="River">River</option>
                            <option value="SeaLake">Sea / Lake</option>
                        </select>
                    </div>
                </div>
            </div>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="glass-panel border-tactical-danger/50 max-w-2xl w-full p-4 text-center mt-4 rounded">
            <h3 className="text-tactical-danger font-mono font-bold">SYSTEM FAILURE</h3>
            <p className="text-tactical-danger/80 font-mono text-sm">{errorMsg}</p>
          </div>
        )}

        {status !== 'IDLE' && status !== 'ERROR' && (
          <ExecutionPipeline events={events} currentStatus={status} />
        )}

        {status === 'COMPLETED' && (
          <div className="w-full flex flex-col items-center animate-fade-in mt-8">
            <div className="w-full border-t border-tactical-muted/20 my-8"></div>
            <MapResults results={results} queryStats={queryStats} />
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}

export default App;
