import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Camera, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import { db } from '../lib/db';

interface CameraViewProps {
  onCapture: (imageSource: HTMLImageElement | HTMLCanvasElement) => void;
  onSelectDraft: () => void;
}

export function CameraView({ onCapture, onSelectDraft }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCamRef = useRef<HTMLInputElement>(null);
  const isMobile = useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);

  useEffect(() => {
    if (!isMobile) {
      startCamera();
    }
    return () => stopCamera();
  }, [facingMode, isMobile]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser or context (requires HTTPS).");
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError(String(err));
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        onCapture(canvas);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => onCapture(img);
      img.src = URL.createObjectURL(file);
    }
  };

  return (
    <div className="bg-[#FFE600] w-full h-full flex flex-col p-2 sm:p-6 font-mono overflow-hidden text-black select-none">
      <header className="flex justify-between items-center mb-4 sm:mb-6 bg-white border-[4px] border-black p-3 sm:p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-black text-white px-2 sm:px-3 py-1 font-black text-lg sm:text-2xl uppercase">PixelEdge</div>
        </div>
        <div className="flex gap-2 sm:gap-4">
          <button 
            onClick={onSelectDraft}
            className="bg-white border-2 border-black px-2 sm:px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2"
          >
            <ImageIcon size={20} />
            <span className="hidden md:inline">DRAFTS</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-pink-400 border-2 border-black px-2 sm:px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2"
          >
            <Upload size={20} />
            <span className="hidden md:inline">UPLOAD</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
          />
          <input 
            type="file" 
            ref={nativeCamRef} 
            className="hidden" 
            accept="image/*" 
            capture="environment"
            onChange={handleFileUpload} 
          />
        </div>
      </header>
      
      <main className="flex-1 grid grid-cols-1 gap-4 sm:gap-6 min-h-0 relative">
        <section className="col-span-1 bg-black border-[4px] border-black relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex items-center justify-center group">
          <div className="absolute top-4 left-4 z-10 bg-white border-2 border-black px-2 py-1 text-[10px] sm:text-xs font-bold uppercase">Camera</div>
          {isMobile ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-6 text-center">
              <Camera size={64} className="text-cyan-400 mb-8" />
              <button 
                onClick={() => nativeCamRef.current?.click()}
                className="bg-cyan-400 border-[4px] border-black px-8 py-4 font-black uppercase text-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-pink-400 transition-all text-black mb-4"
              >
                OPEN CAMERA
              </button>
              <p className="text-white/60 text-sm font-bold max-w-xs mt-4">Using native camera for better quality on mobile devices.</p>
            </div>
          ) : !stream && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
              <Camera size={48} className="text-white mb-4 opacity-50" />
              {cameraError ? (
                <>
                  <p className="text-red-400 font-bold mb-4">{cameraError}</p>
                  <button 
                    onClick={startCamera}
                    className="bg-white border-[4px] border-black px-6 py-3 font-black uppercase text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-pink-400 transition-all text-black"
                  >
                    Allow Camera Access
                  </button>
                </>
              ) : (
                <button 
                  onClick={startCamera}
                  className="bg-cyan-400 border-[4px] border-black px-6 py-3 font-black uppercase text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-pink-400 transition-all text-black"
                >
                  Start Camera
                </button>
              )}
            </div>
          )}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover sm:object-contain relative z-10"
          />
          
          <div className="absolute bottom-4 right-4 text-green-400 font-mono text-[10px] sm:text-sm z-20 bg-black/50 px-2 py-1 hidden sm:block">
            {facingMode.toUpperCase()} CAM ACTIVE
          </div>

          {!isMobile && (
            <>
              <div className="absolute bottom-6 sm:bottom-12 left-0 right-0 flex justify-center z-20">
                <button 
                  onClick={handleCapture}
                  className="bg-white border-[6px] border-black rounded-full w-20 h-20 sm:w-24 sm:h-24 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all flex items-center justify-center group-hover:bg-cyan-400"
                >
                  <div className="bg-black w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-transform group-hover:scale-110"></div>
                </button>
              </div>
              
              <button 
                onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                className="absolute top-4 right-4 z-20 bg-white border-[4px] border-black p-3 sm:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-pink-400"
              >
                <RefreshCw size={24} className="sm:w-8 sm:h-8" />
              </button>
            </>
          )}
        </section>
      </main>

      <footer className="mt-2 sm:mt-4 flex flex-col sm:flex-row justify-between text-[10px] font-bold uppercase shrink-0 gap-1 opacity-80">
        <span>PixelEdge</span>
        <span>© 2026 NEO-BRUTALIST IMAGING SYSTEMS</span>
      </footer>
    </div>
  );
}
