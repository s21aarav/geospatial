import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api/v1/intelligence';

// Use actual GeoTIFF files from the EuroSAT MS dataset for proper multispectral evaluation
const EVALUATION_SAMPLES = [
    { tifFile: 'Forest/Forest_10.tif', trueClass: 'Forest' },
    { tifFile: 'Forest/Forest_50.tif', trueClass: 'Forest' },
    { tifFile: 'Highway/Highway_10.tif', trueClass: 'Highway' },
    { tifFile: 'Highway/Highway_50.tif', trueClass: 'Highway' },
    { tifFile: 'Residential/Residential_10.tif', trueClass: 'Residential' },
    { tifFile: 'Residential/Residential_50.tif', trueClass: 'Residential' },
    { tifFile: 'River/River_10.tif', trueClass: 'River' },
    { tifFile: 'River/River_50.tif', trueClass: 'River' },
    { tifFile: 'SeaLake/SeaLake_10.tif', trueClass: 'SeaLake' },
    { tifFile: 'SeaLake/SeaLake_50.tif', trueClass: 'SeaLake' },
    { tifFile: 'AnnualCrop/AnnualCrop_10.tif', trueClass: 'AnnualCrop' },
    { tifFile: 'Industrial/Industrial_10.tif', trueClass: 'Industrial' },
    { tifFile: 'Pasture/Pasture_10.tif', trueClass: 'Pasture' },
    { tifFile: 'PermanentCrop/PermanentCrop_10.tif', trueClass: 'PermanentCrop' },
    { tifFile: 'HerbaceousVegetation/HerbaceousVegetation_10.tif', trueClass: 'HerbaceousVegetation' },
];

