import React from 'react';
import { Loader2, CheckCircle2, XCircle, CircleDashed, UploadCloud } from 'lucide-react';

export default function JobSidebar({ jobs, activeJobId, setActiveJobId }) {
  return (
    <div className="w-full md:w-56 flex-shrink-0 flex flex-col gap-4">
      {/* New Uplink Button pinned at top */}
      <div 
         onClick={() => setActiveJobId(null)}
         className={`border p-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-2 rounded ${activeJobId === null ? 'bg-tactical-muted/10 border-tactical-accent text-tactical-accent' : 'bg-tactical-panel border-tactical-muted/30 hover:border-tactical-accent/50 text-tactical-text'}`}
      >
         <UploadCloud className="w-4 h-4" />
         <span className="font-mono text-xs tracking-widest font-bold">NEW UPLINK</span>
      </div>
      
      <div className="flex flex-col gap-2 flex-grow overflow-y-auto max-h-[700px] pr-2">
        <h3 className="text-tactical-accent font-mono text-xs tracking-widest border-b border-tactical-muted/30 pb-2 mb-2 mt-2">ACTIVE SESSIONS</h3>
        
        {jobs.length === 0 && (
          <p className="text-tactical-muted text-[10px] font-mono text-center mt-4">NO PAYLOADS DETECTED</p>
        )}

        {jobs.map(job => {
          const isActive = job.id === activeJobId;
          
          let Icon = CircleDashed;
          let iconClass = "text-tactical-muted";
          
          // Use visualStatus for more accurate UI reflection of what the user is seeing
          const displayStatus = job.visualStatus || job.status;
          
          if (displayStatus === 'ERROR') {
             Icon = XCircle;
             iconClass = "text-tactical-danger";
          } else if (displayStatus === 'COMPLETED') {
             Icon = CheckCircle2;
             iconClass = "text-tactical-success";
          } else if (displayStatus !== 'IDLE') {
             Icon = Loader2;
             iconClass = "text-tactical-accent animate-spin";
          }

          return (
            <div 
              key={job.id}
              onClick={() => setActiveJobId(job.id)}
              className={`p-3 border-l-2 cursor-pointer transition-all duration-200 flex items-center gap-3 ${isActive ? 'bg-tactical-muted/10 border-tactical-accent' : 'bg-tactical-panel border-transparent hover:bg-tactical-muted/5'}`}
            >
              <Icon className={`w-4 h-4 ${iconClass} flex-shrink-0`} />
              <div className="flex flex-col overflow-hidden">
                <span className={`font-mono text-xs truncate ${isActive ? 'text-tactical-accent font-bold' : 'text-tactical-text'}`} title={job.filename}>
                  {job.filename}
                </span>
                <span className={`font-mono text-[9px] uppercase ${displayStatus === 'ERROR' ? 'text-tactical-danger' : 'text-tactical-muted'}`}>
                  {displayStatus === 'ERROR' ? 'FAILURE' : displayStatus}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
