import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Target } from 'lucide-react';
import ExplainabilityPanel from './ExplainabilityPanel';

// Fix for default leaflet icons not showing up in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function MapResults({ results, queryStats }) {
  const [activeCenter, setActiveCenter] = useState(null);

  useEffect(() => {
    if (results && results.length > 0) {
      setActiveCenter([results[0].latitude, results[0].longitude]);
    }
  }, [results]);

  if (!results || results.length === 0 || !activeCenter) return null;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 mt-4 bg-tactical-dark border border-tactical-muted/20">
      <h2 className="text-sm tracking-widest font-mono text-tactical-muted mb-6 border-b border-tactical-muted/30 pb-2 flex items-center uppercase">
        <Target className="mr-2 w-4 h-4" />
        Geospatial Matches (Top 5)
      </h2>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-3/4 h-[600px] border border-tactical-muted/30 relative z-0 bg-black">
          <MapContainer center={activeCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
            {/* Using a dark themed map tile */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {results.map((res, idx) => (
              <Marker key={idx} position={[res.latitude, res.longitude]}>
                <Popup className="font-mono text-black rounded-none">
                  <div className="flex flex-col gap-1 min-w-[150px]">
                    <strong className="text-xs border-b border-gray-300 pb-1">RANK: {idx + 1}</strong>
                    <img 
                      src={`http://localhost:8080/api/v1/intelligence/images/${res.filename}`} 
                      alt={res.filename}
                      className="w-full h-24 object-cover my-1 border border-gray-400 grayscale contrast-125"
                    />
                    <div className="text-[10px] text-gray-800 leading-tight">
                      <p className="font-bold truncate" title={res.filename}>OBJ: {res.filename.split('/').pop()}</p>
                      <p className="font-semibold text-tactical-dark">CONFIDENCE: {(res.similarityScore * 100).toFixed(2)}%</p>
                      <p>{res.latitude.toFixed(4)}, {res.longitude.toFixed(4)}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            <ChangeView center={activeCenter} zoom={15} />
          </MapContainer>
        </div>

        <div className="w-full lg:w-1/4 flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
          {results.length === 0 && (
            <div className="p-4 border border-tactical-danger/30 text-tactical-danger font-mono text-xs bg-tactical-danger/10">
              No matches above threshold; lower threshold or remove terrain filter.
            </div>
          )}
          {results.map((res, idx) => (
            <div 
              key={idx} 
              onClick={() => setActiveCenter([res.latitude, res.longitude])}
              className="bg-tactical-panel border border-tactical-muted/20 p-3 hover:border-tactical-muted/50 transition-colors flex flex-col gap-3 cursor-pointer"
            >
              <div className="flex justify-between items-center border-b border-tactical-muted/20 pb-2">
                <span className="font-mono font-bold text-tactical-text text-xs">#{idx + 1} - {res.terrainClass}</span>
                <span className="font-mono text-tactical-dark bg-tactical-text px-1.5 py-0.5 text-[10px] font-bold">
                  {(res.similarityScore * 100).toFixed(1)}% FINAL SCORE
                </span>
              </div>
              <img 
                src={`http://localhost:8080/api/v1/intelligence/images/${res.filename}`} 
                alt={res.filename}
                className="w-full h-24 object-cover border border-tactical-muted/30 grayscale hover:grayscale-0 transition-all duration-500"
              />
              <div className="font-mono text-[10px] text-tactical-muted space-y-1">
                <div className="flex justify-between">
                  <span>ID:</span>
                  <span className="text-tactical-text truncate max-w-[120px]" title={res.filename}>
                    {res.filename.split('/').pop().toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>LAT:</span>
                  <span className="text-tactical-text">{res.latitude.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span>LON:</span>
                  <span className="text-tactical-text">{res.longitude.toFixed(4)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <ExplainabilityPanel 
          result={results.find(r => r.latitude === activeCenter[0] && r.longitude === activeCenter[1]) || results[0]} 
          queryStats={queryStats} 
      />
    </div>
  );
}
