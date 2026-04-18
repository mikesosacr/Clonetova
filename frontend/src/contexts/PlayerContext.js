import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const { api } = useAuth();
  const audioRef = useRef(new Audio());
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const audio = audioRef.current;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration);
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Auto-play next in queue
      if (queue.length > 0) {
        const next = queue[0];
        setQueue(q => q.slice(1));
        playTrack(next);
      }
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDur);
      audio.removeEventListener('ended', onEnd);
    };
  }, [queue]);

  const playTrack = async (track) => {
    const audio = audioRef.current;
    if (currentTrack?.id === track.id) {
      if (isPlaying) { audio.pause(); setIsPlaying(false); }
      else { await audio.play(); setIsPlaying(true); }
      return;
    }
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(0);
    const token = localStorage.getItem('token') || '';
    audio.src = `/api/media/${track.id}/stream?token=${token}`;
    audio.load();
    try { await audio.play(); setIsPlaying(true); }
    catch (e) { console.error('Playback error:', e); }
  };

  const stopPlayer = () => {
    audioRef.current.pause();
    audioRef.current.src = '';
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentTime(0);
    setDuration(0);
  };

  const seek = (pct) => {
    if (!duration) return;
    audioRef.current.currentTime = pct * duration;
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, currentTime, duration, queue, setQueue, playTrack, stopPlayer, seek, togglePlay }}>
      {children}
    </PlayerContext.Provider>
  );
};
