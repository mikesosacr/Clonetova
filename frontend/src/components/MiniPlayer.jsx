import React from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { Play, Pause, Square, SkipForward, Volume2 } from 'lucide-react';

const fmt = (s) => {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
};

const MiniPlayer = () => {
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, stopPlayer, seek } = usePlayer();

  if (!currentTrack) return null;

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 text-white">
      {/* Progress bar — clickeable */}
      <div className="h-1 bg-slate-700 cursor-pointer group"
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          seek((e.clientX - rect.left) / rect.width);
        }}>
        <div className="h-1 bg-orange-500 group-hover:bg-orange-400 transition-colors"
          style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center px-4 py-2 gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center flex-shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{currentTrack.title}</p>
            <p className="text-xs text-slate-400 truncate leading-tight">{currentTrack.artist || 'Artista desconocido'}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={togglePlay}
            className="w-8 h-8 bg-orange-500 hover:bg-orange-400 rounded-full flex items-center justify-center transition-colors">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button onClick={stopPlayer}
            className="w-7 h-7 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors">
            <Square className="w-3 h-3" />
          </button>
        </div>

        {/* Time */}
        <div className="text-xs text-slate-400 tabular-nums flex-shrink-0">
          {fmt(currentTime)} / {fmt(duration || currentTrack.duration)}
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
