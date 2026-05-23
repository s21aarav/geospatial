import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

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
  
  const [displayIndex, setDisplayIndex] = useState(0);
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    if (events.length === 1 || events.length === 0) {
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
    if (visualStatus === 'COMPLETED') return;

    let logCounter = 0;
    const fakeLogGenerator = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      
      const stepFakeLogs = currentStep.fakeLogs;
      
      let newLine = "";
      if (logCounter < stepFakeLogs.length) {
        newLine = `[${timeStr}] [${currentStep.name}] ${stepFakeLogs[logCounter]}`;
      } else {
        const hex = Math.floor(Math.random()*16777215).toString(16).toUpperCase().padStart(6, '0');
        newLine = `[${timeStr}] [${currentStep.name}] MEM_DUMP 0x${hex} OK`;
      }
      
      setLogs(prev => [...prev, newLine]);
      logCounter++;
      
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 15); // Log generation every 15ms to make it look extremely dense and fast

    return () => clearInterval(fakeLogGenerator);
  }, [currentStep, visualStatus]);

  useEffect(() => {
    if (visualStatus === 'ERROR') {
      setLogs(prev => [...prev, `[CRITICAL_FAILURE] Execution halted due to systemic anomaly.`]);
    }
  }, [visualStatus]);

  return (
    <div className="w-full max-w-4xl mx-auto rounded flex flex-col h-[500px] border border-tactical-accent/30 bg-[#050505] font-mono relative overflow-hidden shadow-2xl">
      
      <div className="flex justify-between items-center bg-[#111] px-4 py-3 border-b border-tactical-accent/20 z-10">
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
          <span className="text-tactical-muted text-[10px] ml-4 tracking-widest uppercase flex items-center">
             <Terminal className="w-3 h-3 mr-2" /> root@palantir-ingest-node
          </span>
        </div>
        <div className="flex gap-4 items-center">
          {endTime && startTime && (
            <span className="text-tactical-muted text-[10px] tracking-widest uppercase">
              LATENCY: {(endTime - startTime)}ms
            </span>
          )}
          <span className={`text-[10px] tracking-widest px-2 py-0.5 font-bold ${visualStatus === 'ERROR' ? 'bg-tactical-danger text-black' : visualStatus === 'COMPLETED' ? 'bg-tactical-success text-black' : 'text-[#27c93f] animate-pulse'}`}>
            {visualStatus === 'ERROR' ? 'CRITICAL FAILURE' : visualStatus === 'COMPLETED' ? 'EXECUTION TERMINATED' : 'ACTIVE THREAD'}
          </span>
        </div>
      </div>

      <div 
        ref={terminalRef}
        className="flex-grow p-5 overflow-y-auto text-[11px] leading-loose text-[#27c93f]/90 z-10"
        style={{ textShadow: "0 0 5px rgba(39, 201, 63, 0.4)" }}
      >
        <div className="mb-4 opacity-50">
           Palantir OS v11.4.2 [Kernel Darwin 21.6.0]<br/>
           Establishing secure uplink to High-Speed Event Bus... OK.<br/>
           Awaiting payload...<br/>
           <br/>
        </div>
        {logs.map((log, i) => (
          <div key={i} className="mb-0.5">
            {log}
          </div>
        ))}
        {visualStatus === 'PROCESSING' && (
          <div className="mt-2 animate-pulse w-2 h-4 bg-[#27c93f]"></div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-20 opacity-30"></div>
    </div>
  );
}
