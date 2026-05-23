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

function ChangeView({ center, zoom, isActive }) {
  const map = useMap();
  useEffect(() => {
    if (!isActive) {
      // Stop any in-flight animation to prevent NaN errors on zero-size containers
      map.stop();
      return;
    }
    try {
      map.flyTo(center, zoom, { duration: 1.5 });
    } catch (e) {
      console.warn('ChangeView flyTo error (safe to ignore):', e.message);
    }
  }, [center, zoom, isActive, map]);
  return null;
}

function MapFixer({ isActive }) {
  const map = useMap();
  useEffect(() => {
    if (isActive) {
      // Give the browser a frame to apply display:block before calculating map size
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, map]);
  return null;
}

export default function MapResults({ results, queryStats, isActive = true, taskId }) {
  const [activeCenter, setActiveCenter] = useState(null);
  const [mapStyle, setMapStyle] = useState('dark');

  const MAP_STYLES = {
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    light: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    street: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    terrain: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
    }
  };

  useEffect(() => {
    if (results && results.length > 0) {
      setActiveCenter([results[0].latitude, results[0].longitude]);
    }
  }, [results]);

  if (!results || results.length === 0 || !activeCenter) return null;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 mt-4 bg-black/10 rounded-xl shadow-2xl">
      <div className="flex justify-between items-end mb-6 pb-2 flex-wrap gap-2">
        <h2 className="text-sm tracking-widest font-mono text-tactical-muted flex items-center uppercase flex-wrap gap-x-4">
          <span className="flex items-center"><Target className="mr-2 w-4 h-4" /> Geospatial Matches (Top 5)</span>
          {queryStats?.taskMetrics?.totalTimeMs && (
            <span className="text-[10px] text-tactical-success font-bold font-mono tracking-normal bg-tactical-success/15 px-2.5 py-0.5 border border-tactical-success/30 rounded-sm uppercase">
              Latency: {queryStats.taskMetrics.totalTimeMs}ms
            </span>
          )}
        </h2>
        <select 
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="bg-tactical-bg text-tactical-text border border-tactical-muted/30 font-mono text-[10px] p-1.5 focus:outline-none focus:border-tactical-accent"
        >
            <option value="dark">DARK MAP</option>
            <option value="satellite">SATELLITE</option>
            <option value="street">STREET MAP</option>
            <option value="light">LIGHT MAP</option>
            <option value="terrain">TERRAIN</option>
        </select>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-3/4 h-[600px] relative z-0 bg-black/10 rounded-lg overflow-hidden">
          <MapContainer center={activeCenter} zoom={17} style={{ height: '100%', width: '100%' }}>
            {/* Dynamic Map Tile Layer */}
            <TileLayer
              key={mapStyle} // Forces re-render when switching providers to prevent ghost tiles
              url={MAP_STYLES[mapStyle].url}
              attribution={MAP_STYLES[mapStyle].attribution}
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
            <ChangeView center={activeCenter} zoom={17} isActive={isActive} />
            <MapFixer isActive={isActive} />
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
              className="bg-black/10 p-3 hover:bg-black/30 transition-colors flex flex-col gap-3 cursor-pointer rounded-lg"
            >
              <div className="flex justify-between items-center pb-2">
                <span className="font-mono font-bold text-tactical-text text-xs">#{idx + 1} - {res.terrainClass}</span>
                <span className="font-mono text-tactical-dark bg-tactical-text px-1.5 py-0.5 text-[10px] font-bold">
                  {(res.similarityScore * 100).toFixed(1)}% FINAL SCORE
                </span>
              </div>
              <img 
                src={`http://localhost:8080/api/v1/intelligence/images/${res.filename}`} 
                alt={res.filename}
                className="w-full h-24 object-cover grayscale hover:grayscale-0 transition-all duration-500 rounded"
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
          taskId={taskId}
      />
    </div>
  );
}