export default function EvaluationDashboard({ onBack }) {
    const [evalStatus, setEvalStatus] = useState('IDLE');
    const [progress, setProgress] = useState(0);
    const [metricsMap, setMetricsMap] = useState({});
    const [confusionMatrix, setConfusionMatrix] = useState({});
    const [logs, setLogs] = useState([]);
    const [history, setHistory] = useState([]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_BASE}/evaluations/history`);
            setHistory(res.data);
        } catch (err) {
            console.error("Failed to fetch evaluation history:", err);
        }
    };

    React.useEffect(() => {
        fetchHistory();
    }, []);

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

    const runEvaluation = async () => {
        setEvalStatus('RUNNING');
        setProgress(0);
        setLogs([]);
        setMetricsMap({});
        setConfusionMatrix({});

        const modes = ['VIT_ONLY', 'SPECTRAL_ONLY', 'HYBRID'];
        const resultsMap = {};
        let localMatrix = {};

        const totalRuns = EVALUATION_SAMPLES.length * modes.length;
        let currentRun = 0;

        for (const mode of modes) {
            addLog(`[MODE] Starting evaluation for ${mode}...`);
            let top1 = 0, top3 = 0, top5 = 0;
            let mrrSum = 0;
            let latencies = [];
            let completed = 0;
            const queryResults = [];

            for (let i = 0; i < EVALUATION_SAMPLES.length; i++) {
                const sample = EVALUATION_SAMPLES[i];
                
                try {
                    const tifRes = await fetch(`${API_BASE}/tif/${sample.tifFile}`);
                    if (!tifRes.ok) {
                        currentRun++; setProgress((currentRun / totalRuns) * 100); continue;
                    }
                    const blob = await tifRes.blob();
                    const tifFileName = sample.tifFile.split('/')[1];
                    const file = new File([blob], tifFileName, { type: 'image/tiff' });

                    const startTime = performance.now();

                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('topK', 5);
                    formData.append('threshold', 0);
                    formData.append('searchMode', mode);
                    formData.append('vitWeight', 0.70);
                    formData.append('ndviWeight', 0.15);
                    formData.append('ndwiWeight', 0.10);
                    formData.append('brightnessWeight', 0.05);

                    const response = await axios.post(`${API_BASE}/upload`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    const taskId = response.data.task_id;

                    const results = await new Promise((resolve, reject) => {
                        const eventSource = new EventSource(`${API_BASE}/stream/${taskId}`);
                        const timeout = setTimeout(() => { eventSource.close(); reject("Timeout"); }, 60000);
                        eventSource.addEventListener('status', (e) => {
                            try {
                                const payload = JSON.parse(e.data);
                                if (payload.status === 'COMPLETED') { clearTimeout(timeout); eventSource.close(); resolve(payload.results || []); }
                                else if (payload.status === 'ERROR' || payload.status === 'FAILED') { clearTimeout(timeout); eventSource.close(); reject(payload.error); }
                            } catch (err) {}
                        });
                        eventSource.onerror = () => { clearTimeout(timeout); eventSource.close(); reject("SSE error"); };
                    });

                    const latency = performance.now() - startTime;
                    latencies.push(latency);

                    if (results.length > 0) {
                        const returnedClasses = results.map(r => r.terrainClass);
                        const predicted = returnedClasses[0];
                        
                        if (predicted === sample.trueClass) top1++;
                        if (returnedClasses.slice(0, 3).includes(sample.trueClass)) top3++;
                        if (returnedClasses.slice(0, 5).includes(sample.trueClass)) top5++;

                        const rank = returnedClasses.indexOf(sample.trueClass);
                        if (rank !== -1) mrrSum += (1.0 / (rank + 1));
                        
                        // Populate confusion matrix for HYBRID
                        if (mode === 'HYBRID') {
                            if (!localMatrix[sample.trueClass]) localMatrix[sample.trueClass] = {};
                            localMatrix[sample.trueClass][predicted] = (localMatrix[sample.trueClass][predicted] || 0) + 1;
                        }
                        
                        queryResults.push({
                            queryFilename: tifFileName,
                            queryClass: sample.trueClass,
                            predictedClass: predicted,
                            isCorrectTop1: predicted === sample.trueClass,
                            latencyMs: latency
                        });

                        completed++;
                        addLog(`[OK] [${mode}] ${tifFileName} → ${predicted} (${latency.toFixed(0)}ms)`);
                    }

                } catch (err) {
                    addLog(`[ERROR] [${mode}] ${sample.tifFile}: ${err}`);
                }

                currentRun++;
                setProgress((currentRun / totalRuns) * 100);
            }

            const total = EVALUATION_SAMPLES.length;
            const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
            const top1Acc = total > 0 ? (top1 / total) * 100 : 0;
            const top3Acc = total > 0 ? (top3 / total) * 100 : 0;
            const top5Acc = total > 0 ? (top5 / total) * 100 : 0;
            const mrr = total > 0 ? mrrSum / total : 0;
            
            resultsMap[mode] = {
                top1: top1Acc,
                top3: top3Acc,
                top5: top5Acc,
                mrr: mrr,
                latency: avgLatency
            };
            
            // Persist to backend
            try {
                const runRes = await axios.post(`${API_BASE}/evaluations/run`, {
                    mode: mode,
                    top1Accuracy: top1Acc,
                    top3Accuracy: top3Acc,
                    top5Accuracy: top5Acc,
                    mrr: mrr,
                    averageLatencyMs: avgLatency
                });
                const runId = runRes.data.runId;
                
                queryResults.forEach(qr => qr.runId = runId);
                await axios.post(`${API_BASE}/evaluations/results`, queryResults);
                addLog(`[OK] Saved run ${runId} to database.`);
            } catch (err) {
                addLog(`[WARN] Could not persist evaluation to database.`);
            }
        }

        setMetricsMap(resultsMap);
        setConfusionMatrix(localMatrix);
        setEvalStatus('COMPLETED');
        fetchHistory();
        addLog(`[DONE] Tri-mode benchmark complete.`);
    };

    return (
        <div className="w-full max-w-5xl glass-panel p-8 text-tactical-text font-mono animate-fade-in relative z-10">
            <div className="flex justify-between items-center border-b border-tactical-muted/30 pb-4 mb-6">
                <h2 className="text-xl tracking-widest text-tactical-accent uppercase">Evaluation Dashboard</h2>
                <button onClick={onBack} className="text-tactical-muted hover:text-tactical-text transition-colors">
                    [ RETURN TO SEARCH ]
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <p className="text-sm text-tactical-muted max-w-lg">
                    Runs {EVALUATION_SAMPLES.length} multispectral GeoTIFFs through three retrieval modes (ViT, Spectral, Hybrid) and measures comparative Top-K accuracy, MRR, and E2E latency.
                </p>
                <button
                    onClick={runEvaluation}
                    disabled={evalStatus === 'RUNNING'}
                    className="bg-tactical-accent text-black font-bold tracking-widest px-6 py-2 hover:bg-tactical-text transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                    {evalStatus === 'RUNNING' ? 'EXECUTING...' : 'INITIATE BENCHMARK'}
                </button>
            </div>

            {evalStatus !== 'IDLE' && (
                <div className="space-y-6">
                    <div className="w-full bg-tactical-bg border border-tactical-muted/30 h-4 p-[1px]">
                        <div className="bg-tactical-accent h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-1 bg-black/10 p-4 h-80 overflow-y-auto font-mono text-[10px] space-y-1 rounded-lg shadow-inner">
                            {logs.map((log, i) => (
                                <div key={i} className={
                                    log.includes('ERROR') ? 'text-red-400' :
                                    log.includes('MODE') ? 'text-blue-400 font-bold mt-2' :
                                    log.includes('DONE') ? 'text-tactical-accent font-bold' :
                                    'text-tactical-muted'
                                }>{log}</div>
                            ))}
                        </div>

                        {Object.keys(metricsMap).length > 0 && (
                            <div className="col-span-2 bg-black/10 p-6 flex flex-col overflow-x-auto rounded-lg shadow-inner">
                                <h3 className="text-tactical-accent tracking-widest border-b border-tactical-muted/30 pb-2 mb-4">MODE COMPARISON</h3>
                                <table className="w-full text-left text-xs text-tactical-muted">
                                    <thead>
                                        <tr className="border-b border-tactical-muted/20 text-tactical-text">
                                            <th className="pb-2">MODE</th>
                                            <th className="pb-2">TOP-1</th>
                                            <th className="pb-2">TOP-3</th>
                                            <th className="pb-2">TOP-5</th>
                                            <th className="pb-2">MRR</th>
                                            <th className="pb-2">LATENCY</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['VIT_ONLY', 'SPECTRAL_ONLY', 'HYBRID'].map(mode => {
                                            const m = metricsMap[mode];
                                            if (!m) return null;
                                            
                                            // Determine if this is the best mode for Top-1
                                            const isBest = Object.values(metricsMap).every(other => m.top1 >= other.top1);
                                            
                                            return (
                                                <tr key={mode} className={`border-b border-tactical-muted/10 last:border-0 ${isBest ? 'bg-tactical-accent/10' : ''}`}>
                                                    <td className="py-3 text-tactical-text font-bold">
                                                        {mode} {isBest && <span className="text-tactical-accent ml-2 text-[8px] tracking-widest border border-tactical-accent px-1">BEST</span>}
                                                    </td>
                                                    <td className={`py-3 ${m.top1 > 50 ? 'text-tactical-accent' : ''}`}>{m.top1.toFixed(1)}%</td>
                                                    <td className={`py-3 ${m.top3 > 50 ? 'text-tactical-accent' : ''}`}>{m.top3.toFixed(1)}%</td>
                                                    <td className={`py-3 ${m.top5 > 50 ? 'text-tactical-accent' : ''}`}>{m.top5.toFixed(1)}%</td>
                                                    <td className="py-3 text-tactical-accent">{m.mrr.toFixed(3)}</td>
                                                    <td className="py-3">{(m.latency / 1000).toFixed(2)}s</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {Object.keys(confusionMatrix).length > 0 && (
                        <div className="bg-black/10 p-6 overflow-x-auto rounded-lg shadow-inner mt-6">
                            <h3 className="text-tactical-accent text-sm tracking-widest border-b border-tactical-muted/30 pb-2 mb-4">HYBRID MODE CONFUSION MATRIX</h3>
                            <table className="w-full text-center text-[10px] font-mono border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-2 border border-tactical-muted/20 text-tactical-text">TRUE \\ PRED</th>
                                        {Object.keys(confusionMatrix).map(cls => (
                                            <th key={cls} className="p-2 border border-tactical-muted/20 text-tactical-text break-all w-16">{cls.substring(0,3)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(confusionMatrix).map(trueCls => (
                                        <tr key={trueCls}>
                                            <td className="p-2 border border-tactical-muted/20 text-left text-tactical-text font-bold">{trueCls}</td>
                                            {Object.keys(confusionMatrix).map(predCls => {
                                                const count = confusionMatrix[trueCls][predCls] || 0;
                                                const isCorrect = trueCls === predCls;
                                                return (
                                                    <td key={predCls} className={`p-2 border border-tactical-muted/20 ${count > 0 ? (isCorrect ? 'bg-tactical-accent/20 text-tactical-accent' : 'bg-red-500/20 text-red-400') : 'text-tactical-muted/30'}`}>
                                                        {count}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            
            {history.length > 0 && (
                <div className="mt-8 bg-black/10 p-6 w-full overflow-x-auto rounded-lg shadow-inner">
                    <h3 className="text-tactical-accent tracking-widest border-b border-tactical-muted/30 pb-2 mb-4">EVALUATION HISTORY</h3>
                    <table className="w-full text-left text-[10px] text-tactical-muted">
                        <thead>
                            <tr className="border-b border-tactical-muted/20 text-tactical-text">
                                <th className="pb-2">DATE</th>
                                <th className="pb-2">MODE</th>
                                <th className="pb-2">TOP-1</th>
                                <th className="pb-2">TOP-3</th>
                                <th className="pb-2">TOP-5</th>
                                <th className="pb-2">MRR</th>
                                <th className="pb-2">LATENCY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(run => (
                                <tr key={run.id} className="border-b border-tactical-muted/10 last:border-0">
                                    <td className="py-2">{new Date(run.runDate).toLocaleString()}</td>
                                    <td className="py-2 text-tactical-text">{run.mode}</td>
                                    <td className="py-2">{run.top1Accuracy?.toFixed(1)}%</td>
                                    <td className="py-2">{run.top3Accuracy?.toFixed(1)}%</td>
                                    <td className="py-2">{run.top5Accuracy?.toFixed(1)}%</td>
                                    <td className="py-2">{run.mrr?.toFixed(3)}</td>
                                    <td className="py-2">{(run.averageLatencyMs / 1000)?.toFixed(2)}s</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
