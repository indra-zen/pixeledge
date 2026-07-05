import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WebGLFilterEngine } from '../lib/webgl';
import { FilterSettings, CustomFilter } from '../types';
import { Download, Save, Share2, ChevronLeft, Image as ImageIcon, SlidersHorizontal, Activity, X } from 'lucide-react';
import { db } from '../lib/db';
import { calculateHistogram } from '../lib/imageUtils';
import { HistogramPanel } from './HistogramPanel';

interface EditorViewProps {
  imageData: ImageData;
  onBack: () => void;
}

const BUILT_IN_FILTERS: { name: string, settings: FilterSettings }[] = [
  { name: 'Normal', settings: { brightness: 0, contrast: 1, saturation: 1, hue: 0, sharpness: 0, grain: 0 } },
  { name: 'Vintage', settings: { brightness: 0.1, contrast: 0.8, saturation: 0.5, hue: 0.1, sharpness: 0.2, grain: 0 } },
  { name: 'Cyberpunk', settings: { brightness: 0.2, contrast: 1.5, saturation: 1.8, hue: 0.8, sharpness: 0.5, grain: 0 } },
  { name: 'Grayscale', settings: { brightness: 0, contrast: 1.2, saturation: 0, hue: 0, sharpness: 0, grain: 0 } },
  { name: 'High Contrast', settings: { brightness: 0, contrast: 2.0, saturation: 1.2, hue: 0, sharpness: 0.3, grain: 0 } },
  { name: 'Washed Out', settings: { brightness: 0.2, contrast: 0.6, saturation: 0.4, hue: 0, sharpness: 0, grain: 0 } },
  { name: 'Neon', settings: { brightness: 0.1, contrast: 1.8, saturation: 2.5, hue: 0.5, sharpness: 0.8, grain: 0 } },
  { name: 'Sepiaish', settings: { brightness: 0.05, contrast: 0.9, saturation: 0.6, hue: -0.1, sharpness: 0.1, grain: 0 } },
  { name: 'Crisp', settings: { brightness: 0, contrast: 1.1, saturation: 1.1, hue: 0, sharpness: 1.5, grain: 0 } },
  { name: 'Dark & Moody', settings: { brightness: -0.2, contrast: 1.3, saturation: 0.8, hue: 0, sharpness: 0.2, grain: 0 } },
];

