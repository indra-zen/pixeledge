import React from 'react';

interface HistogramPanelProps {
  data: number[]; // 0 to 100 percentage values
}

export function HistogramPanel({ data }: HistogramPanelProps) {
  if (!data || data.length === 0) return null;

  // Render SVG polygon
  const width = 100;
  const height = 100;
  const binWidth = width / data.length;
  
  // Construct polygon points
  // Start at bottom left
  let points = `0,${height} `;
  
  data.forEach((val, i) => {
    const x = i * binWidth;
    const y = height - (val / 100) * height;
    points += `${x},${y} ${x + binWidth},${y} `;
  });
  
  // End at bottom right
  points += `${width},${height}`;

  return (
    <div className="flex-1 w-full flex flex-col justify-end bg-white border-2 border-black p-2 h-16 sm:h-24 relative overflow-hidden group">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full absolute inset-0 pt-2 px-2"
        preserveAspectRatio="none"
      >
        <polygon 
          points={points} 
          className="fill-black opacity-80 group-hover:opacity-100 transition-opacity"
        />
        
        {/* Draw subtle grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" strokeDasharray="2,2" />
      </svg>
      <div className="absolute top-1 left-2 text-[8px] font-bold text-black/50 z-10">
        LIVE INTENSITY
      </div>
    </div>
  );
}
