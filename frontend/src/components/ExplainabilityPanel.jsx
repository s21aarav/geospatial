import React from 'react';

export default function ExplainabilityPanel({ queryStats, result, taskId }) {
    if (!result) return null;

    const ProgressBar = ({ label, score, colorClass }) => (
        <div className="flex flex-col gap-1 w-full mt-1">
            <div className="flex justify-between text-[8px] font-mono">
                <span className="text-tactical-muted">{label}</span>
                <span className={colorClass}>{(score * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-tactical-bg h-1 rounded-full overflow-hidden">
                <div className={`h-full ${colorClass}`} style={{ width: `${score * 100}%` }}></div>
            </div>
        </div>
    );

    const targetImgSrc = `http://localhost:8080/api/v1/intelligence/images/${result.filename}`;
    const heatmapImgSrc = `http://localhost:8080/api/v1/intelligence/heatmap/${taskId}`;

    return (
        <div className="bg-black/10 p-4 w-full flex flex-col gap-4 mt-4 animate-fade-in shadow-xl rounded-xl">
            <div className="flex justify-between items-center pb-2 flex-wrap gap-2">
                <h3 className="text-tactical-accent font-mono text-sm tracking-widest">EXPLAINABILITY PANEL</h3>
                <div className="flex gap-4 items-center text-[10px] font-mono flex-wrap">
                    {queryStats?.taskMetrics && (
                        <div className="flex gap-2 text-tactical-success border border-tactical-success/30 bg-tactical-success/10 px-2.5 py-0.5 font-bold uppercase rounded-sm">
                            <span>TOTAL: {queryStats.taskMetrics.totalTimeMs}ms</span>
                            <span className="text-tactical-muted/40">|</span>
                            <span>QUEUE: {queryStats.taskMetrics.queueTimeMs}ms</span>
                            <span className="text-tactical-muted/40">|</span>
                            <span>ViT: {queryStats.taskMetrics.embeddingTimeMs}ms</span>
                            <span className="text-tactical-muted/40">|</span>
                            <span>DB: {queryStats.taskMetrics.dbSearchTimeMs}ms</span>
                        </div>
                    )}
                    {queryStats?.searchMode && (
                        <div className="flex gap-1.5">
                            <span className="text-tactical-muted">MODE:</span>
                            <span className="text-tactical-text font-bold">{queryStats.searchMode}</span>
                        </div>
                    )}
                </div>
            </div>
            
            <div className={`grid gap-4 items-stretch ${queryStats?.hasHeatmap ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {/* Column 1: Target Profile */}
                <div className="flex flex-col gap-2 h-full">
                    <span className="text-[10px] text-tactical-muted font-mono tracking-widest h-4">TARGET PROFILE</span>
                    <div className="w-full flex-grow min-h-[8rem] overflow-hidden rounded-lg">
                        <img src={targetImgSrc} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500 scale-100 hover:scale-105"/>
                    </div>
                    <div className="text-[10px] font-mono mt-2 space-y-1 h-8">
                        <div className="flex justify-between"><span className="text-tactical-muted">CLASS:</span><span className="text-tactical-text">{result.terrainClass}</span></div>
                        <div className="flex justify-between"><span className="text-tactical-muted">SIMILARITY:</span><span className="text-tactical-accent">{(result.similarityScore * 100).toFixed(2)}%</span></div>
                    </div>
                </div>

                {/* Column 2: Score Breakdown */}
                <div className="flex flex-col gap-2 h-full">
                    <span className="text-[10px] text-tactical-muted font-mono tracking-widest flex justify-between h-4">
                        <span>SCORE BREAKDOWN</span>
                    </span>
                    <div className="bg-black/10 p-3 text-[10px] font-mono flex-grow flex flex-col justify-around min-h-[8rem] rounded-lg">
                        <ProgressBar label={`VIT SEMANTIC${queryStats?.vitWeight ? ` (W: ${(queryStats.vitWeight).toFixed(2)})` : ''}`} score={result.vitScore || 0} colorClass="bg-tactical-accent" />
                        <ProgressBar label={`NDVI (VEGETATION)${queryStats?.ndviWeight ? ` (W: ${(queryStats.ndviWeight).toFixed(2)})` : ''}`} score={result.ndviScore || 0} colorClass="bg-green-500" />
                        <ProgressBar label={`NDWI (WATER)${queryStats?.ndwiWeight ? ` (W: ${(queryStats.ndwiWeight).toFixed(2)})` : ''}`} score={result.ndwiScore || 0} colorClass="bg-blue-500" />
                        <ProgressBar label={`ALBEDO (BRIGHTNESS)${queryStats?.brightnessWeight ? ` (W: ${(queryStats.brightnessWeight).toFixed(2)})` : ''}`} score={result.brightnessScore || 0} colorClass="bg-yellow-500" />
                    </div>
                    <div className="h-8"></div> {/* Spacer to match Col 1 */}
                </div>
                
                {/* Column 3: XAI Heatmap */}
                {queryStats?.hasHeatmap && taskId && (
                    <div className="flex flex-col gap-2 h-full">
                        <span className="text-[10px] text-tactical-muted font-mono tracking-widest flex justify-between h-4">
                            <span>XAI ATTENTION HEATMAP</span>
                            <span className="text-tactical-accent">ViT Grad-CAM</span>
                        </span>
                        <div className="relative group w-full flex-grow min-h-[8rem] bg-black/10 overflow-hidden rounded-lg">
                            <img src={heatmapImgSrc} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" alt="XAI Heatmap" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center flex-col gap-2">
                                <span className="text-[8px] font-mono text-tactical-text text-center px-2">Visualizing Neural Attention over Uploaded Target</span>
                            </div>
                        </div>
                        <div className="h-8"></div> {/* Spacer to match Col 1 */}
                    </div>
                )}
            </div>

            <div className="mt-2 bg-black/10 p-3 border-l-2 border-tactical-accent text-xs font-mono text-tactical-text rounded-r-lg">
                <span className="text-tactical-muted mr-2">REASONING:</span>
                {result.explanation || "Match computed by hybrid retrieval engine."}
            </div>

        </div>
    );
}
