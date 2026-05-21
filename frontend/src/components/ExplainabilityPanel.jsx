import React from 'react';

export default function ExplainabilityPanel({ queryStats, result }) {
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

    return (
        <div className="bg-tactical-panel border border-tactical-muted/30 p-4 w-full flex flex-col gap-4 mt-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-tactical-muted/30 pb-2">
                <h3 className="text-tactical-accent font-mono text-sm tracking-widest">EXPLAINABILITY PANEL</h3>
                {queryStats?.searchMode && (
                    <div className="flex gap-2 text-[10px] font-mono">
                        <span className="text-tactical-muted">MODE:</span>
                        <span className="text-tactical-text font-bold">{queryStats.searchMode}</span>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-tactical-muted font-mono tracking-widest">TARGET PROFILE</span>
                    <img src={`http://localhost:8080/api/v1/intelligence/images/${result.filename}`} className="w-full h-32 object-cover border border-tactical-muted/50 grayscale hover:grayscale-0 transition-all duration-300"/>
                    <div className="text-[10px] font-mono mt-1 space-y-1">
                        <div className="flex justify-between"><span className="text-tactical-muted">CLASS:</span><span className="text-tactical-text">{result.terrainClass}</span></div>
                        <div className="flex justify-between"><span className="text-tactical-muted">SIMILARITY:</span><span className="text-tactical-accent">{(result.similarityScore * 100).toFixed(2)}%</span></div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-tactical-muted font-mono tracking-widest flex justify-between">
                        <span>SCORE BREAKDOWN</span>
                        {queryStats?.searchMode === 'HYBRID' && (
                            <span>W: {(queryStats.vitWeight||0).toFixed(2)} | {(queryStats.ndviWeight||0).toFixed(2)} | {(queryStats.ndwiWeight||0).toFixed(2)} | {(queryStats.brightnessWeight||0).toFixed(2)}</span>
                        )}
                        {queryStats?.searchMode === 'SPECTRAL_ONLY' && (
                            <span>W: {(queryStats.ndviWeight||0).toFixed(2)} | {(queryStats.ndwiWeight||0).toFixed(2)} | {(queryStats.brightnessWeight||0).toFixed(2)}</span>
                        )}
                    </span>
                    <div className="bg-tactical-dark p-2 border border-tactical-muted/20 text-[10px] font-mono h-32 flex flex-col justify-center">
                        <ProgressBar label={`VIT SEMANTIC${queryStats?.vitWeight ? ` (W: ${(queryStats.vitWeight).toFixed(2)})` : ''}`} score={result.vitScore || 0} colorClass="bg-tactical-accent" />
                        <ProgressBar label={`NDVI (VEGETATION)${queryStats?.ndviWeight ? ` (W: ${(queryStats.ndviWeight).toFixed(2)})` : ''}`} score={result.ndviScore || 0} colorClass="bg-green-500" />
                        <ProgressBar label={`NDWI (WATER)${queryStats?.ndwiWeight ? ` (W: ${(queryStats.ndwiWeight).toFixed(2)})` : ''}`} score={result.ndwiScore || 0} colorClass="bg-blue-500" />
                        <ProgressBar label={`ALBEDO (BRIGHTNESS)${queryStats?.brightnessWeight ? ` (W: ${(queryStats.brightnessWeight).toFixed(2)})` : ''}`} score={result.brightnessScore || 0} colorClass="bg-yellow-500" />
                    </div>
                </div>
            </div>

            <div className="mt-2 bg-tactical-dark p-3 border-l-2 border-tactical-accent text-xs font-mono text-tactical-text">
                <span className="text-tactical-muted mr-2">REASONING:</span>
                {result.explanation || "Match computed by hybrid retrieval engine."}
            </div>
        </div>
    );
}
