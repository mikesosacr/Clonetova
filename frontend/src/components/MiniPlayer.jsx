import React from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { Play, Pause, Square } from 'lucide-react';

const fmt = (s) => {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
};

const MiniPlayer = () => {
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, stopPlayer, seek } = usePlayer();
  if (!currentTrack) return null;
  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-64 right-0 z-50 bg-slate-900 border-t border-slate-700 text-white">
      <div className="h-0.5 bg-slate-700 cursor-pointer"
        onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX-r.left)/r.width); }}>
        <div className="h-0.5 bg-orange-500 transition-all" style={{width:`${pct}%`}} />
      </div>
      <div className="flex items-center px-4 py-2 gap-3">
        {/* Equalizer animation */}
        {isPlaying && (
          <div className="flex gap-0.5 items-end h-4 flex-shrink-0">
            {[60,100,40,80,50].map((h,i) => (
              <div key={i} className="w-0.5 bg-orange-500 rounded-full animate-bounce"
                style={{height:`${h}%`, animationDelay:`${i*100}ms`}} />
            ))}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-none">{currentTrack.title}</p>
          <p className="text-xs text-slate-400 truncate leading-none mt-0.5">{currentTrack.artist || 'Artista desconocido'}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={togglePlay}
            className="w-7 h-7 bg-orange-500 hover:bg-orange-400 rounded-full flex items-center justify-center transition-colors">
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button onClick={stopPlayer}
            className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors">
            <Square className="w-3 h-3" />
          </button>
        </div>
        <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
          {fmt(currentTime)} / {fmt(duration || currentTrack.duration)}
        </span>
      </div>
    </div>
  );
};

export default MiniPlayer;
