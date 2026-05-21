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
    const [metrics, setMetrics] = useState(null);
    const [logs, setLogs] = useState([]);

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

    const runEvaluation = async () => {
        setEvalStatus('RUNNING');
        setProgress(0);
        setLogs([]);
        setMetrics(null);

        let top1 = 0, top3 = 0, top5 = 0;
        let mrrSum = 0;
        let latencies = [];
        let completed = 0;

        for (let i = 0; i < EVALUATION_SAMPLES.length; i++) {
            const sample = EVALUATION_SAMPLES[i];
            addLog(`[EVAL] Fetching original TIF: ${sample.tifFile}...`);

            try {
                // Fetch the actual multispectral GeoTIFF from the new /tif/ endpoint
                const tifRes = await fetch(`${API_BASE}/tif/${sample.tifFile}`);
                if (!tifRes.ok) {
                    addLog(`[ERROR] Could not fetch TIF: ${sample.tifFile} (HTTP ${tifRes.status})`);
                    setProgress(((i + 1) / EVALUATION_SAMPLES.length) * 100);
                    continue;
                }
                const blob = await tifRes.blob();
                const tifFileName = sample.tifFile.split('/')[1];
                const file = new File([blob], tifFileName, { type: 'image/tiff' });

                addLog(`[EVAL] Submitting ${tifFileName} for ViT inference...`);
                const startTime = performance.now();

                const formData = new FormData();
                formData.append('file', file);
                formData.append('topK', 5);
                formData.append('threshold', 0);

                const response = await axios.post(`${API_BASE}/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                const taskId = response.data.task_id;

                // Wait for completion via SSE
                const results = await new Promise((resolve, reject) => {
                    const eventSource = new EventSource(`${API_BASE}/stream/${taskId}`);
                    const timeout = setTimeout(() => { 
                        eventSource.close(); 
                        reject("Timeout after 60s"); 
                    }, 60000);

                    eventSource.addEventListener('status', (e) => {
                        try {
                            const payload = JSON.parse(e.data);
                            if (payload.status === 'COMPLETED') {
                                clearTimeout(timeout);
                                eventSource.close();
                                resolve(payload.results || []);
                            } else if (payload.status === 'ERROR' || payload.status === 'FAILED') {
                                clearTimeout(timeout);
                                eventSource.close();
                                reject(payload.error || 'Pipeline error');
                            }
                        } catch (parseErr) {
                            // Ignore parse errors from intermediate events
                        }
                    });
                    
                    eventSource.onerror = () => {
                        clearTimeout(timeout);
                        eventSource.close();
                        reject("SSE connection error");
                    };
                });

                const endTime = performance.now();
                const latency = endTime - startTime;
                latencies.push(latency);

                if (results.length === 0) {
                    addLog(`[WARN] Query ${i+1} returned 0 results — DB may still be ingesting.`);
                    setProgress(((i + 1) / EVALUATION_SAMPLES.length) * 100);
                    continue;
                }

                // Calculate retrieval metrics
                const returnedClasses = results.map(r => r.terrainClass);
                
                if (returnedClasses[0] === sample.trueClass) top1++;
                if (returnedClasses.slice(0, 3).includes(sample.trueClass)) top3++;
                if (returnedClasses.slice(0, 5).includes(sample.trueClass)) top5++;

                const rank = returnedClasses.indexOf(sample.trueClass);
                if (rank !== -1) {
                    mrrSum += (1.0 / (rank + 1));
                }

                completed++;
                addLog(`[OK] ${tifFileName} → Top-1: ${returnedClasses[0]} ${returnedClasses[0] === sample.trueClass ? '✓' : '✗'} | ${(latency/1000).toFixed(2)}s`);

            } catch (err) {
                addLog(`[ERROR] ${sample.tifFile}: ${err}`);
            }

            setProgress(((i + 1) / EVALUATION_SAMPLES.length) * 100);
        }

        const total = EVALUATION_SAMPLES.length;
        const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

        setMetrics({
            total,
            completed,
            top1: total > 0 ? (top1 / total) * 100 : 0,
            top3: total > 0 ? (top3 / total) * 100 : 0,
            top5: total > 0 ? (top5 / total) * 100 : 0,
            mrr: total > 0 ? mrrSum / total : 0,
            latency: avgLatency
        });

        setEvalStatus('COMPLETED');
        addLog(`[DONE] Benchmark complete. ${completed}/${total} queries succeeded.`);
    };

    return (
        <div className="w-full max-w-4xl glass-panel p-8 text-tactical-text font-mono border-tactical-accent/50 animate-fade-in relative z-10">
            <div className="flex justify-between items-center border-b border-tactical-muted/30 pb-4 mb-6">
                <h2 className="text-xl tracking-widest text-tactical-accent uppercase">Evaluation Dashboard</h2>
                <button onClick={onBack} className="text-tactical-muted hover:text-tactical-text transition-colors">
                    [ RETURN TO SEARCH ]
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <p className="text-sm text-tactical-muted max-w-lg">
                    Runs {EVALUATION_SAMPLES.length} original EuroSAT multispectral GeoTIFFs through the full ViT retrieval pipeline and measures Top-K accuracy, MRR, and E2E latency.
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
                    {/* Progress bar */}
                    <div className="w-full bg-tactical-bg border border-tactical-muted/30 h-4 p-[1px]">
                        <div
                            className="bg-tactical-accent h-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Logs */}
                        <div className="bg-tactical-dark p-4 border border-tactical-muted/20 h-72 overflow-y-auto font-mono text-[10px] space-y-1">
                            {logs.map((log, i) => (
                                <div key={i} className={
                                    log.includes('ERROR') ? 'text-red-400' :
                                    log.includes('WARN') ? 'text-yellow-400' :
                                    log.includes('OK') || log.includes('DONE') ? 'text-tactical-accent' :
                                    'text-tactical-muted'
                                }>
                                    {log}
                                </div>
                            ))}
                        </div>

                        {/* Metrics */}
                        {metrics && (
                            <div className="bg-tactical-dark p-6 border border-tactical-accent/30 flex flex-col justify-between">
                                <h3 className="text-tactical-accent tracking-widest border-b border-tactical-muted/30 pb-2 mb-4">BENCHMARK RESULTS</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span>Queries:</span> <span>{metrics.completed}/{metrics.total}</span></div>
                                    <div className="flex justify-between"><span>Top-1 Accuracy:</span> <span className={metrics.top1 > 50 ? 'text-tactical-accent' : 'text-red-400'}>{metrics.top1.toFixed(1)}%</span></div>
                                    <div className="flex justify-between"><span>Top-3 Accuracy:</span> <span className={metrics.top3 > 50 ? 'text-tactical-accent' : 'text-red-400'}>{metrics.top3.toFixed(1)}%</span></div>
                                    <div className="flex justify-between"><span>Top-5 Accuracy:</span> <span className={metrics.top5 > 50 ? 'text-tactical-accent' : 'text-red-400'}>{metrics.top5.toFixed(1)}%</span></div>
                                    <div className="flex justify-between"><span>MRR:</span> <span>{metrics.mrr.toFixed(3)}</span></div>
                                    <div className="flex justify-between border-t border-tactical-muted/20 pt-2">
                                        <span>Avg Latency:</span>
                                        <span className="text-tactical-accent">{(metrics.latency / 1000).toFixed(2)}s</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
