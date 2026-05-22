import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Rectangle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function MapController({ isExpanded, isDrawMode }) {
  const map = useMap();
  
  useEffect(() => {
    // Fix leaflet map size when container bounds change
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isExpanded, map]);

  useEffect(() => {
    // Force native leaflet dragging toggle
    if (isDrawMode) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
  }, [isDrawMode, map]);

  return null;
}

function BoundingBoxDrawer({ setBounds, isDrawMode }) {
  const map = useMap();
  const rectRef = useRef(null);
  const startPointRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!isDrawMode) return;

    const onMouseDown = (e) => {
      // Allow starting a new box immediately
      isDrawingRef.current = true;
      startPointRef.current = e.latlng;
      if (rectRef.current) {
        rectRef.current.remove();
      }
      // Create a temporary native leaflet rectangle
      rectRef.current = L.rectangle([e.latlng, e.latlng], { color: '#00ff00', weight: 2, fillOpacity: 0.2 }).addTo(map);
    };

    const onMouseMove = (e) => {
      if (isDrawingRef.current && startPointRef.current && rectRef.current) {
        rectRef.current.setBounds([startPointRef.current, e.latlng]);
      }
    };

    const onMouseUp = (e) => {
      if (isDrawingRef.current && startPointRef.current) {
        isDrawingRef.current = false;
        
        const endLatLng = e.latlng;
        if (rectRef.current) {
          rectRef.current.setBounds([startPointRef.current, endLatLng]);
          // We remove the temporary rectangle so the React state-driven one can take over
          rectRef.current.remove();
          rectRef.current = null;
        }
        
        const minLat = Math.min(startPointRef.current.lat, endLatLng.lat);
        const maxLat = Math.max(startPointRef.current.lat, endLatLng.lat);
        const minLon = Math.min(startPointRef.current.lng, endLatLng.lng);
        const maxLon = Math.max(startPointRef.current.lng, endLatLng.lng);
        
        setBounds([minLat, maxLat, minLon, maxLon]);
        startPointRef.current = null;
      }
    };

    // Use native Leaflet events to bypass React render cycle lag
    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      if (rectRef.current) {
        rectRef.current.remove();
        rectRef.current = null;
      }
    };
  }, [map, isDrawMode, setBounds]);

  return null;
}

export default function BoundingBoxSelector({ bounds, setBounds, enabled, setEnabled }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false); // false = Pan, true = Draw

  // Auto-collapse and reset when disabled externally (e.g. by openNewUplink)
  useEffect(() => {
    if (!enabled) {
      setIsExpanded(false);
      setIsDrawMode(false);
    }
  }, [enabled]);

  const handleToggle = () => {
    if (enabled) {
      // Disabling — clear everything
      setBounds(null);
      setIsExpanded(false);
      setEnabled(false);
    } else {
      setEnabled(true);
    }
  };

  const mapContent = (
    <div className={`${isExpanded ? 'fixed inset-4 md:inset-10 z-[9999] bg-black border-2 border-tactical-accent shadow-2xl flex flex-col' : 'h-64 w-full border border-tactical-accent/50 relative mt-2 flex flex-col'}`}>
        
        {/* Map Controls Header */}
        <div className="bg-tactical-bg border-b border-tactical-accent/30 p-2 flex justify-between items-center z-10 shrink-0">
            <div className="flex gap-2">
                <button 
                    onClick={() => setIsDrawMode(false)}
                    className={`font-mono text-[10px] px-3 py-1 border ${!isDrawMode ? 'border-tactical-accent bg-tactical-accent/20 text-tactical-accent' : 'border-tactical-muted/30 text-tactical-muted hover:text-tactical-text'}`}
                >
                    ✋ PAN
                </button>
                <button 
                    onClick={() => setIsDrawMode(true)}
                    className={`font-mono text-[10px] px-3 py-1 border ${isDrawMode ? 'border-tactical-accent bg-tactical-accent/20 text-tactical-accent' : 'border-tactical-muted/30 text-tactical-muted hover:text-tactical-text'}`}
                >
                    🟦 DRAW
                </button>
            </div>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="font-mono text-[10px] px-2 py-1 border border-tactical-muted/30 text-tactical-muted hover:text-tactical-text hover:border-tactical-text"
            >
                {isExpanded ? '↙ COLLAPSE TO SIDEBAR' : '↗ ENLARGE'}
            </button>
        </div>

        {/* Prevent scrolling when drawing */}
        <div className={`flex-1 relative ${isDrawMode ? 'cursor-crosshair' : 'cursor-grab'}`} onWheel={(e) => e.stopPropagation()}>
          <MapContainer 
            center={[48.8566, 2.3522]} // Default center (Paris for EuroSAT)
            zoom={4} 
            style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
            dragging={!isDrawMode} // Allow dragging only when panning
            scrollWheelZoom={true}
            doubleClickZoom={false}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
            <MapController isExpanded={isExpanded} isDrawMode={isDrawMode} />
            <BoundingBoxDrawer setBounds={setBounds} isDrawMode={isDrawMode} />
            
            {/* If bounds already exist render them */}
            {bounds && (
               <Rectangle 
                  bounds={[ [bounds[0], bounds[2]], [bounds[1], bounds[3]] ]} 
                  pathOptions={{ color: '#00ff00', weight: 2, fillOpacity: 0.2 }} 
               />
            )}
          </MapContainer>
      </div>
    </div>
  );

  return (
    <div className="mt-6 border-t border-tactical-muted/30 pt-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-tactical-text font-mono text-xs font-bold">SPATIAL BOUNDING BOX</label>
        <button 
            onClick={handleToggle}
            className={`font-mono text-[10px] px-2 py-1 border transition-colors ${enabled ? 'border-tactical-accent text-tactical-accent bg-tactical-accent/10' : 'border-tactical-muted/50 text-tactical-muted hover:text-tactical-text'}`}
        >
            {enabled ? 'ENABLED' : 'DISABLED'}
        </button>
      </div>
      
      {enabled && (isExpanded ? createPortal(mapContent, document.body) : mapContent)}
      
      {bounds && enabled && (
          <div className="font-mono text-[10px] text-tactical-accent mt-2 break-all bg-tactical-accent/5 p-2 border border-tactical-accent/20">
              <span className="font-bold">BBOX SECURED:</span><br/>
              [{bounds[0].toFixed(4)}, {bounds[1].toFixed(4)}, {bounds[2].toFixed(4)}, {bounds[3].toFixed(4)}]
          </div>
      )}
    </div>
  );
}
