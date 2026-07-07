import React from 'react';
import { ImageStats } from '../lib/imageUtils';

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  l: number[];
  stats: ImageStats;
}

interface HistogramPanelProps {
  data: HistogramData | null;
}

export const HistogramPanel = React.memo(function HistogramPanel({ data }: HistogramPanelProps) {
  if (!data || !data.l || data.l.length === 0) return null;

  const width = 100;
  const height = 100;
  const binWidth = width / data.l.length;
  
  const createPoints = (arr: number[]) => {
    let points = `0,${height} `;
    arr.forEach((val, i) => {
      const x = i * binWidth;
      const y = height - (val / 100) * height;
      points += `${x},${y} ${x + binWidth},${y} `;
    });
    points += `${width},${height}`;
    return points;
  };

  const pointsR = createPoints(data.r);
  const pointsG = createPoints(data.g);
  const pointsB = createPoints(data.b);
  const pointsL = createPoints(data.l);

  return (
    <div className="flex-1 w-full flex flex-col justify-end bg-[#1a1a1a] p-2 relative overflow-hidden group h-full">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full absolute inset-0 pt-2 px-2 pb-6"
        preserveAspectRatio="none"
        style={{ mixBlendMode: 'screen' }}
      >
        <polygon points={pointsR} className="fill-red-500 opacity-60" style={{ mixBlendMode: 'screen' }} />
        <polygon points={pointsG} className="fill-green-500 opacity-60" style={{ mixBlendMode: 'screen' }} />
        <polygon points={pointsB} className="fill-blue-500 opacity-60" style={{ mixBlendMode: 'screen' }} />
        <polygon points={pointsL} className="fill-white opacity-40" />
        
        {/* Draw subtle grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2,2" />
      </svg>
      <div className="absolute top-2 left-2 text-[10px] font-black text-white/50 z-10 tracking-widest uppercase">
        RGB + Luma
      </div>
      <div className="absolute bottom-2 left-2 right-2 text-[9px] font-mono text-white/70 z-10 flex justify-between">
        <span className="flex flex-col gap-0.5">
          <span>Luma: {data.stats.meanLuminance.toFixed(1)}</span>
          <span>Cont: {data.stats.contrast.toFixed(1)}</span>
        </span>
        <span className="flex flex-col items-end gap-0.5">
          <span className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-full" style={{backgroundColor: `rgb(${Math.round(data.stats.avgR)}, ${Math.round(data.stats.avgG)}, ${Math.round(data.stats.avgB)})`}}/>
             RGB Avg
          </span>
          <span className="text-[8px] opacity-75">
            {Math.round(data.stats.avgR)}, {Math.round(data.stats.avgG)}, {Math.round(data.stats.avgB)}
          </span>
        </span>
      </div>
    </div>
  );
});
