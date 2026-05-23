import React, { useState, useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, CircleDashed, Loader2, AlertCircle } from 'lucide-react';

const pipelineSchema = [
  { id: 'UPLOADING', name: 'SECURE_TRANSFER', fakeLogs: ['Initializing TLS tunnel...', 'Handshake OK', 'Transmitting payload...', 'Checksum verified: 0x8F9A'] },
  { id: 'AMQP_ROUTING', name: 'AMQP_QUEUE_ROUTING', fakeLogs: ['Connecting to RabbitMQ node cluster...', 'Binding to exchange: tactical.ingress', 'Publishing event...', 'ACK received from broker'] },
  { id: 'LZW_DECOMPRESSION', name: 'LZW_DECOMPRESSION', fakeLogs: ['Allocating 512MB RAM for buffer', 'Decoding LZW dictionary', 'Deflating stream...', 'File written to tmpfs'] },
  { id: 'SPECTRAL_BAND_SLICING', name: 'SPECTRAL_BAND_SLICING', fakeLogs: ['Parsing GeoTIFF metadata...', 'Bands detected: B01, B02, B03, B04, B08, B11, B12', 'Slicing tensor to (13, 224, 224)', 'Reordering channels -> (C, H, W)'] },
  { id: 'RADIOMETRIC_NORMALIZATION', name: 'RADIOMETRIC_NORMALIZATION', fakeLogs: ['Computing P2-P98 percentiles...', 'Applying Min-Max scaling...', 'Clipping outliers...', 'Signal-to-Noise Ratio enhanced'] },
  { id: 'SLIDING_WINDOW_TILING', name: 'CONVOLUTIONAL_TILING', fakeLogs: ['Initializing sliding window kernel (224x224)', 'Padding dimensions: (0,0)', 'Stride set to 224', 'Tiles generated: 1'] },
  { id: 'FAIR_DISPATCH_ACK', name: 'WORKER_DISPATCH', fakeLogs: ['Worker node registered', 'Checking GPU VRAM availability...', 'VRAM: 14.2GB Free', 'Task acquired by worker-node-01'] },
  { id: 'PATCH_EMBEDDING', name: 'VIT_PATCH_EMBEDDING', fakeLogs: ['Loading ViT-B/16 weights...', 'Linear projection of 16x16 patches...', 'Generating 1D token sequence', 'Embedding complete: Shape (197, 768)'] },
  { id: 'POSITIONAL_ENCODING', name: 'POSITIONAL_ENCODING', fakeLogs: ['Applying 1D sine-cosine encoding', 'Fusing spatial priors...', 'Token sequence normalized'] },
  { id: 'MULTI_HEAD_ATTENTION', name: 'SELF_ATTENTION', fakeLogs: ['Initializing 12 attention heads...', 'Computing Q, K, V matrices...', 'Applying softmax...', 'Attention maps fused'] },
  { id: 'GELU_ACTIVATION', name: 'MLP_GELU_ACTIVATION', fakeLogs: ['Applying Gaussian Error Linear Units...', 'Forward pass Layer 12...', 'Final CLS token extracted: (768,)'] },
  { id: 'HNSW_GREEDY_SEARCH', name: 'HNSW_GRAPH_ROUTING', fakeLogs: ['Querying PostgreSQL pgvector index', 'Entering entry point ep=0', 'Traversing layer 2...', 'Traversing layer 1...', 'Layer 0 greedy search...'] },
  { id: 'COSINE_SIMILARITY', name: 'VECTOR_COSINE_DISTANCE', fakeLogs: ['Computing exact cosine distances for top candidates...', 'Sorting by score...', 'Applying terrain filters...', 'Top-K retrieved'] },
  { id: 'COMPLETED', name: 'INTELLIGENCE_AGGREGATED', fakeLogs: ['Pipeline successfully terminated', 'Results flushed to UI', 'Closing AMQP channel'] }
];

