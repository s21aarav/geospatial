import React, { useState, useEffect, useCallback } from 'react';
import Dropzone from './components/Dropzone';
import EvaluationDashboard from './components/EvaluationDashboard';
import JobSidebar from './components/JobSidebar';
import JobRunner from './components/JobRunner';

function App() {
  const [view, setView] = useState('SEARCH'); // SEARCH, EVALUATION
  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  
  // Theme state
  const [theme, setTheme] = useState('dark'); // 'dark', 'light', 'system'
  
  // Advanced search controls
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.0);
  const [terrainClass, setTerrainClass] = useState("");
  const [queryStats, setQueryStats] = useState(null);
  
  // Hybrid Engine parameters
  const [searchMode, setSearchMode] = useState('HYBRID'); // VIT_ONLY, SPECTRAL_ONLY, HYBRID
  const [vitWeight, setVitWeight] = useState(0.70);
  const [ndviWeight, setNdviWeight] = useState(0.15);
  const [ndwiWeight, setNdwiWeight] = useState(0.10);
  const [brightnessWeight, setBrightnessWeight] = useState(0.05);

  const handleUpload = (file) => {
    const newJobId = Math.random().toString(36).substring(2, 15);
    const newJob = {
      id: newJobId,
      filename: file.name,
      file: file,
      params: { topK, threshold, searchMode, vitWeight, ndviWeight, ndwiWeight, brightnessWeight, terrainClass },
      status: 'UPLOADING',
      visualStatus: 'UPLOADING',
      taskId: null,
      events: [],
      results: [],
      queryStats: null,
      errorMsg: null
    };
    
    setJobs(prev => [newJob, ...prev]);
    setActiveJobId(newJobId);
  };

  const updateJob = useCallback((jobId, updatesOrCallback) => {
    setJobs(prevJobs => prevJobs.map(j => {
      if (j.id === jobId) {
        const updates = typeof updatesOrCallback === 'function' ? updatesOrCallback(j) : updatesOrCallback;
        return { ...j, ...updates };
      }
      return j;
    }));
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };
    applyTheme();
  }, [theme]);

  return (
    <div className="min-h-screen p-8 flex flex-col items-center">
      <header className="mb-12 text-center relative w-full flex justify-between items-center max-w-6xl mx-auto">
        <h1 className="text-2xl font-mono tracking-[0.3em] text-tactical-text uppercase">
          Palantir <span className="text-tactical-muted opacity-50">|</span> Geospatial Search
        </h1>
        <div className="flex gap-4 items-center">
            <select 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="bg-tactical-bg text-tactical-text border border-tactical-muted/30 font-mono text-[10px] p-1.5 focus:outline-none focus:border-tactical-accent"
            >
                <option value="dark">DARK MODE</option>
                <option value="light">LIGHT MODE</option>
                <option value="system">SYSTEM THEME</option>
            </select>
            <button 
              onClick={() => setView(view === 'SEARCH' ? 'EVALUATION' : 'SEARCH')}
              className="font-mono text-tactical-accent text-sm hover:text-tactical-text transition-colors border border-tactical-accent/30 px-4 py-2"
            >
              {view === 'SEARCH' ? 'OPEN EVALUATION DASHBOARD' : 'OPEN SEARCH INTERFACE'}
            </button>
        </div>
      </header>

      <main className="w-full flex-grow flex flex-col items-center justify-start gap-8 relative z-10">
        
        {view === 'EVALUATION' ? (
          <EvaluationDashboard onBack={() => setView('SEARCH')} />
        ) : (
          <div className="w-full flex flex-col md:flex-row gap-8 items-start">
            {/* Left: Job Sidebar */}
            {jobs.length > 0 && (
              <JobSidebar 
                 jobs={jobs} 
                 activeJobId={activeJobId} 
                 setActiveJobId={setActiveJobId} 
              />
            )}

            {/* Center: Active Job View */}
            <div className="flex-1 w-full min-h-[500px] flex flex-col items-center">
               
               {/* NEW UPLOAD VIEW */}
               <div className={`w-full flex flex-col lg:flex-row gap-8 items-start ${activeJobId === null ? '' : 'hidden'}`}>
                  <div className="flex-1 w-full mt-4 lg:mt-8">
                      <Dropzone onUpload={handleUpload} />
                  </div>
                  <div className="glass-panel p-6 w-full lg:w-80 border-tactical-muted/30 shrink-0 mt-4 lg:mt-8">
                      <h2 className="text-tactical-accent font-mono text-sm tracking-widest mb-4">GLOBAL PARAMETERS</h2>
                      <p className="text-tactical-muted text-[10px] font-mono mb-6 leading-tight">Applied to new uploads.</p>
                
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

                    <div>
                        <label className="block text-tactical-text font-mono text-xs mb-2">RETRIEVAL MODE</label>
                        <select 
                            value={searchMode} 
                            onChange={(e) => setSearchMode(e.target.value)}
                            className="w-full bg-tactical-bg border border-tactical-muted/30 text-tactical-text font-mono text-xs p-2 focus:outline-none focus:border-tactical-accent"
                        >
                            <option value="HYBRID">HYBRID (SEMANTIC + SPECTRAL)</option>
                            <option value="VIT_ONLY">VIT_ONLY (SEMANTIC ONLY)</option>
                            <option value="SPECTRAL_ONLY">SPECTRAL_ONLY (PHYSICS ONLY)</option>
                        </select>
                    </div>

                    {searchMode === 'HYBRID' && (
                        <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-tactical-muted/30">
                            <h3 className="text-tactical-accent font-mono text-xs tracking-widest mb-1 flex justify-between">
                                <span>HYBRID WEIGHTS</span>
                                <span>SUM: {(vitWeight + ndviWeight + ndwiWeight + brightnessWeight).toFixed(2)}</span>
                            </h3>
                            {Math.abs((vitWeight + ndviWeight + ndwiWeight + brightnessWeight) - 1.0) > 0.01 && (
                                <div className="text-[10px] text-tactical-danger font-mono bg-tactical-danger/10 p-1 border border-tactical-danger/20 mb-2">
                                    WARNING: Weights do not sum to 1.0. Backend will auto-normalize.
                                </div>
                            )}
                            <div>
                                <label className="flex justify-between text-tactical-text font-mono text-xs mb-1">
                                    <span>VIT WEIGHT</span> <span>{vitWeight.toFixed(2)}</span>
                                </label>
                                <input type="range" min="0" max="1" step="0.05" value={vitWeight} onChange={(e) => setVitWeight(parseFloat(e.target.value))} className="w-full accent-tactical-accent h-1" />
                            </div>
                            <div>
                                <label className="flex justify-between text-tactical-text font-mono text-xs mb-1">
                                    <span>NDVI WEIGHT</span> <span>{ndviWeight.toFixed(2)}</span>
                                </label>
                                <input type="range" min="0" max="1" step="0.05" value={ndviWeight} onChange={(e) => setNdviWeight(parseFloat(e.target.value))} className="w-full accent-tactical-accent h-1" />
                            </div>
                            <div>
                                <label className="flex justify-between text-tactical-text font-mono text-xs mb-1">
                                    <span>NDWI WEIGHT</span> <span>{ndwiWeight.toFixed(2)}</span>
                                </label>
                                <input type="range" min="0" max="1" step="0.05" value={ndwiWeight} onChange={(e) => setNdwiWeight(parseFloat(e.target.value))} className="w-full accent-tactical-accent h-1" />
                            </div>
                            <div>
                                <label className="flex justify-between text-tactical-text font-mono text-xs mb-1">
                                    <span>BRIGHTNESS</span> <span>{brightnessWeight.toFixed(2)}</span>
                                </label>
                                <input type="range" min="0" max="1" step="0.05" value={brightnessWeight} onChange={(e) => setBrightnessWeight(parseFloat(e.target.value))} className="w-full accent-tactical-accent h-1" />
                            </div>
                        </div>
                    )}
                </div>
              </div>
            </div>

            {/* JOB VIEWS */}
            {jobs.map(job => (
               <JobRunner 
                  key={job.id} 
                  job={job} 
                  isActive={job.id === activeJobId} 
                  updateJob={updateJob} 
               />
            ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
