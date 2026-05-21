import React from 'react';
import { CheckCircle2, Loader2, CircleDashed } from 'lucide-react';

export default function ExecutionPipeline({ events, currentStatus }) {
  // We define the strict order of 13 steps for the UI, plus the upload step.
  const pipelineSchema = [
    { id: 'UPLOADING', name: 'Secure Transfer', desc: 'Transferring raw payload to ingestion node' },
    { id: 'AMQP_ROUTING', name: 'AMQP Queue Routing Protocol', desc: 'Dispatching raw bytes to High-Speed Event Bus' },
    { id: 'LZW_DECOMPRESSION', name: 'LZW Decompression Algorithm', desc: 'Losslessly decompressing 50MB GeoTIFF' },
    { id: 'SPECTRAL_BAND_SLICING', name: 'Spectral Band Slicing & Tensor Reordering', desc: 'Extracting wavelengths and reordering to (C, H, W)' },
    { id: 'RADIOMETRIC_NORMALIZATION', name: 'Radiometric Normalization', desc: 'Applying Min-Max Scaling (P2-P98) to eliminate noise' },
    { id: 'SLIDING_WINDOW_TILING', name: 'Sliding Window Convolutional Tiling', desc: 'Padding tensor dimensions to exactly 224x224 for GPU' },
    { id: 'FAIR_DISPATCH_ACK', name: 'Fair Dispatch & Consumer ACK', desc: 'RabbitMQ dynamically allocating task to prevent OOM' },
    { id: 'PATCH_EMBEDDING', name: 'Patch Embedding & Linear Projection', desc: 'Converting 2D image tiles into a 1D sequence of tokens on MPS' },
    { id: 'POSITIONAL_ENCODING', name: 'Positional Encoding Algorithm', desc: 'Preserving geographical coordinates of image patches via sine waves' },
    { id: 'MULTI_HEAD_ATTENTION', name: 'Multi-Head Scaled Dot-Product Self-Attention', desc: 'Calculating attention over O(N^2 * D) relationships' },
    { id: 'GELU_ACTIVATION', name: 'GELU Activation Algorithm', desc: 'Applying non-linear Gaussian Error Linear Units to MLP blocks' },
    { id: 'HNSW_GREEDY_SEARCH', name: 'HNSW Greedy Search Graph Routing', desc: 'Traversing O(log N) superhighways to find vector neighborhood' },
    { id: 'COSINE_SIMILARITY', name: 'PostgreSQL Vector Cosine Distance', desc: 'Computing exact spatial distance using native pgvector ops' },
    { id: 'COMPLETED', name: 'Intelligence Aggregation Complete', desc: 'Pipeline finished' }
  ];

  // Map events to a set of completed IDs
  const completedIds = new Set(events.map(e => e.status));
  
  // If COMPLETED is in events, everything is done. Otherwise, the "current" step is the last one in the schema that exists in events.
  // Wait, the events are appended. So the current active step is the LAST event received that is in our schema.
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  const activeId = lastEvent ? lastEvent.status : 'UPLOADING';
  
  // Actually, we want to light them up sequentially. 
  // Let's determine the index of the active step in our schema.
  const activeIndex = pipelineSchema.findIndex(s => s.id === activeId);

  return (
    <div className="glass-panel w-full max-w-3xl mx-auto rounded-lg p-6 flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-6 pb-2 border-b border-tactical-muted/30">
        <h2 className="text-sm font-mono tracking-widest text-tactical-muted">EXECUTION LOG</h2>
        <span className={`text-xs font-mono px-2 py-1 bg-tactical-panel border border-tactical-muted/20 ${currentStatus === 'ERROR' ? 'text-tactical-danger' : 'text-tactical-success'}`}>
          {currentStatus === 'ERROR' ? 'SYSTEM FAILURE' : currentStatus === 'COMPLETED' ? 'OPERATION SUCCESS' : 'PROCESSING'}
        </span>
      </div>
      
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {pipelineSchema.map((step, idx) => {
          const isPast = activeIndex > idx || currentStatus === 'COMPLETED';
          const isCurrent = activeIndex === idx && currentStatus !== 'COMPLETED';
          const isFuture = activeIndex < idx && currentStatus !== 'COMPLETED';
          
          let icon = <CircleDashed className="w-5 h-5 text-tactical-muted opacity-20" />;
          let textClass = "text-tactical-muted opacity-40";
          let borderClass = "border-transparent";

          if (isPast) {
            icon = <CheckCircle2 className="w-5 h-5 text-tactical-success" />;
            textClass = "text-tactical-text";
            borderClass = "border-l-tactical-success/30";
          } else if (isCurrent) {
            icon = <Loader2 className="w-5 h-5 text-tactical-accent animate-spin" />;
            textClass = "text-tactical-accent font-bold shadow-[0_0_10px_rgba(255,255,255,0.1)]";
            borderClass = "border-l-tactical-accent bg-tactical-muted/5";
          }

          return (
            <div key={step.id} className={`flex items-start transition-all duration-300 border-l-2 pl-3 py-1 ${borderClass}`}>
              <div className="mr-4 mt-0.5 flex-shrink-0">
                {icon}
              </div>
              <div className="flex flex-col">
                <h4 className={`text-xs font-mono uppercase tracking-wider ${textClass}`}>{step.name}</h4>
                {(isPast || isCurrent) && (
                   <p className="text-[10px] text-tactical-muted font-mono mt-1 opacity-80">{step.desc}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
