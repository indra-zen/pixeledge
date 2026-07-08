import React, { useState, useRef, useEffect } from 'react';
import { CameraView } from './components/CameraView';
import { EditorView } from './components/EditorView';
import { InteractiveTour } from './components/InteractiveTour';
import { InstallWall } from './components/InstallWall';
import { AppView, Draft } from './types';
import { db } from './lib/db';
import { Loader2, X, HelpCircle } from 'lucide-react';
import CvWorker from './lib/cv.worker?worker';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('CAMERA');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new CvWorker();
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ view: 'CAMERA', drafts: false }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state) {
        if (state.view) setCurrentView(state.view);
        setShowDrafts(!!state.drafts);
      } else {
        setCurrentView('CAMERA');
        setShowDrafts(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleCapture = async (imageSource: HTMLImageElement | HTMLCanvasElement) => {
    setCurrentView('PROCESSING');
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const canvas = document.createElement('canvas');
      if (imageSource instanceof HTMLImageElement) {
        canvas.width = imageSource.naturalWidth || imageSource.width;
        canvas.height = imageSource.naturalHeight || imageSource.height;
      } else {
        canvas.width = imageSource.width;
        canvas.height = imageSource.height;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
      const inputImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (!workerRef.current) {
        throw new Error("Worker not initialized");
      }

      const id = Date.now().toString();
      
      const processed = await new Promise<ImageData>((resolve, reject) => {
        const handler = (e: MessageEvent) => {
          if (e.data.id === id) {
            workerRef.current?.removeEventListener('message', handler);
            if (e.data.success) {
              resolve(e.data.processed);
            } else {
              reject(new Error(e.data.error));
            }
          }
        };
        workerRef.current?.addEventListener('message', handler);
        workerRef.current?.postMessage(
          { id, imageData: inputImageData, type: 'denoise' },
          [inputImageData.data.buffer]
        );
      });

      setImageData(processed);
      setCurrentView('EDITOR');
      window.history.pushState({ view: 'EDITOR', drafts: false }, '');
    } catch (err) {
      console.error("Error processing image:", err);
      alert("Error: " + err);
      setCurrentView('CAMERA');
    }
  };

  const startDemoTour = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFE600';
      ctx.fillRect(0, 0, 800, 600);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      for(let i=0; i<800; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 600); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
      }

      ctx.fillStyle = '#FF00FF';
      ctx.beginPath();
      ctx.arc(400, 300, 150, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000';
      ctx.font = '900 60px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PIXEL', 400, 290);
      ctx.fillText('EDGE', 400, 360);
      
      const imgData = ctx.getImageData(0, 0, 800, 600);
      setImageData(imgData);
      setCurrentView('EDITOR');
      setShowTutorial(true);
      window.history.pushState({ view: 'EDITOR', drafts: false }, '');
    }
  };

  const handleSelectDraft = async () => {
    const loadedDrafts = await db.getDrafts();
    setDrafts(loadedDrafts);
    setShowDrafts(true);
    window.history.pushState({ view: 'CAMERA', drafts: true }, '');
  };

  const openDraft = (blob: Blob) => {
    setShowDrafts(false);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setImageData(imgData);
      setCurrentView('EDITOR');
      window.history.pushState({ view: 'EDITOR', drafts: false }, '');
    };
    img.src = URL.createObjectURL(blob);
  };

  return (
    <div className="w-full h-full bg-[#FFE600] overflow-hidden font-mono select-none text-black">
      {currentView === 'CAMERA' && (
        <CameraView onCapture={handleCapture} onSelectDraft={handleSelectDraft} />
      )}
      
      {currentView === 'PROCESSING' && (
        <div className="flex flex-col items-center justify-center h-full bg-pink-400 border-8 border-black font-black uppercase text-2xl tracking-widest gap-6 p-6">
          <Loader2 className="w-16 h-16 animate-spin drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" />
          <div className="bg-white px-8 py-4 border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center animate-pulse">
            SEDANG MEMPROSES...
          </div>
          <div className="text-sm tracking-normal font-bold text-center">Memoles fotomu...</div>
        </div>
      )}
      
      {currentView === 'EDITOR' && imageData && (
        <EditorView imageData={imageData} onBack={() => window.history.back()} />
      )}

      {/* Drafts Modal */}
      {showDrafts && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm">
          <div className="bg-green-400 w-full max-w-4xl h-[80vh] border-[4px] border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col font-mono">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b-[4px] border-black bg-white shrink-0">
              <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider">DRAF TERSIMPAN</h2>
              <button 
                onClick={() => window.history.back()}
                className="p-2 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-gray-200"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] [background-size:20px_20px]">
              {drafts.length === 0 ? (
                <div className="col-span-full flex items-center justify-center font-bold uppercase p-8 bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-48">
                  BELUM ADA FOTO TERSIMPAN.
                </div>
              ) : (
                drafts.map(draft => (
                  <button 
                    key={draft.id} 
                    onClick={() => openDraft(draft.imageBlob)}
                    className="aspect-square bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden flex flex-col group p-2"
                  >
                    <div className="flex-1 w-full bg-zinc-200 border-2 border-black overflow-hidden relative">
                      <img 
                        src={URL.createObjectURL(draft.imageBlob)} 
                        alt="Draft" 
                        className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300" 
                      />
                      <div className="absolute inset-0 bg-pink-500/20 mix-blend-color-burn group-hover:opacity-0 transition-opacity"></div>
                    </div>
                    <div className="mt-2 text-[10px] sm:text-xs font-black uppercase truncate w-full text-left">
                      DRAFT_{draft.id.toString().padStart(4, '0')}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && <InteractiveTour onClose={() => setShowTutorial(false)} />}

      {/* Floating Help Button */}
      {!showTutorial && currentView === 'EDITOR' && (
        <button 
          onClick={() => setShowTutorial(true)}
          className={`fixed right-4 z-10 p-3 bg-cyan-400 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-full flex items-center justify-center active:bg-cyan-500 group bottom-24 lg:bottom-4`}
        >
          <HelpCircle size={28} className="text-black group-hover:scale-110 transition-transform" />
        </button>
      )}
      
      {/* Install Wall for Mobile */}
      <InstallWall />
    </div>
  );
}
