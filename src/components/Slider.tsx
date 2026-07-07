import React from 'react';

export const Slider = React.memo(function Slider({ name, label, icon: Icon, value, min, max, step, defaultValue, onChange }: { name?: string, label: string, icon?: React.ElementType, value: number, min: number, max: number, step: number, defaultValue: number, onChange: (v: number, name?: string) => void }) {
  const isModified = Math.abs(value - defaultValue) > 0.001;

  const handleChange = (v: number) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(5);
      } catch (e) {
        // ignore
      }
    }
    onChange(v, name);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center font-black text-xs sm:text-sm uppercase">
        <span className="flex items-center gap-2">
          {Icon && <Icon size={16} />}
          {label}
          {isModified && (
            <button 
              onClick={() => handleChange(defaultValue)}
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
        onDoubleClick={() => handleChange(defaultValue)}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        className="w-full h-6 bg-white border-[3px] border-black appearance-none cursor-pointer accent-black"
        style={{
          boxShadow: 'inset 4px 4px 0px rgba(0,0,0,0.1)'
        }}
      />
    </div>
  );
});
