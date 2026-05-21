import React from 'react';

export default function ExplainabilityPanel({ queryStats, result }) {
    if (!result) return null;

    // A simple heuristic for "why is it relevant"
    let reasoning = "Strong geometric and spectral match in the ViT latent space.";
    if (result.ndvi > 0.4 && queryStats?.ndvi > 0.4) {
        reasoning = "High vegetation correlation (NDVI > 0.4) indicating similar flora coverage.";
    } else if (result.ndwi > 0.2 && queryStats?.ndwi > 0.2) {
        reasoning = "Strong water signature match (NDWI > 0.2) indicating coastal or riverine similarities.";
    } else if (result.brightness > 150 && queryStats?.brightness > 150) {
        reasoning = "High albedo correlation, typical of urban concrete or bright sandy terrain.";
    }

    return (
        <div className="bg-tactical-panel border border-tactical-muted/30 p-4 w-full flex flex-col gap-4 mt-4 animate-fade-in">
            <h3 className="text-tactical-accent font-mono text-sm tracking-widest border-b border-tactical-muted/30 pb-2">EXPLAINABILITY PANEL</h3>
            
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
                    <span className="text-[10px] text-tactical-muted font-mono tracking-widest">SPECTRAL TELEMETRY</span>
                    <div className="bg-tactical-dark p-2 border border-tactical-muted/20 text-[10px] font-mono h-32 flex flex-col justify-center space-y-2">
                        <div className="flex justify-between">
                            <span className="text-tactical-muted" title="Normalized Difference Vegetation Index">NDVI:</span>
                            <span className="text-tactical-text">{result.ndvi?.toFixed(3)} {queryStats && `(Q: ${queryStats.ndvi?.toFixed(3)})`}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-tactical-muted" title="Normalized Difference Water Index">NDWI:</span>
                            <span className="text-tactical-text">{result.ndwi?.toFixed(3)} {queryStats && `(Q: ${queryStats.ndwi?.toFixed(3)})`}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-tactical-muted">ALBEDO:</span>
                            <span className="text-tactical-text">{result.brightness?.toFixed(1)} {queryStats && `(Q: ${queryStats.brightness?.toFixed(1)})`}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-2 bg-tactical-dark p-3 border-l-2 border-tactical-accent text-xs font-mono text-tactical-text">
                <span className="text-tactical-muted mr-2">REASONING:</span>
                {reasoning}
            </div>
        </div>
    );
}
