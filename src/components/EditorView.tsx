import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WebGLFilterEngine } from '../lib/webgl';
import { FilterSettings, CustomFilter } from '../types';
import { Download, Save, Share2, ChevronLeft, Image as ImageIcon, SlidersHorizontal, Activity, X, Trash2, BarChart2, Crop, Undo, Redo, Sun, Contrast, Droplet, Palette, Thermometer, Focus, Droplets, Aperture, Sparkles } from 'lucide-react';
import { db } from '../lib/db';
import { calculateHistogram } from '../lib/imageUtils';
import { HistogramPanel, HistogramData } from './HistogramPanel';
import { CropOverlay } from './CropOverlay';

import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { vibrate } from '../lib/utils';
import { Slider } from './Slider';
import { BUILT_IN_FILTERS, getFilterCSS } from '../lib/filters';

interface EditorViewProps {
  imageData: ImageData;
  onBack: () => void;
}



type DrawerType = 'PRESETS' | 'ADJUST' | 'STATS' | 'HISTOGRAM' | null;

const isSettingsEqual = (a: FilterSettings, b: FilterSettings) => {
  return Math.abs(a.brightness - b.brightness) < 0.001 &&
         Math.abs(a.contrast - b.contrast) < 0.001 &&
         Math.abs(a.saturation - b.saturation) < 0.001 &&
         Math.abs(a.hue - b.hue) < 0.001 &&
         Math.abs(a.sharpness - b.sharpness) < 0.001 &&
         Math.abs((a.temperature || 0) - (b.temperature || 0)) < 0.001 &&
         Math.abs((a.vignette || 0) - (b.vignette || 0)) < 0.001 &&
         Math.abs((a.grain || 0) - (b.grain || 0)) < 0.001 &&
         Math.abs((a.blur || 0) - (b.blur || 0)) < 0.001;
};

