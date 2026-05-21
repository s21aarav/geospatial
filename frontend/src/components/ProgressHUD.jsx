import React from 'react';
import { CheckCircle, Loader2, Server, Cpu, Database } from 'lucide-react';

export default function ProgressHUD({ status }) {
  // Determine active step based on status
  let activeStep = 0;
  if (status === 'UPLOADING') activeStep = 1;
  else if (status === 'QUEUED') activeStep = 2;
  else if (status === 'PROCESSING') activeStep = 3;
  else if (status === 'COMPLETED') activeStep = 4;
  else if (status === 'ERROR') activeStep = -1;

  const steps = [
    { id: 1, name: 'INGESTING PAYLOAD', desc: 'Secure transfer to local node', icon: Server },
    { id: 2, name: 'AMQP QUEUE DISPATCH', desc: 'RabbitMQ event bus', icon: Server },
    { id: 3, name: 'PRITHVI TENSOR EXTRACTION', desc: 'Mac MPS GPU 768-D Vectorization', icon: Cpu },
    { id: 4, name: 'HNSW POSTGRESQL SEARCH', desc: 'Cosine similarity vector matching', icon: Database }
  ];

  return (
    <div className="glass-panel w-full max-w-2xl mx-auto rounded-xl p-8 relative overflow-hidden">
      <div className="scan-line"></div>
      <h2 className="text-xl font-mono text-tactical-accent mb-6 border-b border-tactical-accent/30 pb-2 flex justify-between">
        <span>SYSTEM STATUS</span>
        <span className={status === 'ERROR' ? 'text-tactical-danger' : 'text-tactical-success'}>
          {status}
        </span>
      </h2>
      
      <div className="space-y-6">
        {steps.map((step) => {
          const Icon = step.icon;
          const isPast = activeStep > step.id;
          const isCurrent = activeStep === step.id;
          
          let colorClass = 'text-tactical-muted';
          if (isPast) colorClass = 'text-tactical-success';
          if (isCurrent) colorClass = 'text-tactical-accent';

          return (
            <div key={step.id} className={`flex items-start transition-opacity duration-500 ${isPast || isCurrent ? 'opacity-100' : 'opacity-40'}`}>
              <div className="mr-4 mt-1">
                {isPast ? (
                  <CheckCircle className="w-6 h-6 text-tactical-success" />
                ) : isCurrent ? (
                  <Loader2 className="w-6 h-6 text-tactical-accent animate-spin" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-tactical-muted"></div>
                )}
              </div>
              <div>
                <h4 className={`font-mono font-bold tracking-wider ${colorClass}`}>{step.name}</h4>
                <p className="text-sm text-tactical-muted font-mono">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
