import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ImageModal({ isOpen, onClose, src, alt, title }) {
    if (!isOpen) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4 md:p-12 cursor-pointer"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-5xl max-h-full flex flex-col items-center bg-tactical-panel/50 border border-white/10 p-2 shadow-2xl cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-4 right-4 z-10 cursor-pointer p-2 bg-black/50 border border-white/20 hover:bg-tactical-accent/20 transition-colors rounded-lg" onClick={onClose}>
                    <X className="w-5 h-5 text-white" />
                </div>
                
                {title && (
                    <div className="absolute top-4 left-4 z-10 bg-black/80 border border-white/20 px-3 py-1 font-mono text-xs text-tactical-accent shadow-md">
                        {title}
                    </div>
                )}

                <img 
                    src={src} 
                    alt={alt || title} 
                    className="w-full max-h-[80vh] object-contain border border-tactical-muted/30"
                />
            </div>
        </div>,
        document.body
    );
}
