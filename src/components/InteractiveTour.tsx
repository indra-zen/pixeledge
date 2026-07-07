import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface InteractiveTourProps {
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    target: '#tour-render-stream',
    title: 'AREA GAMBAR',
    content: 'Ini adalah kanvas WebGPU kamu. Cubit layar (pinch) atau gunakan tombol untuk zoom dan geser gambar. Perubahan terlihat langsung secara real-time.',
    placement: 'bottom',
    color: 'bg-pink-400'
  },
  {
    target: '#tour-pipeline',
    title: 'ATUR MANUAL',
    content: 'Atur Kecerahan, Kontras, Saturasi, dan ketajaman gambar sesuka hatimu.',
    placement: 'left',
    color: 'bg-white'
  },
  {
    target: '#tour-stats',
    title: 'INFO GAMBAR',
    content: 'Pantau kecepatan render, resolusi, dan informasi lainnya tentang fotomu.',
    placement: 'top',
    color: 'bg-blue-400'
  },
  {
    target: '#tour-histogram',
    title: 'GRAFIK HISTOGRAM',
    content: 'Lihat histogram RGB dan Luma fotomu secara real-time untuk mengatur eksposur.',
    placement: 'top',
    color: 'bg-purple-400'
  },
  {
    target: '#tour-presets',
    title: 'FILTER BAWAAN',
    content: 'Filter sekali klik. Gunakan tombol panah Kiri/Kanan di keyboard untuk mengganti filter dengan cepat.',
    placement: 'top',
    color: 'bg-yellow-400'
  },
  {
    target: '#tour-actions',
    title: 'SIMPAN & EKSPOR',
    content: 'Undo/Redo (bisa juga tekan Ctrl+Z/Ctrl+Y), simpan filter buatanmu, draf offline, atau unduh hasil editanmu.',
    placement: 'bottom',
    color: 'bg-green-400'
  }
];

export function InteractiveTour({ onClose }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, [currentStep]);

  useEffect(() => {
    // Small delay to allow layout to settle
    const timeout = setTimeout(updateRect, 300);
    window.addEventListener('resize', updateRect);
    // Use true for capture phase to catch scrolls on inner elements
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect]);

  const step = TOUR_STEPS[currentStep];

  // Calculate popover position
  let popoverStyle: React.CSSProperties = {};
  if (targetRect) {
    const margin = 16;
    
    // Auto-adjust placement based on available space on mobile
    const isMobile = window.innerWidth < 1024;
    let actualPlacement = step.placement;
    
    if (isMobile) {
      // If target is in the bottom half of the screen, show popover at the top
      if (targetRect.top > window.innerHeight / 2) {
        actualPlacement = 'top';
      } else {
        actualPlacement = 'bottom';
      }
    }

    if (isMobile) {
      // Keep it attached to the element if possible, otherwise pin to screen edge
      if (actualPlacement === 'top') {
        const spaceAbove = targetRect.top;
        if (spaceAbove > 200) {
          popoverStyle = { bottom: window.innerHeight - targetRect.top + margin, left: '50%', transform: 'translateX(-50%)', position: 'fixed' };
        } else {
          popoverStyle = { top: margin, left: '50%', transform: 'translateX(-50%)', position: 'fixed', zIndex: 100 };
        }
      } else {
        const spaceBelow = window.innerHeight - targetRect.bottom;
        if (spaceBelow > 200) {
          popoverStyle = { top: targetRect.bottom + margin, left: '50%', transform: 'translateX(-50%)', position: 'fixed' };
        } else {
          popoverStyle = { bottom: margin, left: '50%', transform: 'translateX(-50%)', position: 'fixed', zIndex: 100 };
        }
      }
    } else {
      if (actualPlacement === 'left') {
        popoverStyle = { 
          top: Math.min(targetRect.top, window.innerHeight - 300), 
          right: window.innerWidth - targetRect.left + margin 
        };
      } else if (actualPlacement === 'bottom') {
        popoverStyle = { 
          top: targetRect.bottom + margin, 
          left: Math.max(margin, Math.min(targetRect.left, window.innerWidth - 320 - margin)) 
        };
      } else if (actualPlacement === 'top') {
        popoverStyle = { 
          bottom: window.innerHeight - targetRect.top + margin, 
          left: Math.max(margin, Math.min(targetRect.left, window.innerWidth - 320 - margin)) 
        };
      } else if (actualPlacement === 'right') {
        popoverStyle = {
          top: Math.min(targetRect.top, window.innerHeight - 300),
          left: targetRect.right + margin
        };
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop with cutout */}
      {targetRect && (
        <div 
          className="absolute inset-0 bg-black/70 transition-all duration-300"
          style={{
            clipPath: `polygon(
              0% 0%, 0% 100%, 
              ${targetRect.left - 8}px 100%, 
              ${targetRect.left - 8}px ${targetRect.top - 8}px, 
              ${targetRect.right + 8}px ${targetRect.top - 8}px, 
              ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
              ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
              ${targetRect.left - 8}px 100%, 
              100% 100%, 100% 0%
            )`
          }}
        />
      )}

      {/* Popover */}
      {targetRect && (
        <div 
          className={`absolute ${step.color} border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-6 flex flex-col font-mono w-[320px] max-w-[calc(100vw-32px)] pointer-events-auto transition-all duration-300`}
          style={popoverStyle}
        >
          <div className="flex justify-between items-start mb-4 border-b-4 border-black pb-2">
            <h3 className="font-black text-xl uppercase leading-tight pr-4">{step.title}</h3>
            <button onClick={onClose} className="hover:scale-110 transition-transform"><X strokeWidth={3} /></button>
          </div>
          
          <p className="font-bold text-sm sm:text-base mb-6 leading-relaxed">
            {step.content}
          </p>
          
          <div className="flex justify-between items-center mt-auto">
            <span className="font-bold text-xs bg-black text-white px-2 py-1">
              {currentStep + 1} / {TOUR_STEPS.length}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="p-2 border-2 border-black bg-white hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
              >
                <ChevronLeft size={20} strokeWidth={3} />
              </button>
              <button 
                onClick={() => {
                  if (currentStep === TOUR_STEPS.length - 1) onClose();
                  else setCurrentStep(prev => prev + 1);
                }}
                className="px-4 py-2 border-2 border-black bg-white hover:bg-gray-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none font-bold uppercase flex items-center gap-1"
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'SELESAI' : 'LANJUT'} <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