export default function ExecutionPipeline({ events, currentStatus, onVisualCompletion, startTime, endTime }) {
  const terminalRef = useRef(null);
  const leftPaneRef = useRef(null);
  
  const [displayIndex, setDisplayIndex] = useState(0);
  const [logs, setLogs] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  
  useEffect(() => {
    if (events.length <= 1) {
      setDisplayIndex(0);
      setLogs([]);
    }
  }, [events.length]);

  useEffect(() => {
    if (events.length > 0) {
      setDisplayIndex(events.length - 1);
    }
  }, [events]);

  const displayedEvents = events.slice(0, displayIndex + 1);
  const lastEvent = displayedEvents.length > 0 ? displayedEvents[displayedEvents.length - 1] : null;
  const activeId = lastEvent ? lastEvent.status : 'UPLOADING';
  
  const activeIndex = pipelineSchema.findIndex(s => s.id === activeId);
  const currentStep = pipelineSchema[activeIndex] || pipelineSchema[0];

  const isActuallyDone = currentStatus === 'COMPLETED' || currentStatus === 'ERROR';
  const visualStatus = isActuallyDone ? currentStatus : 'PROCESSING';

  useEffect(() => {
    if ((visualStatus === 'COMPLETED' || visualStatus === 'ERROR') && onVisualCompletion) {
      onVisualCompletion();
    }
  }, [visualStatus, onVisualCompletion]);

  useEffect(() => {
    if (visualStatus === 'COMPLETED' || visualStatus === 'ERROR') return;

    let logCounter = 0;
    const fakeLogGenerator = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      
      const stepFakeLogs = currentStep.fakeLogs;
      
      let message = "";
      let level = "INFO";
      if (logCounter < stepFakeLogs.length) {
        message = stepFakeLogs[logCounter];
      } else {
        const hex = Math.floor(Math.random()*16777215).toString(16).toUpperCase().padStart(6, '0');
        message = `MEM_DUMP 0x${hex} VERIFIED`;
        level = "TRACE";
      }
      
      const newLog = {
        time: timeStr,
        stepId: currentStep.id,
        stepName: currentStep.name,
        level: level,
        message: message
      };
      
      setLogs(prev => [...prev, newLog]);
      logCounter++;
      
    }, 35);

    return () => clearInterval(fakeLogGenerator);
  }, [currentStep, visualStatus]);
  
  useEffect(() => {
     if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
     }
  }, [logs, selectedStep]);

  useEffect(() => {
    if (visualStatus === 'ERROR') {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      setLogs(prev => [...prev, { time: timeStr, stepId: currentStep.id, stepName: currentStep.name, level: "FATAL", message: "Execution halted due to systemic anomaly." }]);
    }
  }, [visualStatus, currentStep]);

  useEffect(() => {
      if (leftPaneRef.current && activeIndex >= 0) {
          const activeEl = leftPaneRef.current.children[activeIndex];
          if (activeEl) {
              activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
      }
  }, [activeIndex]);

  const filteredLogs = selectedStep ? logs.filter(l => l.stepId === selectedStep) : logs;

  return (
    <div className="w-full max-w-5xl mx-auto rounded-xl flex flex-col h-[550px] bg-black/10 backdrop-blur-md font-mono relative overflow-hidden shadow-2xl">
      
      <div className="flex justify-between items-center bg-black/20 px-4 py-3 z-10">
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
          <span className="text-tactical-muted text-[11px] ml-4 tracking-widest uppercase flex items-center">
             <Terminal className="w-4 h-4 mr-2 text-tactical-accent" /> palantir-ingest-node
          </span>
        </div>
        <div className="flex gap-4 items-center">
          {endTime && startTime && (
            <span className="text-tactical-muted text-[11px] tracking-widest uppercase border border-tactical-accent/30 px-2 py-0.5 rounded">
              LATENCY: {(endTime - startTime)}ms
            </span>
          )}
          <span className={`text-[10px] tracking-widest px-3 py-1 rounded font-bold ${visualStatus === 'ERROR' ? 'bg-tactical-danger text-black' : visualStatus === 'COMPLETED' ? 'bg-tactical-success text-black shadow-[0_0_10px_#27c93f]' : 'bg-[#111] border border-[#27c93f] text-[#27c93f] animate-pulse'}`}>
            {visualStatus === 'ERROR' ? 'CRITICAL FAILURE' : visualStatus === 'COMPLETED' ? 'EXECUTION TERMINATED' : 'ACTIVE THREAD'}
          </span>
        </div>
      </div>

      <div className="flex flex-row flex-grow overflow-hidden z-10">
        
        <div ref={leftPaneRef} className="w-[35%] bg-black/20 overflow-y-auto p-4 space-y-2 relative" style={{ scrollbarWidth: 'none' }}>
            {pipelineSchema.map((step, idx) => {
                const isCompleted = idx < activeIndex || visualStatus === 'COMPLETED';
                const isActive = idx === activeIndex && visualStatus === 'PROCESSING';
                const isPending = idx > activeIndex;
                const isError = idx === activeIndex && visualStatus === 'ERROR';
                const isSelected = selectedStep === step.id;

                let stateClass = "text-tactical-muted border-transparent opacity-60";
                if (isActive) stateClass = "text-[#27c93f] border-[#27c93f]/40 bg-[#27c93f]/5 shadow-[0_0_15px_rgba(39,201,63,0.1)]";
                if (isCompleted) stateClass = "text-[#27c93f]/70 border-tactical-accent/20 hover:bg-tactical-accent/10";
                if (isError) stateClass = "text-tactical-danger border-tactical-danger/40 bg-tactical-danger/10 shadow-[0_0_15px_rgba(255,0,0,0.2)]";

                return (
                    <div 
                        key={step.id}
                        onClick={() => setSelectedStep(isSelected ? null : step.id)}
                        className={`p-3 rounded-xl flex items-center cursor-pointer transition-all duration-300 ${stateClass} ${isSelected ? 'ring-1 ring-tactical-accent bg-tactical-accent/10' : ''}`}
                    >
                        <div className="mr-3 flex-shrink-0">
                            {isCompleted && !isError && <CheckCircle2 className="w-5 h-5 text-tactical-success" />}
                            {isActive && <Loader2 className="w-5 h-5 text-[#27c93f] animate-spin" />}
                            {isError && <AlertCircle className="w-5 h-5 text-tactical-danger" />}
                            {isPending && <CircleDashed className="w-5 h-5 opacity-40" />}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className={`text-[10px] uppercase font-bold tracking-wider truncate ${isActive ? 'text-white' : ''}`}>
                                {step.name.replace(/_/g, ' ')}
                            </span>
                            {isActive && <span className="text-[9px] text-[#27c93f]/70 mt-1 uppercase">Processing...</span>}
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="w-[65%] relative bg-black/10 flex flex-col">
            {selectedStep && (
                <div className="absolute top-0 left-0 right-0 bg-black/20 px-4 py-2 flex justify-between items-center text-[10px] z-20">
                    <span className="text-tactical-accent uppercase tracking-wider">Filtered View: {selectedStep}</span>
                    <button onClick={() => setSelectedStep(null)} className="text-tactical-muted hover:text-white transition-colors">Clear Filter ✕</button>
                </div>
            )}
            
            <div 
                ref={terminalRef}
                className={`flex-grow p-5 overflow-y-auto text-[12px] leading-relaxed z-10 ${selectedStep ? 'mt-8' : ''}`}
                style={{ scrollBehavior: 'smooth' }}
            >
                {!selectedStep && (
                    <div className="mb-6 opacity-60 text-tactical-muted">
                    # Palantir OS v11.4.2 [Kernel Darwin 21.6.0]<br/>
                    # Establishing secure uplink to High-Speed Event Bus... OK.<br/>
                    # Runtime initialized. Awaiting payload...<br/>
                    <br/>
                    </div>
                )}

                {filteredLogs.map((log, i) => {
                    let levelColor = "text-tactical-accent"; // INFO
                    if (log.level === 'TRACE') levelColor = "text-tactical-muted";
                    if (log.level === 'WARN') levelColor = "text-[#ffbd2e]";
                    if (log.level === 'FATAL') levelColor = "text-[#ff5f56]";

                    return (
                        <div key={i} className="mb-1 font-mono flex hover:bg-white/5 transition-colors duration-150 px-1 py-0.5 rounded">
                            <span className="text-tactical-muted/50 mr-3 shrink-0">[{log.time}]</span>
                            <span className={`${levelColor} font-bold mr-3 shrink-0 w-12`}>[{log.level}]</span>
                            <span className="text-white/40 mr-3 shrink-0 hidden md:inline">[{log.stepName}]</span>
                            <span className={`text-white/90 break-all ${log.level === 'FATAL' ? 'text-tactical-danger font-bold' : ''}`}>
                                {log.message}
                            </span>
                        </div>
                    );
                })}
                {visualStatus === 'PROCESSING' && !selectedStep && (
                    <div className="mt-2 animate-pulse w-2 h-4 bg-tactical-accent"></div>
                )}
                {filteredLogs.length === 0 && selectedStep && (
                    <div className="flex h-full items-center justify-center opacity-40 italic text-tactical-muted">
                        No logs recorded for this stage yet.
                    </div>
                )}
            </div>

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] z-20 opacity-20"></div>
        </div>

      </div>

    </div>
  );
}
