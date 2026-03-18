import React from 'react';
import { Film } from 'lucide-react';

export default function MovieLoader({ size = 'md', className = '', text = false }) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const dim = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className={`${dim} overflow-hidden relative flex justify-center items-center rounded-sm bg-black border border-gray-800 shadow-[0_0_20px_rgba(220,38,38,0.15)]`}>
        <div className="absolute top-0 w-full h-[200%] flex flex-col animate-film-scroll">
          <div className="w-full h-1/2 flex items-center justify-center">
            <Film className="w-[85%] h-[85%] text-red-600" strokeWidth={1.5} />
          </div>
          <div className="w-full h-1/2 flex items-center justify-center">
            <Film className="w-[85%] h-[85%] text-red-600" strokeWidth={1.5} />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none z-10 opacity-80"></div>
        <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none z-20"></div>
      </div>

      {text && (
        <span className="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase animate-pulse select-none">
          Loading Content
        </span>
      )}
    </div>
  );
}