type DrawerType = 'PRESETS' | 'ADJUST' | 'STATS' | null;

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
  
  const [renderTime, setRenderTime] = useState(0);
  const [histogram, setHistogram] = useState<number[]>(Array(32).fill(0));

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
        alert('Saved to drafts!');
      }
    });
  };

  const handleSaveCustomFilter = async () => {
    if (presetName.trim()) {
      await db.saveCustomFilter(presetName.trim(), settings);
      loadCustomFilters();
      setSaveModalOpen(false);
      setPresetName('');
    }
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
            title: 'My Photo',
            text: 'Check out this photo I made!',
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
           <ChevronLeft size={24} /> <span className="hidden sm:inline">BACK</span>
        </button>
        <div className="flex gap-2 h-full items-stretch" id="tour-actions">
          <div className="relative flex">
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="bg-green-400 border-[3px] border-black px-2 sm:px-3 py-1 sm:py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2">
               <Download size={18} /> <span className="hidden sm:inline uppercase">Export</span>
            </button>
            {showDownloadMenu && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-40 sm:w-48 bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col z-50">
                <button onClick={() => handleDownload('png')} className="px-4 py-2 sm:py-3 font-black hover:bg-green-200 border-b-[4px] border-black text-left uppercase text-sm">Save PNG</button>
                <button onClick={() => handleDownload('jpeg')} className="px-4 py-2 sm:py-3 font-black hover:bg-green-200 border-b-[4px] border-black text-left uppercase text-sm">Save JPG</button>
                <button onClick={handleShare} className="px-4 py-2 sm:py-3 font-black hover:bg-pink-200 text-left uppercase text-sm flex items-center justify-between">Share <Share2 size={16}/></button>
              </div>
            )}
          </div>
          <button onClick={handleSaveDraft} className="bg-yellow-400 border-[3px] border-black px-2 sm:px-3 py-1 sm:py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2">
            <Save size={18} /> <span className="hidden sm:inline uppercase">Save Draft</span>
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
          <h2 className="font-black text-xl mb-4 border-b-2 border-black pb-2 uppercase">Adjustments</h2>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 no-scrollbar">
            <Slider label="BRIGHTNESS" value={settings.brightness} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('brightness', v)} />
            <Slider label="CONTRAST" value={settings.contrast} min={0} max={3} step={0.01} onChange={(v) => handleSliderChange('contrast', v)} />
            <Slider label="SATURATION" value={settings.saturation} min={0} max={3} step={0.01} onChange={(v) => handleSliderChange('saturation', v)} />
            <Slider label="HUE SHIFT" value={settings.hue} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('hue', v)} />
            <Slider label="SHARPNESS" value={settings.sharpness} min={-1} max={5} step={0.1} onChange={(v) => handleSliderChange('sharpness', v)} />
          </div>
          <button onClick={() => setSaveModalOpen(true)} className="mt-4 w-full bg-black text-white py-3 font-bold hover:bg-zinc-800 transition-colors uppercase border-2 border-transparent hover:border-black active:translate-y-[2px] shrink-0">SAVE AS NEW FILTER</button>
        </section>

        {/* Desktop: Stats for Nerds */}
        <section id={isDesktop ? "tour-stats" : undefined} className="hidden lg:flex lg:col-span-3 lg:row-span-2 bg-blue-400 border-[4px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-col shrink-0">
          <h2 className="font-black text-xl mb-4 uppercase">STATS FOR NERDS</h2>
          <div className="space-y-4 flex-1 flex flex-col justify-end">
            <div className="bg-white border-2 border-black p-2 h-full flex flex-col">
              <HistogramPanel data={histogram} />
            </div>
            <div className="text-xs space-y-1 font-bold bg-white/50 p-2 border-2 border-black">
              <div className="flex justify-between"><span>RENDER TIME:</span><span>{renderTime.toFixed(2)}ms</span></div>
              <div className="flex justify-between"><span>RESOLUTION:</span><span>{imageData.width}x{imageData.height}</span></div>
            </div>
          </div>
        </section>

        {/* Desktop: Built-in Filters */}
        <section id={isDesktop ? "tour-presets" : undefined} className="hidden lg:flex lg:col-span-9 lg:row-span-2 bg-white border-[4px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-col shrink-0">
          <h3 className="font-bold text-sm mb-2 uppercase">FILTERS</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 flex-1 items-center no-scrollbar">
            {BUILT_IN_FILTERS.map((f, i) => (
              <button 
                key={i}
                onClick={() => setSettings(f.settings)}
                className="flex-shrink-0 w-32 h-24 border-2 border-black p-2 flex flex-col justify-between hover:brightness-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none text-left group active:bg-zinc-300"
                style={{ backgroundColor: `hsl(${i * 45}, 80%, 75%)` }}
              >
                <span className="text-xs font-black uppercase truncate w-full">
                  {i < 9 ? `0${i+1}` : i+1} {f.name}
                </span>
                <div className="h-1 w-full bg-black"></div>
              </button>
            ))}
            {customFilters.map((f, i) => (
              <button 
                key={'custom_'+i}
                onClick={() => setSettings(f.settings)}
                className="flex-shrink-0 w-32 h-24 bg-cyan-300 border-2 border-black border-dashed p-2 flex flex-col justify-between transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none text-left group active:bg-cyan-400"
              >
                <span className="text-xs font-black uppercase truncate w-full">★ {f.name}</span>
                <div className="h-1 w-full bg-black"></div>
              </button>
            ))}
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
            {activeDrawer === 'PRESETS' ? 'Filters' : activeDrawer === 'ADJUST' ? 'Adjustments' : 'Stats for Nerds'}
          </h3>
          <button onClick={() => setActiveDrawer(null)} className="p-1 hover:bg-gray-200 border-2 border-transparent hover:border-black transition-colors"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {activeDrawer === 'PRESETS' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
              {BUILT_IN_FILTERS.map((f, i) => (
                <button 
                  key={i}
                  onClick={() => setSettings(f.settings)}
                  className="h-16 sm:h-20 border-[3px] border-black p-2 flex items-center justify-center hover:brightness-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none text-center group active:bg-zinc-300"
                  style={{ backgroundColor: `hsl(${i * 45}, 80%, 75%)` }}
                >
                  <span className="text-xs sm:text-sm font-black uppercase truncate w-full">
                    {f.name}
                  </span>
                </button>
              ))}
              {customFilters.map((f, i) => (
                <button 
                  key={'custom_'+i}
                  onClick={() => setSettings(f.settings)}
                  className="h-16 sm:h-20 bg-cyan-300 border-[3px] border-black border-dashed p-2 flex items-center justify-center transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none text-center group active:bg-cyan-400"
                >
                  <span className="text-xs sm:text-sm font-black uppercase truncate w-full">★ {f.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeDrawer === 'ADJUST' && (
            <div className="flex flex-col gap-5 pb-4 max-w-xl mx-auto">
              <Slider label="BRIGHTNESS" value={settings.brightness} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('brightness', v)} />
              <Slider label="CONTRAST" value={settings.contrast} min={0} max={3} step={0.01} onChange={(v) => handleSliderChange('contrast', v)} />
              <Slider label="SATURATION" value={settings.saturation} min={0} max={3} step={0.01} onChange={(v) => handleSliderChange('saturation', v)} />
              <Slider label="HUE SHIFT" value={settings.hue} min={-1} max={1} step={0.01} onChange={(v) => handleSliderChange('hue', v)} />
              <Slider label="SHARPNESS" value={settings.sharpness} min={-1} max={5} step={0.1} onChange={(v) => handleSliderChange('sharpness', v)} />
              <button onClick={() => setSaveModalOpen(true)} className="mt-4 w-full bg-black text-white py-3 font-black shadow-[4px_4px_0px_0px_rgba(255,230,0,1)] hover:bg-zinc-800 transition-colors uppercase text-sm border-2 border-black hover:border-black active:translate-y-[2px] shrink-0">SAVE AS NEW FILTER</button>
            </div>
          )}

          {activeDrawer === 'STATS' && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto h-full justify-between">
              <div className="flex-1 bg-white border-[3px] border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <HistogramPanel data={histogram} />
              </div>
              <div className="text-[10px] sm:text-xs space-y-2 font-bold bg-blue-100 p-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between border-b-2 border-black/20 pb-1"><span>RENDER TIME:</span><span>{renderTime.toFixed(2)}ms</span></div>
                <div className="flex justify-between border-b-2 border-black/20 pb-1"><span>RESOLUTION:</span><span>{imageData.width}x{imageData.height}</span></div>
                <div className="flex justify-between"><span>PIXELS:</span><span>{(imageData.width * imageData.height).toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Bottom Action Bar */}
      <footer className="lg:hidden absolute bottom-0 w-full bg-white border-t-[4px] border-black p-2 sm:p-3 flex gap-2 shrink-0 z-30 shadow-[0_-4px_0_0_rgba(0,0,0,1)]">
        <button id={!isDesktop ? "tour-presets" : undefined} onClick={() => setActiveDrawer(activeDrawer === 'PRESETS' ? null : 'PRESETS')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'PRESETS' ? 'bg-cyan-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <ImageIcon size={20} /> <span className="uppercase">Filters</span>
        </button>
        <button id={!isDesktop ? "tour-pipeline" : undefined} onClick={() => setActiveDrawer(activeDrawer === 'ADJUST' ? null : 'ADJUST')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'ADJUST' ? 'bg-pink-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <SlidersHorizontal size={20} /> <span className="uppercase">Adjust</span>
        </button>
        <button id={!isDesktop ? "tour-stats" : undefined} onClick={() => setActiveDrawer(activeDrawer === 'STATS' ? null : 'STATS')} className={`flex-1 border-[3px] border-black py-1 sm:py-2 font-black text-[10px] sm:text-xs flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${activeDrawer === 'STATS' ? 'bg-blue-400 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}>
          <Activity size={20} /> <span className="uppercase">Stats</span>
        </button>
      </footer>

      {/* Modals */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm border-[4px] border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col font-mono p-6">
            <h3 className="font-black text-xl mb-4 uppercase">NAME YOUR FILTER</h3>
            <input 
              type="text" 
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="e.g. My Cool Filter"
              className="w-full border-[3px] border-black p-3 mb-4 font-bold outline-none focus:ring-2 focus:ring-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              autoFocus
            />
            <div className="flex gap-4">
              <button 
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 bg-gray-200 border-[3px] border-black py-3 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-gray-300 transition-all uppercase"
              >
                CANCEL
              </button>
              <button 
                onClick={handleSaveCustomFilter}
                className="flex-1 bg-green-400 border-[3px] border-black py-3 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-green-500 transition-all uppercase"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between font-black text-xs sm:text-sm uppercase">
        <span>{label}</span>
        <span className="bg-black text-white px-2 py-0.5">{value.toFixed(2)}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-6 bg-white border-[3px] border-black appearance-none cursor-pointer accent-black"
        style={{
          boxShadow: 'inset 4px 4px 0px rgba(0,0,0,0.1)'
        }}
      />
    </div>
  );
}
