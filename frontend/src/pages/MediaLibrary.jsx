import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { Upload, Music, Search, Play, Pause, Trash2, List, Grid, Mic2, Clock, HardDrive } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const fmt = (s) => {
  if (!s || isNaN(s)) return '--:--';
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
};
const fmtSize = (b) => {
  if (!b) return '—';
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${['B','KB','MB','GB'][i]}`;
};

const MediaLibrary = () => {
  const { api } = useAuth();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const fileInputRef = useRef();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchTracks(); }, []);

  const fetchTracks = async () => {
    try {
      const res = await api.get('/media');
      setTracks(res.data);
      if (res.data.length > 0) setSelected(res.data[0]);
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

  const handleDelete = async (trackId, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar esta pista?')) return;
    try {
      await api.delete(`/media/${trackId}`);
      if (selected?.id === trackId) setSelected(null);
      toast({ title: "✅ Eliminado" });
      fetchTracks();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const filtered = tracks.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.album?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca de Media</h1>
          <p className="text-sm text-gray-500">{tracks.length} pistas</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
          <Upload className="w-4 h-4" />{uploading ? `${uploadProgress}%` : 'Subir'}
        </button>
        <input ref={fileInputRef} type="file" multiple accept="audio/*" className="hidden"
          onChange={e => handleUpload(e.target.files)} />
      </div>

      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{width:`${uploadProgress}%`}} />
        </div>
      )}

      {/* Main layout — 3 column like CentovaCast */}
      <div className="flex gap-4 flex-1 min-h-0" style={{height: 'calc(100vh - 220px)'}}>

        {/* LEFT — Track list */}
        <div className="flex flex-col w-1/2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div className="col-span-1"></div>
            <div className="col-span-6">Título</div>
            <div className="col-span-3">Artista</div>
            <div className="col-span-2 text-right">Dur.</div>
          </div>

          {/* Track rows */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <Music className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">{searchTerm ? 'Sin resultados' : 'Biblioteca vacía'}</p>
                {!searchTerm && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="mt-3 text-sm text-orange-500 hover:text-orange-700">
                    Subir archivos →
                  </button>
                )}
              </div>
            ) : filtered.map((track, i) => {
              const isActive = currentTrack?.id === track.id;
              const isSelected = selected?.id === track.id;
              return (
                <div key={track.id}
                  onClick={() => setSelected(track)}
                  onDoubleClick={() => playTrack(track)}
                  className={`grid grid-cols-12 px-3 py-2 cursor-pointer border-b border-gray-50 items-center group transition-colors
                    ${isActive ? 'bg-orange-50 border-l-2 border-l-orange-500' : ''}
                    ${isSelected && !isActive ? 'bg-blue-50' : ''}
                    ${!isActive && !isSelected ? 'hover:bg-gray-50' : ''}`}>
                  <div className="col-span-1 flex items-center">
                    {isActive && isPlaying
                      ? <span className="flex gap-0.5 items-end h-4">
                          <span className="w-0.5 bg-orange-500 animate-bounce" style={{height:'60%',animationDelay:'0ms'}}></span>
                          <span className="w-0.5 bg-orange-500 animate-bounce" style={{height:'100%',animationDelay:'150ms'}}></span>
                          <span className="w-0.5 bg-orange-500 animate-bounce" style={{height:'40%',animationDelay:'300ms'}}></span>
                        </span>
                      : <button onClick={(e) => { e.stopPropagation(); playTrack(track); }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-orange-500 transition-opacity">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                    }
                  </div>
                  <div className="col-span-6 min-w-0">
                    <p className={`text-sm truncate ${isActive ? 'text-orange-600 font-semibold' : 'text-gray-800'}`}>
                      {track.title || track.filename}
                    </p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{track.artist || '—'}</p>
                  </div>
                  <div className="col-span-2 text-right text-xs text-gray-400 tabular-nums">
                    {fmt(track.duration)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            {filtered.length} pistas · Doble clic para reproducir
          </div>
        </div>

        {/* RIGHT — Track detail */}
        <div className="flex flex-col w-1/2 gap-4">
          {/* Detail card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
            {selected ? (
              <div className="h-full flex flex-col">
                {/* Album art placeholder */}
                <div className="w-full aspect-square max-h-48 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center mb-4 relative overflow-hidden">
                  <Music className="w-16 h-16 text-white opacity-20" />
                  {currentTrack?.id === selected.id && isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                      <div className="flex gap-1 items-end h-8">
                        {[60,100,40,80,60].map((h,i) => (
                          <div key={i} className="w-1 bg-orange-400 rounded-full animate-bounce"
                            style={{height:`${h}%`, animationDelay:`${i*100}ms`}} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                    {selected.title || selected.filename}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    {selected.artist || 'Artista desconocido'}{selected.album ? ` · ${selected.album}` : ''}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Duración: <strong>{fmt(selected.duration)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <HardDrive className="w-4 h-4 text-gray-400" />
                      <span>Tamaño: <strong>{fmtSize(selected.file_size)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mic2 className="w-4 h-4 text-gray-400" />
                      <span className="truncate text-xs text-gray-400">{selected.filename}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => playTrack(selected)}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                    {currentTrack?.id === selected.id && isPlaying
                      ? <><Pause className="w-4 h-4" />Pausar</>
                      : <><Play className="w-4 h-4" />Reproducir</>}
                  </button>
                  <button onClick={(e) => handleDelete(selected.id, e)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Music className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Selecciona una pista para ver detalles</p>
              </div>
            )}
          </div>

          {/* Upload zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
            className="bg-white border-2 border-dashed border-gray-200 hover:border-orange-400 rounded-xl p-4 text-center cursor-pointer transition-colors group">
            <Upload className="w-5 h-5 text-gray-300 group-hover:text-orange-400 mx-auto mb-1 transition-colors" />
            <p className="text-xs text-gray-400 group-hover:text-orange-500 transition-colors">
              Arrastra archivos o haz clic para subir
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
