import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';

export default function Dropzone({ onUpload, compact = false }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className={`glass-panel w-full mx-auto rounded-xl ${compact ? 'p-4' : 'p-8'} text-center relative overflow-hidden group`}>
      {dragActive && <div className="absolute inset-0 bg-tactical-accent/10 z-0"></div>}
      <form 
        onDragEnter={handleDrag} 
        onDragLeave={handleDrag} 
        onDragOver={handleDrag} 
        onDrop={handleDrop}
        className={`relative z-10 border-2 border-dashed ${dragActive ? 'border-tactical-accent' : 'border-tactical-accent/30'} rounded-lg ${compact ? 'p-4' : 'p-12'} transition-all duration-300 flex flex-col items-center justify-center cursor-pointer`}
      >
        <input 
          type="file" 
          accept=".tiff,.tif" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          onChange={handleChange}
        />
        <UploadCloud className={`${compact ? 'w-8 h-8 mb-2' : 'w-16 h-16 mb-4'} ${dragActive ? 'text-tactical-accent animate-pulse' : 'text-tactical-muted'}`} />
        <h3 className={`${compact ? 'text-sm' : 'text-xl'} font-bold text-tactical-text mb-2 tracking-widest uppercase`}>
          {compact ? 'NEW UPLINK' : 'INITIATE SATELLITE UPLINK'}
        </h3>
        {!compact && <p className="text-tactical-muted text-sm uppercase tracking-wider">Drag & drop .TIFF intelligence payload here</p>}
      </form>
      {!compact && (
        <div className="mt-4 flex justify-between text-xs text-tactical-accent/60 font-mono">
          <span>MAX PAYLOAD: 50MB</span>
          <span>SECURE COMMS: ENABLED</span>
        </div>
      )}
    </div>
  );
}
