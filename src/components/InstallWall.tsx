import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, MoreVertical } from 'lucide-react';

export function InstallWall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(
    window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isIOS, setIsIOS] = useState(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const mql = window.matchMedia('(display-mode: standalone)');
    const handleDisplayMode = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mql.addEventListener('change', handleDisplayMode);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('resize', handleResize);
      mql.removeEventListener('change', handleDisplayMode);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Only show on mobile if NOT standalone
  if (!isMobile || isStandalone) return null;

  return (
    <div className="fixed inset-0 bg-yellow-400 z-[9999] flex flex-col items-center justify-center p-6 text-black font-mono">
      <div className="w-full max-w-sm bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-6">
        <div className="bg-pink-400 p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-6 mb-4">
          <Download size={48} className="animate-bounce" />
        </div>
        
        <h1 className="text-3xl font-black uppercase text-center tracking-tight">
          INSTALL APP
        </h1>
        
        <p className="text-center font-bold text-sm border-2 border-black p-4 bg-blue-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          PixelEdge requires installation for full offline capabilities.
        </p>

        {isInstalled ? (
          <div className="w-full space-y-4 bg-green-100 p-4 border-2 border-black font-bold text-xs uppercase">
            <p className="text-center text-green-800 text-lg">App Installed!</p>
            <p className="text-center">Please close this browser tab and open PixelEdge from your device home screen.</p>
          </div>
        ) : isIOS ? (
          <div className="w-full space-y-4 bg-zinc-100 p-4 border-2 border-black font-bold text-xs uppercase">
            <p className="text-center">How to install on iOS:</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black shrink-0"><Share size={16} /></div>
              <span>1. Tap the Share button</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black shrink-0"><PlusSquare size={16} /></div>
              <span>2. Tap "Add to Home Screen"</span>
            </div>
          </div>
        ) : deferredPrompt ? (
          <button 
            onClick={handleInstall}
            className="w-full py-4 px-6 border-4 border-black font-black uppercase text-lg transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-green-400 hover:bg-green-300 active:translate-y-1 active:translate-x-1 active:shadow-none"
          >
            INSTALL NOW
          </button>
        ) : (
          <div className="w-full space-y-4 bg-zinc-100 p-4 border-2 border-black font-bold text-xs uppercase">
            <p className="text-center">Install from Browser menu:</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black shrink-0"><MoreVertical size={16} /></div>
              <span>1. Open Browser Menu</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black shrink-0"><Download size={16} /></div>
              <span>2. Tap "Install App" or "Add to Home screen"</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
