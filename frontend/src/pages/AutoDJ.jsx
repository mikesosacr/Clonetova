import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shuffle, Plus, Trash2, Music, List, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const AutoDJ = () => {
  const { api } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [streams, setStreams] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);
  const [form, setForm] = useState({ name: '', stream_id: '', shuffle: true, crossfade: 5, schedule: 'continuous' });
  const [selectedTracks, setSelectedTracks] = useState({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [pl, st, tr] = await Promise.all([
        api.get('/autodj/playlists'),
        api.get('/streams'),
        api.get('/media')
      ]);
      setPlaylists(pl.data);
      setStreams(st.data);
      setTracks(tr.data);
      // Init selected tracks per playlist
      const sel = {};
      pl.data.forEach(p => { sel[p.id] = new Set(p.track_ids || []); });
      setSelectedTracks(sel);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo cargar AutoDJ", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!form.stream_id) { toast({ title: "Error", description: "Selecciona un stream", variant: "destructive" }); return; }
    try {
      await api.post('/autodj/playlists', form);
      toast({ title: "✅ Playlist creada" });
      setShowCreate(false);
      setForm({ name: '', stream_id: '', shuffle: true, crossfade: 5, schedule: 'continuous' });
      fetchAll();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo crear la playlist", variant: "destructive" });
    }
  };

  const toggleEnable = async (pl) => {
    try {
      await api.post(`/autodj/playlists/${pl.id}/${pl.enabled ? 'disable' : 'enable'}`);
      toast({ title: pl.enabled ? "Playlist desactivada" : "✅ Playlist activada" });
      fetchAll();
    } catch (e) {
      toast({ title: "Error", description: "Error al cambiar estado", variant: "destructive" });
    }
  };

  const deletePlaylist = async (id) => {
    if (!window.confirm('¿Eliminar esta playlist?')) return;
    try {
      await api.delete(`/autodj/playlists/${id}`);
      toast({ title: "✅ Playlist eliminada" });
      fetchAll();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const toggleTrack = (playlistId, trackId) => {
    setSelectedTracks(prev => {
      const set = new Set(prev[playlistId] || []);
      if (set.has(trackId)) set.delete(trackId); else set.add(trackId);
      return { ...prev, [playlistId]: set };
    });
  };

  const saveTracks = async (playlistId) => {
    try {
      const trackIds = Array.from(selectedTracks[playlistId] || []);
      await api.put(`/autodj/playlists/${playlistId}/tracks`, trackIds);
      toast({ title: "✅ Pistas guardadas", description: `${trackIds.length} pistas en la playlist` });
      fetchAll();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AutoDJ</h1>
          <p className="text-gray-600">Gestiona playlists automatizadas para tus streams</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium">
          <Plus className="w-4 h-4" />Crear Playlist
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Playlists Activas', value: playlists.filter(p => p.enabled).length, color: 'text-green-600', icon: Shuffle },
          { label: 'Total Playlists', value: playlists.length, color: 'text-blue-600', icon: List },
          { label: 'Pistas Disponibles', value: tracks.length, color: 'text-purple-600', icon: Music },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
              <s.icon className={`w-8 h-8 ${s.color} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Crear Playlist AutoDJ</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={createPlaylist} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stream</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.stream_id} onChange={e => setForm({...form, stream_id: e.target.value})} required>
                  <option value="">Selecciona un stream...</option>
                  {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crossfade (seg)</label>
                  <input type="number" min="0" max="30"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.crossfade} onChange={e => setForm({...form, crossfade: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modo</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})}>
                    <option value="continuous">Continuo</option>
                    <option value="scheduled">Programado</option>
                    <option value="fallback">Fallback</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="shuffle" checked={form.shuffle}
                  onChange={e => setForm({...form, shuffle: e.target.checked})} className="w-4 h-4 text-orange-500" />
                <label htmlFor="shuffle" className="text-sm text-gray-700">Reproducción aleatoria</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Playlists */}
      {playlists.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Shuffle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin playlists</h3>
          <p className="text-gray-500 mb-4">Crea tu primera playlist para automatizar tus streams</p>
          <button onClick={() => setShowCreate(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium">
            <Plus className="w-4 h-4 inline mr-2" />Crear Playlist
          </button>
        </div>
      ) : playlists.map(pl => (
        <div key={pl.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Playlist header */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{pl.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pl.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {pl.enabled ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {(selectedTracks[pl.id]?.size || pl.track_count || 0)} pistas •
                  Stream: {streams.find(s => s.id === pl.stream_id)?.name || 'Sin stream'} •
                  {pl.shuffle ? ' Aleatorio' : ' Secuencial'} •
                  Crossfade: {pl.crossfade}s
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleEnable(pl)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pl.enabled ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-green-100 hover:bg-green-200 text-green-700'}`}>
                {pl.enabled ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => setExpandedPlaylist(expandedPlaylist === pl.id ? null : pl.id)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                {expandedPlaylist === pl.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              <button onClick={() => deletePlaylist(pl.id)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Track selector */}
          {expandedPlaylist === pl.id && (
            <div className="border-t border-gray-100">
              <div className="p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">Gestionar Pistas</h4>
                  <button onClick={() => saveTracks(pl.id)}
                    className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                    <Check className="w-4 h-4" />Guardar ({selectedTracks[pl.id]?.size || 0} pistas)
                  </button>
                </div>
                {tracks.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No hay pistas en la biblioteca. Sube archivos de audio primero.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {tracks.map(track => {
                      const selected = selectedTracks[pl.id]?.has(track.id);
                      return (
                        <div key={track.id}
                          onClick={() => toggleTrack(pl.id, track.id)}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selected ? 'bg-orange-100 border border-orange-300' : 'bg-white hover:bg-gray-100 border border-transparent'}`}>
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${selected ? 'bg-orange-500' : 'border-2 border-gray-300'}`}>
                            {selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{track.title || track.filename}</p>
                            <p className="text-xs text-gray-500 truncate">{track.artist || 'Artista desconocido'}</p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {track.duration ? `${Math.floor(track.duration/60)}:${String(Math.floor(track.duration%60)).padStart(2,'0')}` : '--:--'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
export default AutoDJ;
