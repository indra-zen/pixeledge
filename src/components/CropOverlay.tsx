import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface CropOverlayProps {
  onCrop: (cropBox: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

export function CropOverlay({ onCrop, onCancel }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setCurrentPos({ x, y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const left = Math.min(startPos.x, currentPos.x) * 100;
  const top = Math.min(startPos.y, currentPos.y) * 100;
  const width = Math.abs(currentPos.x - startPos.x) * 100;
  const height = Math.abs(currentPos.y - startPos.y) * 100;

  const hasSelection = width > 0 && height > 0;

  const handleConfirm = () => {
    if (hasSelection) {
      onCrop({
        x: left / 100,
        y: top / 100,
        width: width / 100,
        height: height / 100,
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-20 cursor-crosshair touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!hasSelection && <div className="absolute inset-0 bg-black/50 pointer-events-none" />}
      {hasSelection && (
        <div 
          className="absolute border-2 border-white pointer-events-none"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Grid lines inside crop box */}
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50" />
        </div>
      )}
      
      {/* Controls */}
      <div 
        className="absolute top-4 right-4 flex gap-2 pointer-events-auto z-30"
      >
        <button 
          onPointerDown={(e) => { e.stopPropagation(); onCancel(); }}
          className="bg-red-500 text-white p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
        >
          <X size={20} />
        </button>
        {hasSelection && (
          <button 
            onPointerDown={(e) => { e.stopPropagation(); handleConfirm(); }}
            className="bg-green-400 text-black p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            <Check size={20} />
          </button>
        )}
      </div>
      <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-1 font-bold text-sm pointer-events-none">
        Seret untuk memotong
      </div>
    </div>
  );
}
