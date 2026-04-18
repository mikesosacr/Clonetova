import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Music, Search, Play, Pause, Trash2, List, Grid, X } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const formatDuration = (s) => {
  if (!s) return '--:--';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};
const formatSize = (b) => {
  if (!b) return '0 B';
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${['B','KB','MB','GB'][i]}`;
};

const MediaLibrary = () => {
  const { api } = useAuth();
  const fileInputRef = useRef();
  const audioRef = useRef();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => { fetchTracks(); }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDur);
      audio.removeEventListener('ended', onEnd);
    };
  }, [currentTrack]);

  const fetchTracks = async () => {
    try {
      const res = await api.get('/media');
      setTracks(res.data);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo cargar la biblioteca", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round(e.loaded * 100 / e.total))
      });
      toast({ title: "✅ Subida exitosa", description: `${files.length} archivo(s) subido(s)` });
      fetchTracks();
    } catch (e) {
      toast({ title: "Error", description: "Error al subir archivos", variant: "destructive" });
    } finally { setUploading(false); setUploadProgress(0); }
  };

  const playTrack = async (track) => {
    const audio = audioRef.current;
    if (currentTrack?.id === track.id) {
      if (isPlaying) { audio.pause(); setIsPlaying(false); }
      else { await audio.play(); setIsPlaying(true); }
      return;
    }
    setCurrentTrack(track);
    setIsPlaying(false);
    setCurrentTime(0);
    const token = localStorage.getItem('token');
    audio.src = `/api/media/${track.id}/stream?token=${localStorage.getItem("token") || ""}`?token=${token}` : ''}`;
    audio.load();
    try { await audio.play(); setIsPlaying(true); }
    catch (e) { toast({ title: "Error", description: "No se pudo reproducir el archivo", variant: "destructive" }); }
  };

  const stopPlayer = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentTime(0);
  };

  const handleDelete = async (trackId) => {
    if (!window.confirm('¿Eliminar esta pista?')) return;
    try {
      await api.delete(`/media/${trackId}`);
      if (currentTrack?.id === trackId) stopPlayer();
      toast({ title: "✅ Eliminado", description: "Pista eliminada correctamente" });
      fetchTracks();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const filtered = tracks.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.album?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="space-y-6">
      <audio ref={audioRef} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Biblioteca de Media</h1>
          <p className="text-gray-600">{tracks.length} pistas en la biblioteca</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">
          <Upload className="w-4 h-4" />{uploading ? `Subiendo ${uploadProgress}%` : 'Subir Archivos'}
        </button>
        <input ref={fileInputRef} type="file" multiple accept="audio/*" className="hidden"
          onChange={e => handleUpload(e.target.files)} />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Subiendo archivos...</span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full transition-all" style={{width: `${uploadProgress}%`}} />
          </div>
        </div>
      )}

      {/* Player */}
      {currentTrack && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Music className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{currentTrack.title}</p>
              <p className="text-sm text-slate-300 truncate">{currentTrack.artist || 'Artista desconocido'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400">{formatDuration(currentTime)}</span>
                <div className="flex-1 bg-slate-600 rounded-full h-1.5 cursor-pointer" onClick={seek}>
                  <div className="bg-orange-500 h-1.5 rounded-full" style={{width: duration ? `${(currentTime/duration)*100}%` : '0%'}} />
                </div>
                <span className="text-xs text-slate-400">{formatDuration(duration || currentTrack.duration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => playTrack(currentTrack)}
                className="w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={stopPlayer} className="w-8 h-8 bg-slate-600 hover:bg-slate-500 rounded-full flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Buscar pistas, artistas, álbumes..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tracks */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Sin resultados' : 'Biblioteca vacía'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Sube tus primeros archivos de audio'}
          </p>
          {!searchTerm && (
            <button onClick={() => fileInputRef.current?.click()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium">
              <Upload className="w-4 h-4 inline mr-2" />Subir Archivos
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 w-12">#</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Título</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Artista</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Álbum</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Duración</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Tamaño</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((track, i) => (
                <tr key={track.id} className={`hover:bg-gray-50 transition-colors ${currentTrack?.id === track.id ? 'bg-orange-50' : ''}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => playTrack(track)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-orange-100 text-gray-400 hover:text-orange-500">
                      {currentTrack?.id === track.id && isPlaying
                        ? <Pause className="w-4 h-4 text-orange-500" />
                        : <Play className="w-4 h-4 ml-0.5" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`font-medium text-sm truncate max-w-xs ${currentTrack?.id === track.id ? 'text-orange-600' : 'text-gray-900'}`}>
                      {track.title || track.filename}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-500 truncate max-w-xs">{track.artist || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-gray-500 truncate max-w-xs">{track.album || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-500">{formatDuration(track.duration)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-gray-500">{formatSize(track.file_size)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(track.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(track => (
            <div key={track.id} className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow ${currentTrack?.id === track.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
              <div className="w-full aspect-square bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg mb-3 flex items-center justify-center">
                <Music className="w-10 h-10 text-white" />
              </div>
              <p className="font-medium text-sm truncate">{track.title || track.filename}</p>
              <p className="text-xs text-gray-500 truncate mb-3">{track.artist || 'Artista desconocido'}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{formatDuration(track.duration)}</span>
                <div className="flex gap-1">
                  <button onClick={() => playTrack(track)}
                    className="p-1.5 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg">
                    {currentTrack?.id === track.id && isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                  <button onClick={() => handleDelete(track.id)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default MediaLibrary;