export function EditorView({ imageData, onBack }: EditorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLFilterEngine | null>(null);
  
  const [baseImageHistory, setBaseImageHistory] = useState<ImageData[]>([imageData]);
  const [isCropping, setIsCropping] = useState(false);
  
  const [settingsHistory, setSettingsHistory] = useState<FilterSettings[]>([BUILT_IN_FILTERS[0].settings]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);
  
  const [settings, setSettings] = useState<FilterSettings>(BUILT_IN_FILTERS[0].settings);
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>('PRESETS');

  const handleToggleDrawer = (drawer: DrawerType) => {
    vibrate(10);
    setActiveDrawer(activeDrawer === drawer ? null : drawer);
  };

  const handleSelectPreset = (newSettings: FilterSettings) => {
    vibrate(10);
    setSettings(newSettings);
  };
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  
  const [renderTime, setRenderTime] = useState(0);
  const [histogram, setHistogram] = useState<HistogramData | null>(null);

  // Get current base image from history
  const currentBaseImage = baseImageHistory[baseImageHistory.length - 1];

  const isPortrait = currentBaseImage.height > currentBaseImage.width;
  const desktopThumbClass = isPortrait ? "w-24 h-32" : "w-32 h-24";
  const mobileThumbClass = isPortrait ? "aspect-[3/4]" : "aspect-[4/3]";

  useEffect(() => {
    const timeout = setTimeout(() => {
      const scale = Math.min(400 / currentBaseImage.width, 400 / currentBaseImage.height);
      const w = Math.floor(currentBaseImage.width * scale) || 1;
      const h = Math.floor(currentBaseImage.height * scale) || 1;
      
      const thumbCanvas2d = document.createElement('canvas');
      thumbCanvas2d.width = w;
      thumbCanvas2d.height = h;
      const ctx = thumbCanvas2d.getContext('2d');
      if (!ctx) return;
      
      const offCanvas = document.createElement('canvas');
      offCanvas.width = currentBaseImage.width;
      offCanvas.height = currentBaseImage.height;
      offCanvas.getContext('2d')?.putImageData(currentBaseImage, 0, 0);
      ctx.drawImage(offCanvas, 0, 0, w, h);
      
      setThumbnailUrl(thumbCanvas2d.toDataURL('image/jpeg', 0.8));
    }, 100);
    return () => clearTimeout(timeout);
  }, [currentBaseImage]);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', check);
    loadCustomFilters();
    return () => window.removeEventListener('resize', check);
  }, []);

  const loadCustomFilters = async () => {
    const filters = await db.getCustomFilters();
    setCustomFilters(filters);
  };

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new WebGLFilterEngine(canvasRef.current);
      canvasRef.current.width = imageData.width;
      canvasRef.current.height = imageData.height;
      engineRef.current.setImage(imageData);
    }
  }, [imageData]);

  useEffect(() => {
    if (engineRef.current) {
      const start = performance.now();
      engineRef.current.render(settings);
      setRenderTime(performance.now() - start);
    }
  }, [settings]);

  useEffect(() => {
    let cancel = false;
    
    const timeout = setTimeout(() => {
      // Only calculate if the histogram panel is likely to be visible
      if (!isDesktop && activeDrawer !== 'HISTOGRAM' && activeDrawer !== 'STATS') {
        return;
      }
      if (engineRef.current) {
        const imgData = engineRef.current.getImageData();
        if (imgData) {
          calculateHistogram(imgData).then(hist => {
            if (!cancel) {
              setHistogram(hist);
            }
          }).catch(err => {
            console.error('Histogram error:', err);
          });
        }
      }
    }, 300);
    
    return () => {
      cancel = true;
      clearTimeout(timeout);
    };
  }, [settings, isDesktop, activeDrawer]);

  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      setSettingsHistory(prev => {
        const history = prev.slice(0, historyIndex + 1);
        if (JSON.stringify(history[history.length - 1]) !== JSON.stringify(settings)) {
          setHistoryIndex(history.length);
          return [...history, settings];
        }
        return prev;
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [settings, historyIndex]);

  const handleSliderChange = useCallback((value: number, key?: string) => {
    if (!key) return;
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCrop = (cropBox: { x: number; y: number; width: number; height: number }) => {
    if (!engineRef.current) return;
    const currentImageData = engineRef.current.getImageData();
    if (!currentImageData) return;
    
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;
    
    // Original dimensions
    const origW = currentImageData.width;
    const origH = currentImageData.height;
    
    // Pixel coordinates
    const px = Math.floor(cropBox.x * origW);
    const py = Math.floor(cropBox.y * origH);
    const pw = Math.floor(cropBox.width * origW);
    const ph = Math.floor(cropBox.height * origH);
    
    if (pw === 0 || ph === 0) {
      setIsCropping(false);
      return;
    }
    
    cropCanvas.width = pw;
    cropCanvas.height = ph;
    
    const offCanvas = document.createElement('canvas');
    offCanvas.width = origW;
    offCanvas.height = origH;
    offCanvas.getContext('2d')?.putImageData(currentImageData, 0, 0);
    
    cropCtx.drawImage(offCanvas, px, py, pw, ph, 0, 0, pw, ph);
    const croppedImageData = cropCtx.getImageData(0, 0, pw, ph);
    
    setBaseImageHistory(prev => [...prev, croppedImageData]);
    
    if (canvasRef.current) {
      canvasRef.current.width = pw;
      canvasRef.current.height = ph;
    }
    
    engineRef.current.setImage(croppedImageData);
    const defaultSettings = { ...BUILT_IN_FILTERS[0].settings };
    setSettings(defaultSettings);
    setSettingsHistory([defaultSettings]);
    setHistoryIndex(0);
    engineRef.current.render(defaultSettings);
    
    setIsCropping(false);
    setToastMessage('Crop berhasil!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      vibrate(10);
      isUndoRedoRef.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSettings(settingsHistory[newIndex]);
    }
  }, [historyIndex, settingsHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex < settingsHistory.length - 1) {
      vibrate(10);
      isUndoRedoRef.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSettings(settingsHistory[newIndex]);
    }
  }, [historyIndex, settingsHistory]);

  const handlePrevFilter = useCallback(() => {
    const allFilters = [...BUILT_IN_FILTERS, ...customFilters];
    const currentIndex = allFilters.findIndex(f => isSettingsEqual(settings, f.settings));
    if (currentIndex > 0) {
      setSettings(allFilters[currentIndex - 1].settings);
    } else if (currentIndex === -1) {
      setSettings(allFilters[0].settings);
    }
  }, [settings, customFilters]);

  const handleNextFilter = useCallback(() => {
    const allFilters = [...BUILT_IN_FILTERS, ...customFilters];
    const currentIndex = allFilters.findIndex(f => isSettingsEqual(settings, f.settings));
    if (currentIndex !== -1 && currentIndex < allFilters.length - 1) {
      setSettings(allFilters[currentIndex + 1].settings);
    } else if (currentIndex === -1) {
      setSettings(allFilters[0].settings);
    }
  }, [settings, customFilters]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevFilter();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextFilter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handlePrevFilter, handleNextFilter]);

  const handleSaveDraft = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (blob) {
        await db.saveDraft(blob);
        setToastMessage('Tersimpan di draf!');
        setTimeout(() => setToastMessage(null), 3000);
      }
    });
  };

  const handleSaveCustomFilter = async () => {
    if (presetName.trim()) {
      await db.saveCustomFilter(presetName.trim(), settings);
      loadCustomFilters();
      setSaveModalOpen(false);
      setPresetName('');
      setToastMessage('Filter tersimpan!');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleDeleteCustomFilter = async (id: number) => {
    await db.deleteCustomFilter(id);
    loadCustomFilters();
    setToastMessage('Filter dihapus!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownload = (format: 'png' | 'jpeg' | 'webp') => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL(`image/${format}`, 0.9);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photo_export.${format}`;
    a.click();
    setShowDownloadMenu(false);
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (blob && navigator.share) {
        const file = new File([blob], 'image.png', { type: 'image/png' });
        try {
          await navigator.share({
            files: [file],
            title: 'Fotoku',
            text: 'Lihat foto keren yang kubuat ini!',
          });
        } catch (err) {
          console.error('Error sharing', err);
        }
      }
    });
  };

  return (
    <div className="bg-[#FFE600] w-full h-full flex flex-col font-mono text-black select-none relative overflow-hidden lg:p-6">
      
      {/* Top Header */}
      <header className="flex justify-between items-center bg-white border-b-[4px] border-black p-3 shadow-[0_4px_0_0_rgba(0,0,0,1)] shrink-0 z-40 relative lg:mb-6 lg:border-[4px] lg:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <button onClick={onBack} className="bg-black text-white px-2 py-1 font-black sm:text-xl flex items-center hover:bg-zinc-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
           <ChevronLeft size={24} /> <span className="hidden sm:inline">KEMBALI</span>
        </button>
        <div className="flex gap-2 h-full items-stretch" id="tour-actions">
          <div className="relative flex">
            {baseImageHistory.length > 1 && (
              <button onClick={() => {
                const newHistory = [...baseImageHistory];
                newHistory.pop();
                setBaseImageHistory(newHistory);
                const prevImage = newHistory[newHistory.length - 1];
                if (canvasRef.current) {
                  canvasRef.current.width = prevImage.width;
                  canvasRef.current.height = prevImage.height;
                }
                if (engineRef.current) {
                  engineRef.current.setImage(prevImage);
                  engineRef.current.render(settings);
                }
              }} className="bg-orange-400 border-[3px] border-black px-2 sm:px-3 py-1 sm:py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 mr-2" title="Undo Crop">
                 <Undo size={18} />
              </button>
            )}
            <button onClick={() => { vibrate(10); setIsCropping(!isCropping); }} className={`border-[3px] border-black px-2 sm:px-3 py-1 sm:py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 mr-2 ${isCropping ? 'bg-blue-300 translate-x-[2px] translate-y-[2px] shadow-none' : 'bg-blue-400'}`}>
               <Crop size={18} /> <span className="hidden sm:inline uppercase">Potong</span>
            </button>
            <button onClick={() => { vibrate(10); setShowDownloadMenu(!showDownloadMenu); }} className="bg-green-400 border-[3px] border-black px-2 sm:px-3 py-1 sm:py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2">
               <Download size={18} /> <span className="hidden sm:inline uppercase">Ekspor</span>
            </button>
            {showDownloadMenu && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-40 sm:w-48 bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col z-50">
                <button onClick={() => handleDownload('png')} className="px-4 py-2 sm:py-3 font-black hover:bg-green-200 border-b-[4px] border-black text-left uppercase text-sm">Simpan PNG</button>
                <button onClick={() => handleDownload('jpeg')} className="px-4 py-2 sm:py-3 font-black hover:bg-green-200 border-b-[4px] border-black text-left uppercase text-sm">Simpan JPG</button>
                <button onClick={handleShare} className="px-4 py-2 sm:py-3 font-black hover:bg-pink-200 text-left uppercase text-sm flex items-center justify-between">Bagikan <Share2 size={16}/></button>
              </div>
            )}
          </div>
          <button onClick={handleSaveDraft} className="bg-yellow-400 border-[3px] border-black px-2 sm:px-3 py-1 sm:py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2">
            <Save size={18} /> <span className="hidden sm:inline uppercase">Simpan Draf</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Area & Desktop Grid */}
      <main className="flex-1 relative flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-6 lg:gap-6 min-h-0 overflow-hidden">
        
        {/* Canvas Section */}
        <section id="tour-render-stream" className="flex-1 lg:col-span-8 lg:row-span-4 bg-black lg:border-[4px] lg:border-black lg:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex items-center justify-center overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(circle,_#333_1px,_transparent_1px)] [background-size:20px_20px] p-4 pb-20 sm:pb-24 lg:pb-4 lg:p-8">
            <TransformWrapper
              disabled={isCropping}
              initialScale={1}
              minScale={0.1}
              maxScale={8}
              centerOnInit={true}
              wheel={{ step: 0.1 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <React.Fragment>
                  <div className="absolute top-4 left-4 z-20 flex gap-2">
                    <button onClick={() => zoomIn()} className="bg-white/80 p-2 border-2 border-black hover:bg-white text-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none leading-none w-8 h-8 flex items-center justify-center" title="Zoom In">+</button>
                    <button onClick={() => zoomOut()} className="bg-white/80 p-2 border-2 border-black hover:bg-white text-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none leading-none w-8 h-8 flex items-center justify-center" title="Zoom Out">-</button>
                    <button onClick={() => resetTransform()} className="bg-white/80 px-2 py-1 border-2 border-black hover:bg-white text-black font-black text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none leading-none h-8 flex items-center justify-center uppercase" title="Reset Zoom">Fit</button>
                  </div>
                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div 
                      className="max-w-full max-h-full h-full border-4 border-black lg:border-2 lg:border-white/20 relative flex items-center justify-center bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] lg:shadow-none"
                      style={{ aspectRatio: `${currentBaseImage.width} / ${currentBaseImage.height}` }}
                    >
                      <canvas 
                        ref={canvasRef} 
                        className="w-full h-full object-contain relative z-10"
                      />
                      {isCropping && <CropOverlay onCrop={handleCrop} onCancel={() => setIsCropping(false)} />}
                    </div>
                  </TransformComponent>
                </React.Fragment>
              )}
            </TransformWrapper>
          </div>
        </section>

        {/* Desktop: Custom Pipeline */}
        <section id={isDesktop ? "tour-pipeline" : undefined} className="hidden lg:flex lg:col-span-4 lg:row-span-4 bg-white border-[4px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-col shrink-0">
          <h2 className="font-black text-xl mb-4 border-b-2 border-black pb-2 uppercase">Pengaturan</h2>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-12 no-scrollbar">
            <Slider icon={Sun} label="KECERAHAN" value={settings.brightness} defaultValue={0} min={-1} max={1} step={0.01} name="brightness" onChange={handleSliderChange} />
            <Slider icon={Contrast} label="KONTRAS" value={settings.contrast} defaultValue={1} min={0} max={3} step={0.01} name="contrast" onChange={handleSliderChange} />
            <Slider icon={Droplet} label="SATURASI" value={settings.saturation} defaultValue={1} min={0} max={3} step={0.01} name="saturation" onChange={handleSliderChange} />
            <Slider icon={Palette} label="WARNA (HUE)" value={settings.hue} defaultValue={0} min={-1} max={1} step={0.01} name="hue" onChange={handleSliderChange} />
            <Slider icon={Thermometer} label="SUHU" value={settings.temperature || 0} defaultValue={0} min={-1} max={1} step={0.01} name="temperature" onChange={handleSliderChange} />
            <Slider icon={Focus} label="KETAJAMAN" value={settings.sharpness} defaultValue={0} min={-1} max={5} step={0.1} name="sharpness" onChange={handleSliderChange} />
            <Slider icon={Droplets} label="BLUR" value={settings.blur || 0} defaultValue={0} min={0} max={1} step={0.01} name="blur" onChange={handleSliderChange} />
            <Slider icon={Aperture} label="VIGNETTE" value={settings.vignette || 0} defaultValue={0} min={0} max={1} step={0.01} name="vignette" onChange={handleSliderChange} />
            <Slider icon={Sparkles} label="GRAIN" value={settings.grain || 0} defaultValue={0} min={0} max={1} step={0.01} name="grain" onChange={handleSliderChange} />
          </div>
          <div className="mt-4 flex flex-col gap-2 shrink-0">
            <div className="flex gap-2">
              <button onClick={handleUndo} disabled={historyIndex <= 0} className="flex-1 bg-yellow-400 text-black border-2 border-black py-2 font-bold hover:bg-yellow-500 transition-colors uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"><Undo size={16} />UNDO</button>
              <button onClick={handleRedo} disabled={historyIndex >= settingsHistory.length - 1} className="flex-1 bg-yellow-400 text-black border-2 border-black py-2 font-bold hover:bg-yellow-500 transition-colors uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"><Redo size={16} />REDO</button>
            </div>
            <button onClick={() => setSaveModalOpen(true)} className="w-full bg-black text-white py-3 font-bold hover:bg-zinc-800 transition-colors uppercase border-2 border-transparent hover:border-black active:translate-y-[2px] shrink-0 flex items-center justify-center gap-2"><Save size={18} />SIMPAN JADI FILTER BARU</button>
          </div>
        </section>

        {/* Desktop: Stats */}
        <section id={isDesktop ? "tour-stats" : undefined} className="hidden lg:flex lg:col-span-3 lg:row-span-2 bg-blue-400 border-[4px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-col shrink-0 min-h-0">
          <h2 className="font-black text-lg mb-4 uppercase">INFO</h2>
          <div className="flex-1 flex flex-col justify-end">
            <div className="text-[10px] space-y-1.5 font-bold bg-white/50 p-2 border-2 border-black">
              <div className="flex justify-between gap-2 border-b border-black/10 pb-1"><span className="shrink-0 text-black/60">RENDER:</span><span className="text-right truncate">{renderTime.toFixed(2)}ms</span></div>
              <div className="flex justify-between gap-2 border-b border-black/10 pb-1"><span className="shrink-0 text-black/60">RESOLUSI:</span><span className="text-right truncate">{currentBaseImage.width}x{currentBaseImage.height}</span></div>
              <div className="flex justify-between gap-2 border-b border-black/10 pb-1"><span className="shrink-0 text-black/60">RASIO:</span><span className="text-right truncate">{(currentBaseImage.width/currentBaseImage.height).toFixed(2)}:1</span></div>
              <div className="flex justify-between gap-2 border-b border-black/10 pb-1"><span className="shrink-0 text-black/60">PIKSEL:</span><span className="text-right truncate">{(currentBaseImage.width * currentBaseImage.height).toLocaleString()}</span></div>
              {histogram?.stats && (
                <>
                  <div className="flex justify-between gap-2 border-b border-black/10 pb-1"><span className="shrink-0 text-black/60">LUMA AVG:</span><span className="text-right truncate">{histogram.stats.meanLuminance.toFixed(1)}</span></div>
                  <div className="flex justify-between gap-2 border-b border-black/10 pb-1"><span className="shrink-0 text-black/60">KONTRAS:</span><span className="text-right truncate">{histogram.stats.contrast.toFixed(1)}</span></div>
                  <div className="flex justify-between gap-2 border-b border-black/10 pb-1"><span className="shrink-0 text-black/60">RGB AVG:</span><span className="text-right truncate">{Math.round(histogram.stats.avgR)}, {Math.round(histogram.stats.avgG)}, {Math.round(histogram.stats.avgB)}</span></div>
                </>
              )}
              <div className="flex justify-between gap-2"><span className="shrink-0 text-black/60">WARNA:</span><span className="text-right truncate">RGBA</span></div>
            </div>
          </div>
        </section>

        {/* Desktop: Histogram */}
        <section id={isDesktop ? "tour-histogram" : undefined} className="hidden lg:flex lg:col-span-3 lg:row-span-2 bg-purple-400 border-[4px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-col shrink-0 min-h-0">
          <h2 className="font-black text-lg mb-4 uppercase">GRAFIK</h2>
          <div className="bg-[#1a1a1a] border-[3px] border-black p-0 h-full flex flex-col min-h-0">
            <HistogramPanel data={histogram} />
          </div>
        </section>

        {/* Desktop: Built-in Filters */}
        <section id={isDesktop ? "tour-presets" : undefined} className="hidden lg:flex lg:col-span-6 lg:row-span-2 bg-white border-[4px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-col shrink-0 min-h-0">
          <h3 className="font-bold text-sm mb-2 uppercase">FILTER</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 flex-1 items-center no-scrollbar">
            {BUILT_IN_FILTERS.map((f, i) => {
              const isActive = isSettingsEqual(settings, f.settings);
              return (
              <button 
                key={i}
                onClick={() => handleSelectPreset(f.settings)}
                className={`relative flex-shrink-0 ${desktopThumbClass} border-[3px] border-black flex flex-col justify-end hover:brightness-95 transition-all text-left group active:bg-zinc-300 overflow-hidden ${isActive ? 'translate-x-[2px] translate-y-[2px] shadow-none outline outline-4 outline-offset-2 outline-black bg-zinc-300' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-white'}`}
              >
                {thumbnailUrl && (
                  <div className="absolute inset-0 z-0 bg-cover bg-center opacity-100" 
                       style={{ backgroundImage: `url(${thumbnailUrl})`, filter: getFilterCSS(f.settings) }} />
                )}
                <span className="relative z-10 text-xs font-black uppercase truncate w-full px-2 bg-white/80 py-1 border-t-[3px] border-black">
                  {i < 9 ? `0${i+1}` : i+1} {f.name}
                </span>
              </button>
            )})}
            {customFilters.map((f, i) => {
              const isActive = isSettingsEqual(settings, f.settings);
              return (
              <div key={'custom_desk_'+i} className={`relative flex-shrink-0 ${desktopThumbClass}`}>
                <button 
                  onClick={() => handleSelectPreset(f.settings)}
                  className={`w-full h-full border-[3px] border-black border-dashed flex flex-col justify-end transition-all text-left group overflow-hidden ${isActive ? 'translate-x-[2px] translate-y-[2px] shadow-none outline outline-4 outline-offset-2 outline-black bg-cyan-300' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-cyan-100'}`}
                >
                  {thumbnailUrl && (
                    <div className="absolute inset-0 z-0 bg-cover bg-center opacity-100" 
                         style={{ backgroundImage: `url(${thumbnailUrl})`, filter: getFilterCSS(f.settings) }} />
                  )}
                  <span className="relative z-10 text-xs font-black uppercase truncate w-full px-2 bg-cyan-300/80 py-1 border-t-[3px] border-black pr-6">★ {f.name}</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteCustomFilter(f.id!); }}
                  className="absolute top-1 right-1 z-20 p-1 bg-red-500 text-white border-2 border-black hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none"
                  title="Hapus filter"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )})}
          </div>
        </section>

      </main>

      {/* Mobile: Drawer Overlay */}
      <div 
        className={`lg:hidden absolute bottom-[72px] sm:bottom-[88px] left-0 right-0 bg-white border-t-[4px] border-black transition-transform duration-300 z-20 flex flex-col shadow-[0_-8px_0_0_rgba(0,0,0,1)]
        ${activeDrawer ? 'translate-y-0' : 'translate-y-[120%]'} 
        h-[45vh] sm:h-[50vh]`}
      >
        <div className="flex justify-between items-center p-2 sm:p-3 border-b-[4px] border-black bg-white">
          <h3 className="font-black uppercase text-sm sm:text-base ml-2">
            {activeDrawer === 'PRESETS' ? 'Filter' : activeDrawer === 'ADJUST' ? 'Atur' : 'Info Render'}
          </h3>
          <button onClick={() => { vibrate(10); setActiveDrawer(null); }} className="p-1 hover:bg-gray-200 border-2 border-transparent hover:border-black transition-colors"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {activeDrawer === 'PRESETS' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
              {BUILT_IN_FILTERS.map((f, i) => {
                const isActive = isSettingsEqual(settings, f.settings);
                return (
                <button 
                  key={i}
                  onClick={() => handleSelectPreset(f.settings)}
                  className={`relative ${mobileThumbClass} border-[3px] border-black flex items-center justify-center hover:brightness-95 transition-all text-center group active:bg-zinc-300 overflow-hidden ${isActive ? 'translate-x-[2px] translate-y-[2px] shadow-none outline outline-4 outline-offset-2 outline-black bg-zinc-300' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-white'}`}
                >
                  {thumbnailUrl && (
                    <div className="absolute inset-0 z-0 bg-cover bg-center opacity-100" 
                         style={{ backgroundImage: `url(${thumbnailUrl})`, filter: getFilterCSS(f.settings) }} />
                  )}
                  <span className="relative z-10 text-xs sm:text-sm font-black uppercase truncate w-full px-2 bg-white/80 py-0.5 border-y-2 border-black">
                    {f.name}
                  </span>
                </button>
              )})}
              {customFilters.map((f, i) => {
                const isActive = isSettingsEqual(settings, f.settings);
                return (
                <div key={'custom_'+i} className={`relative ${mobileThumbClass}`}>
                  <button 
                    onClick={() => handleSelectPreset(f.settings)}
                    className={`w-full h-full border-[3px] border-black flex items-center justify-center transition-all text-center group overflow-hidden ${isActive ? 'translate-x-[2px] translate-y-[2px] shadow-none outline outline-4 outline-offset-2 outline-black bg-cyan-300' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-cyan-100'}`}
                  >
                    {thumbnailUrl && (
                      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-100" 
                           style={{ backgroundImage: `url(${thumbnailUrl})`, filter: getFilterCSS(f.settings) }} />
                    )}
                    <span className="relative z-10 text-xs sm:text-sm font-black uppercase truncate w-full px-2 bg-cyan-300/80 py-0.5 border-y-2 border-black pr-6">★ {f.name}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomFilter(f.id!); }}
                    className="absolute top-1 right-1 z-20 p-1 bg-red-500 text-white border-2 border-black hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none"
                    title="Hapus filter"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )})}
            </div>
          )}

          {activeDrawer === 'ADJUST' && (
            <div className="flex flex-col gap-5 pb-24 max-w-xl mx-auto">
              <Slider icon={Sun} label="KECERAHAN" value={settings.brightness} defaultValue={0} min={-1} max={1} step={0.01} name="brightness" onChange={handleSliderChange} />
              <Slider icon={Contrast} label="KONTRAS" value={settings.contrast} defaultValue={1} min={0} max={3} step={0.01} name="contrast" onChange={handleSliderChange} />
              <Slider icon={Droplet} label="SATURASI" value={settings.saturation} defaultValue={1} min={0} max={3} step={0.01} name="saturation" onChange={handleSliderChange} />
              <Slider icon={Palette} label="WARNA (HUE)" value={settings.hue} defaultValue={0} min={-1} max={1} step={0.01} name="hue" onChange={handleSliderChange} />
              <Slider icon={Thermometer} label="SUHU" value={settings.temperature || 0} defaultValue={0} min={-1} max={1} step={0.01} name="temperature" onChange={handleSliderChange} />
              <Slider icon={Focus} label="KETAJAMAN" value={settings.sharpness} defaultValue={0} min={-1} max={5} step={0.1} name="sharpness" onChange={handleSliderChange} />
              <Slider icon={Droplets} label="BLUR" value={settings.blur || 0} defaultValue={0} min={0} max={1} step={0.01} name="blur" onChange={handleSliderChange} />
              <Slider icon={Aperture} label="VIGNETTE" value={settings.vignette || 0} defaultValue={0} min={0} max={1} step={0.01} name="vignette" onChange={handleSliderChange} />
              <Slider icon={Sparkles} label="GRAIN" value={settings.grain || 0} defaultValue={0} min={0} max={1} step={0.01} name="grain" onChange={handleSliderChange} />
              <div className="mt-4 flex flex-col gap-2 shrink-0">
                <div className="flex gap-2">
                  <button onClick={handleUndo} disabled={historyIndex <= 0} className="flex-1 bg-yellow-400 text-black border-2 border-black py-3 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-500 transition-colors uppercase text-sm active:translate-y-[2px] active:translate-x-[2px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"><Undo size={16} />UNDO</button>
                  <button onClick={handleRedo} disabled={historyIndex >= settingsHistory.length - 1} className="flex-1 bg-yellow-400 text-black border-2 border-black py-3 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-500 transition-colors uppercase text-sm active:translate-y-[2px] active:translate-x-[2px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"><Redo size={16} />REDO</button>
                </div>
                <button onClick={() => setSaveModalOpen(true)} className="w-full bg-black text-white py-3 font-black shadow-[4px_4px_0px_0px_rgba(255,230,0,1)] hover:bg-zinc-800 transition-colors uppercase text-sm border-2 border-black hover:border-black active:translate-y-[2px] shrink-0 flex items-center justify-center gap-2"><Save size={18} />SIMPAN JADI FILTER BARU</button>
              </div>
            </div>
          )}

          {activeDrawer === 'STATS' && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto h-full justify-start">
              <div className="text-[10px] sm:text-xs space-y-2 font-bold bg-blue-100 p-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between gap-4 border-b-2 border-black/20 pb-1"><span className="shrink-0 text-black/60">WAKTU RENDER:</span><span className="text-right break-all">{renderTime.toFixed(2)}ms</span></div>
                <div className="flex justify-between gap-4 border-b-2 border-black/20 pb-1"><span className="shrink-0 text-black/60">RESOLUSI:</span><span className="text-right break-all">{currentBaseImage.width}x{currentBaseImage.height}</span></div>
                <div className="flex justify-between gap-4 border-b-2 border-black/20 pb-1"><span className="shrink-0 text-black/60">RASIO:</span><span className="text-right break-all">{(currentBaseImage.width/currentBaseImage.height).toFixed(2)}:1</span></div>
                <div className="flex justify-between gap-4 border-b-2 border-black/20 pb-1"><span className="shrink-0 text-black/60">TOTAL PIKSEL:</span><span className="text-right break-all">{(currentBaseImage.width * currentBaseImage.height).toLocaleString()}</span></div>
                {histogram?.stats && (
                  <>
                    <div className="flex justify-between gap-4 border-b-2 border-black/20 pb-1"><span className="shrink-0 text-black/60">LUMINANSI (AVG):</span><span className="text-right break-all">{histogram.stats.meanLuminance.toFixed(1)}</span></div>
                    <div className="flex justify-between gap-4 border-b-2 border-black/20 pb-1"><span className="shrink-0 text-black/60">KONTRAS (STD. DEV):</span><span className="text-right break-all">{histogram.stats.contrast.toFixed(1)}</span></div>
                    <div className="flex justify-between gap-4 border-b-2 border-black/20 pb-1"><span className="shrink-0 text-black/60">RGB RATA-RATA:</span><span className="text-right break-all">{Math.round(histogram.stats.avgR)}, {Math.round(histogram.stats.avgG)}, {Math.round(histogram.stats.avgB)}</span></div>
                  </>
                )}
                <div className="flex justify-between gap-4"><span className="shrink-0 text-black/60">WARNA:</span><span className="text-right break-all">RGBA (8-bit)</span></div>
              </div>
            </div>
          )}

          {activeDrawer === 'HISTOGRAM' && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto h-full justify-between">
              <div className="flex-1 bg-[#1a1a1a] border-[3px] border-black p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-[160px]">
                <HistogramPanel data={histogram} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Bottom Action Bar */}
      <footer className="lg:hidden absolute bottom-0 w-full bg-white border-t-[4px] border-black p-2 sm:p-3 flex gap-2 shrink-0 z-30 shadow-[0_-4px_0_0_rgba(0,0,0,1)]">
        <button id={!isDesktop ? "tour-presets" : undefined} onClick={() => handleToggleDrawer('PRESETS')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'PRESETS' ? 'bg-cyan-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <ImageIcon size={20} /> <span className="uppercase">Filter</span>
        </button>
        <button id={!isDesktop ? "tour-pipeline" : undefined} onClick={() => handleToggleDrawer('ADJUST')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'ADJUST' ? 'bg-pink-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <SlidersHorizontal size={20} /> <span className="uppercase">Atur</span>
        </button>
        <button id={!isDesktop ? "tour-stats" : undefined} onClick={() => handleToggleDrawer('STATS')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'STATS' ? 'bg-blue-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <Activity size={20} /> <span className="uppercase">Info</span>
        </button>
        <button id={!isDesktop ? "tour-histogram" : undefined} onClick={() => handleToggleDrawer('HISTOGRAM')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'HISTOGRAM' ? 'bg-purple-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <BarChart2 size={20} /> <span className="uppercase">Grafik</span>
        </button>
      </footer>

      {/* Modals */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm border-[4px] border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col font-mono p-6">
            <h3 className="font-black text-xl mb-4 uppercase">NAMA FILTERMU</h3>
            <input 
              type="text" 
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Cth: Filter Kerenku"
              className="w-full border-[3px] border-black p-3 mb-4 font-bold outline-none focus:ring-2 focus:ring-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              autoFocus
            />
            <div className="flex gap-4">
              <button 
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 bg-gray-200 border-[3px] border-black py-3 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-gray-300 transition-all uppercase"
              >
                BATAL
              </button>
              <button 
                onClick={handleSaveCustomFilter}
                className="flex-1 bg-green-400 border-[3px] border-black py-3 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-green-500 transition-all uppercase"
              >
                SIMPAN
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-24 lg:bottom-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-green-400 text-black border-[4px] border-black px-6 py-3 font-black uppercase text-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
            <Save size={20} />
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}

