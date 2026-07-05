import React from 'react';

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  l: number[];
}

interface HistogramPanelProps {
  data: HistogramData | null;
}

export function HistogramPanel({ data }: HistogramPanelProps) {
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
        className="w-full h-full absolute inset-0 pt-2 px-2"
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
    </div>
  );
}
