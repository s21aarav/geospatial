import React from 'react';
import { Loader2, CheckCircle2, XCircle, CircleDashed, Plus } from 'lucide-react';

export default function JobSidebar({ jobs, activeJobId, setActiveJobId, onNewUplink }) {
  return (
    <div className="fixed left-0 top-0 h-screen bg-black/30 backdrop-blur-sm border-r border-white/10 z-50 transition-all duration-300 ease-in-out w-16 hover:w-64 group/sidebar flex flex-col overflow-x-hidden shadow-lg float-1">
      
      {/* Header / New Uplink */}
      <div className="w-full flex items-center h-20 flex-shrink-0 border-b border-tactical-muted/30 px-2 cursor-pointer hover:bg-tactical-muted/10 transition-colors" onClick={onNewUplink}>
          <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-300 ${activeJobId === null ? 'bg-tactical-accent/20 border-2 border-tactical-accent text-tactical-accent' : 'bg-transparent text-tactical-text hover:text-tactical-accent'}`}>
              <Plus className="w-6 h-6" />
          </div>
          <div className="ml-3 flex flex-col flex-shrink-0 w-40 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              <span className="font-mono text-sm tracking-widest font-bold text-tactical-text">NEW UPLINK</span>
              <span className="font-mono text-[9px] text-tactical-muted uppercase">Start a new session</span>
          </div>
      </div>

      {/* Tabs List */}
      <div className="flex flex-col flex-grow w-full overflow-y-auto overflow-x-hidden py-4 gap-2">
        {jobs.length === 0 && (
           <div className="w-full h-12 flex items-center px-2 opacity-30">
             <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                 <CircleDashed className="w-5 h-5 text-tactical-muted" />
             </div>
             <div className="ml-3 flex-shrink-0 w-40 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                 <span className="font-mono text-[10px] tracking-widest text-tactical-muted uppercase">No active sessions</span>
             </div>
           </div>
        )}

        {jobs.map(job => {
          const isActive = job.id === activeJobId;
          const displayStatus = job.visualStatus || job.status;
          
          let Icon = CircleDashed;
          let iconClass = "text-tactical-muted";
          
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

          const initials = job.filename.substring(0, 2).toUpperCase();

          return (
            <div 
              key={job.id}
              onClick={() => setActiveJobId(job.id)}
              className={`relative w-full h-14 flex items-center px-2 cursor-pointer transition-all duration-300 group/tab ${isActive ? 'bg-tactical-muted/10' : 'hover:bg-tactical-muted/5'}`}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tactical-accent"></div>
              )}

              {/* Icon / Initials */}
              <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-300 border ${isActive ? 'border-tactical-accent bg-tactical-accent/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'border-tactical-muted/20 bg-black/40 group-hover/tab:border-tactical-muted/60'}`}>
                  <span className={`font-mono text-sm font-bold ${isActive ? 'text-tactical-text' : 'text-tactical-muted'}`}>{initials}</span>
                  <div className="absolute -bottom-0.5 -right-0.5 bg-black/80 backdrop-blur-md rounded-full p-0.5 z-10 shadow-md transition-opacity duration-200 group-hover/sidebar:opacity-0">
                      <Icon className={`w-3 h-3 ${iconClass} ${displayStatus !== 'IDLE' && displayStatus !== 'ERROR' && displayStatus !== 'COMPLETED' ? 'animate-spin' : ''}`} />
                  </div>
              </div>

              {/* Expanded Text */}
              <div className="ml-3 flex flex-col justify-center flex-shrink-0 w-40 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                  <span className={`font-mono text-xs truncate font-bold ${isActive ? 'text-tactical-accent' : 'text-tactical-text group-hover/tab:text-tactical-accent'}`}>
                     {job.filename}
                  </span>
                  <span className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest mt-0.5 ${displayStatus === 'ERROR' ? 'text-tactical-danger' : (isActive ? 'text-tactical-text' : 'text-tactical-muted')}`}>
                     <Icon className={`w-3 h-3 ${iconClass} ${displayStatus !== 'IDLE' && displayStatus !== 'ERROR' && displayStatus !== 'COMPLETED' ? 'animate-spin' : ''}`} />
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
