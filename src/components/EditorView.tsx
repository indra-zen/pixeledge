import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WebGLFilterEngine } from '../lib/webgl';
import { FilterSettings, CustomFilter } from '../types';
import { Download, Save, Share2, ChevronLeft, Image as ImageIcon, SlidersHorizontal, Activity, X, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import { calculateHistogram } from '../lib/imageUtils';
import { HistogramPanel } from './HistogramPanel';

interface EditorViewProps {
  imageData: ImageData;
  onBack: () => void;
}


const getFilterCSS = (s: FilterSettings) => { return `brightness(${(1 + s.brightness) * 100}%) contrast(${s.contrast * 100}%) saturate(${s.saturation * 100}%) hue-rotate(${s.hue * 360}deg)`; };

const BUILT_IN_FILTERS: { name: string, settings: FilterSettings }[] = [
  { name: 'Normal', settings: { brightness: 0, contrast: 1, saturation: 1, hue: 0, sharpness: 0, grain: 0, temperature: 0, vignette: 0 } },
  { name: 'Vintage', settings: { brightness: 0.1, contrast: 0.8, saturation: 0.5, hue: 0.1, sharpness: 0.2, grain: 0.15, temperature: 0.3, vignette: 0.5 } },
  { name: 'Cyberpunk', settings: { brightness: 0.1, contrast: 1.5, saturation: 1.8, hue: 0.8, sharpness: 0.5, grain: 0.05, temperature: -0.2, vignette: 0.4 } },
  { name: 'Grayscale', settings: { brightness: 0, contrast: 1.2, saturation: 0, hue: 0, sharpness: 0, grain: 0.05, temperature: 0, vignette: 0 } },
  { name: 'Cinematic', settings: { brightness: -0.1, contrast: 1.3, saturation: 0.8, hue: 0, sharpness: 0.3, grain: 0.08, temperature: -0.1, vignette: 0.6 } },
  { name: 'Washed Out', settings: { brightness: 0.2, contrast: 0.6, saturation: 0.4, hue: 0, sharpness: 0, grain: 0, temperature: 0, vignette: 0 } },
  { name: 'Neon', settings: { brightness: 0.1, contrast: 1.8, saturation: 2.5, hue: 0.5, sharpness: 0.8, grain: 0, temperature: 0, vignette: 0 } },
  { name: 'Sepiaish', settings: { brightness: 0.05, contrast: 0.9, saturation: 0.6, hue: -0.1, sharpness: 0.1, grain: 0.08, temperature: 0.5, vignette: 0.3 } },
  { name: 'Crisp', settings: { brightness: 0, contrast: 1.1, saturation: 1.1, hue: 0, sharpness: 1.5, grain: 0, temperature: 0, vignette: 0 } },
  { name: 'Dark & Moody', settings: { brightness: -0.2, contrast: 1.3, saturation: 0.8, hue: 0, sharpness: 0.2, grain: 0.1, temperature: -0.2, vignette: 0.8 } },
];

type DrawerType = 'PRESETS' | 'ADJUST' | 'STATS' | null;

const isSettingsEqual = (a: FilterSettings, b: FilterSettings) => {
  return Math.abs(a.brightness - b.brightness) < 0.001 &&
         Math.abs(a.contrast - b.contrast) < 0.001 &&
         Math.abs(a.saturation - b.saturation) < 0.001 &&
         Math.abs(a.hue - b.hue) < 0.001 &&
         Math.abs(a.sharpness - b.sharpness) < 0.001 &&
         Math.abs((a.temperature || 0) - (b.temperature || 0)) < 0.001 &&
         Math.abs((a.vignette || 0) - (b.vignette || 0)) < 0.001 &&
         Math.abs((a.grain || 0) - (b.grain || 0)) < 0.001;
};

export function EditorView({ imageData, onBack }: EditorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLFilterEngine | null>(null);
  const [settings, setSettings] = useState<FilterSettings>(BUILT_IN_FILTERS[0].settings);
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>('PRESETS');
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  
  const [renderTime, setRenderTime] = useState(0);
  const [histogram, setHistogram] = useState<number[]>(Array(32).fill(0));

  useEffect(() => {
    const timeout = setTimeout(() => {
      const scale = Math.min(100 / imageData.width, 100 / imageData.height);
      const w = Math.floor(imageData.width * scale) || 1;
      const h = Math.floor(imageData.height * scale) || 1;
      
      const thumbCanvas2d = document.createElement('canvas');
      thumbCanvas2d.width = w;
      thumbCanvas2d.height = h;
      const ctx = thumbCanvas2d.getContext('2d');
      if (!ctx) return;
      
      const offCanvas = document.createElement('canvas');
      offCanvas.width = imageData.width;
      offCanvas.height = imageData.height;
      offCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
      ctx.drawImage(offCanvas, 0, 0, w, h);
      
      setThumbnailUrl(thumbCanvas2d.toDataURL('image/jpeg', 0.6));
    }, 100);
    return () => clearTimeout(timeout);
  }, [imageData]);

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
    let cancel = false;
    
    if (engineRef.current) {
      const start = performance.now();
      engineRef.current.render(settings);
      setRenderTime(performance.now() - start);
      
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
    
    return () => {
      cancel = true;
    };
  }, [settings]);

  const handleSliderChange = (key: keyof FilterSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

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
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="bg-green-400 border-[3px] border-black px-2 sm:px-3 py-1 sm:py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2">
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
            <div className="w-full h-full border-4 border-black lg:border-2 lg:border-white/20 relative flex items-center justify-center bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] lg:shadow-none">
              <canvas 
                ref={canvasRef} 
                className="max-w-full max-h-full object-contain relative z-10"
              />
            </div>
          </div>
        </section>

        {/* Desktop: Custom Pipeline */}
        <section id={isDesktop ? "tour-pipeline" : undefined} className="hidden lg:flex lg:col-span-4 lg:row-span-4 bg-white border-[4px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-col shrink-0">
          <h2 className="font-black text-xl mb-4 border-b-2 border-black pb-2 uppercase">Pengaturan</h2>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 no-scrollbar">
            <Slider label="KECERAHAN" value={settings.brightness} defaultValue={0} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('brightness', v)} />
            <Slider label="KONTRAS" value={settings.contrast} defaultValue={1} min={0} max={3} step={0.01} onChange={(v) => handleSliderChange('contrast', v)} />
            <Slider label="SATURASI" value={settings.saturation} defaultValue={1} min={0} max={3} step={0.01} onChange={(v) => handleSliderChange('saturation', v)} />
            <Slider label="WARNA (HUE)" value={settings.hue} defaultValue={0} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('hue', v)} />
            <Slider label="SUHU" value={settings.temperature || 0} defaultValue={0} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('temperature', v)} />
            <Slider label="KETAJAMAN" value={settings.sharpness} defaultValue={0} min={-1} max={5} step={0.1} onChange={(v) => handleSliderChange('sharpness', v)} />
            <Slider label="VIGNETTE" value={settings.vignette || 0} defaultValue={0} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('vignette', v)} />
            <Slider label="GRAIN" value={settings.grain || 0} defaultValue={0} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('grain', v)} />
          </div>
          <button onClick={() => setSaveModalOpen(true)} className="mt-4 w-full bg-black text-white py-3 font-bold hover:bg-zinc-800 transition-colors uppercase border-2 border-transparent hover:border-black active:translate-y-[2px] shrink-0">SIMPAN JADI FILTER BARU</button>
        </section>

        {/* Desktop: Stats for Nerds */}
        <section id={isDesktop ? "tour-stats" : undefined} className="hidden lg:flex lg:col-span-3 lg:row-span-2 bg-blue-400 border-[4px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-col shrink-0">
          <h2 className="font-black text-xl mb-4 uppercase">INFO RENDER</h2>
          <div className="space-y-4 flex-1 flex flex-col justify-end">
            <div className="bg-white border-2 border-black p-2 h-full flex flex-col">
              <HistogramPanel data={histogram} />
            </div>
            <div className="text-xs space-y-1 font-bold bg-white/50 p-2 border-2 border-black">
              <div className="flex justify-between"><span>WAKTU RENDER:</span><span>{renderTime.toFixed(2)}ms</span></div>
              <div className="flex justify-between"><span>RESOLUSI:</span><span>{imageData.width}x{imageData.height}</span></div>
            </div>
          </div>
        </section>

        {/* Desktop: Built-in Filters */}
        <section id={isDesktop ? "tour-presets" : undefined} className="hidden lg:flex lg:col-span-9 lg:row-span-2 bg-white border-[4px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-col shrink-0">
          <h3 className="font-bold text-sm mb-2 uppercase">FILTER</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 flex-1 items-center no-scrollbar">
            {BUILT_IN_FILTERS.map((f, i) => {
              const isActive = isSettingsEqual(settings, f.settings);
              return (
              <button 
                key={i}
                onClick={() => setSettings(f.settings)}
                className={`relative flex-shrink-0 w-32 h-24 border-[3px] border-black flex flex-col justify-end hover:brightness-95 transition-all text-left group active:bg-zinc-300 overflow-hidden ${isActive ? 'translate-x-[2px] translate-y-[2px] shadow-none outline outline-4 outline-offset-2 outline-black bg-zinc-300' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-white'}`}
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
              <div key={'custom_desk_'+i} className="relative flex-shrink-0 w-32 h-24">
                <button 
                  onClick={() => setSettings(f.settings)}
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
          <button onClick={() => setActiveDrawer(null)} className="p-1 hover:bg-gray-200 border-2 border-transparent hover:border-black transition-colors"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {activeDrawer === 'PRESETS' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
              {BUILT_IN_FILTERS.map((f, i) => {
                const isActive = isSettingsEqual(settings, f.settings);
                return (
                <button 
                  key={i}
                  onClick={() => setSettings(f.settings)}
                  className={`relative h-16 sm:h-20 border-[3px] border-black flex items-center justify-center hover:brightness-95 transition-all text-center group active:bg-zinc-300 overflow-hidden ${isActive ? 'translate-x-[2px] translate-y-[2px] shadow-none outline outline-4 outline-offset-2 outline-black bg-zinc-300' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-white'}`}
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
                <div key={'custom_'+i} className="relative h-16 sm:h-20">
                  <button 
                    onClick={() => setSettings(f.settings)}
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
            <div className="flex flex-col gap-5 pb-4 max-w-xl mx-auto">
              <Slider label="KECERAHAN" value={settings.brightness} defaultValue={0} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('brightness', v)} />
              <Slider label="KONTRAS" value={settings.contrast} defaultValue={1} min={0} max={3} step={0.01} onChange={(v) => handleSliderChange('contrast', v)} />
              <Slider label="SATURASI" value={settings.saturation} defaultValue={1} min={0} max={3} step={0.01} onChange={(v) => handleSliderChange('saturation', v)} />
              <Slider label="WARNA (HUE)" value={settings.hue} defaultValue={0} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('hue', v)} />
              <Slider label="SUHU" value={settings.temperature || 0} defaultValue={0} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('temperature', v)} />
              <Slider label="KETAJAMAN" value={settings.sharpness} defaultValue={0} min={-1} max={5} step={0.1} onChange={(v) => handleSliderChange('sharpness', v)} />
              <Slider label="VIGNETTE" value={settings.vignette || 0} defaultValue={0} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('vignette', v)} />
              <Slider label="GRAIN" value={settings.grain || 0} defaultValue={0} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('grain', v)} />
              <button onClick={() => setSaveModalOpen(true)} className="mt-4 w-full bg-black text-white py-3 font-black shadow-[4px_4px_0px_0px_rgba(255,230,0,1)] hover:bg-zinc-800 transition-colors uppercase text-sm border-2 border-black hover:border-black active:translate-y-[2px] shrink-0">SIMPAN JADI FILTER BARU</button>
            </div>
          )}

          {activeDrawer === 'STATS' && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto h-full justify-between">
              <div className="flex-1 bg-white border-[3px] border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <HistogramPanel data={histogram} />
              </div>
              <div className="text-[10px] sm:text-xs space-y-2 font-bold bg-blue-100 p-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between border-b-2 border-black/20 pb-1"><span>WAKTU RENDER:</span><span>{renderTime.toFixed(2)}ms</span></div>
                <div className="flex justify-between border-b-2 border-black/20 pb-1"><span>RESOLUSI:</span><span>{imageData.width}x{imageData.height}</span></div>
                <div className="flex justify-between"><span>PIKSEL:</span><span>{(imageData.width * imageData.height).toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Bottom Action Bar */}
      <footer className="lg:hidden absolute bottom-0 w-full bg-white border-t-[4px] border-black p-2 sm:p-3 flex gap-2 shrink-0 z-30 shadow-[0_-4px_0_0_rgba(0,0,0,1)]">
        <button id={!isDesktop ? "tour-presets" : undefined} onClick={() => setActiveDrawer(activeDrawer === 'PRESETS' ? null : 'PRESETS')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'PRESETS' ? 'bg-cyan-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <ImageIcon size={20} /> <span className="uppercase">Filter</span>
        </button>
        <button id={!isDesktop ? "tour-pipeline" : undefined} onClick={() => setActiveDrawer(activeDrawer === 'ADJUST' ? null : 'ADJUST')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'ADJUST' ? 'bg-pink-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <SlidersHorizontal size={20} /> <span className="uppercase">Atur</span>
        </button>
        <button id={!isDesktop ? "tour-stats" : undefined} onClick={() => setActiveDrawer(activeDrawer === 'STATS' ? null : 'STATS')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'STATS' ? 'bg-blue-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <Activity size={20} /> <span className="uppercase">Info</span>
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

function Slider({ label, value, min, max, step, defaultValue, onChange }: { label: string, value: number, min: number, max: number, step: number, defaultValue: number, onChange: (v: number) => void }) {
  const isModified = Math.abs(value - defaultValue) > 0.001;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center font-black text-xs sm:text-sm uppercase">
        <span className="flex items-center gap-2">
          {label}
          {isModified && (
            <button 
              onClick={() => onChange(defaultValue)}
              className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 hover:bg-red-600 transition-colors border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none"
              title="Reset to default"
            >
              RESET
            </button>
          )}
        </span>
        <span className="bg-black text-white px-2 py-0.5">{value.toFixed(2)}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onDoubleClick={() => onChange(defaultValue)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-6 bg-white border-[3px] border-black appearance-none cursor-pointer accent-black"
        style={{
          boxShadow: 'inset 4px 4px 0px rgba(0,0,0,0.1)'
        }}
      />
    </div>
  );
}
