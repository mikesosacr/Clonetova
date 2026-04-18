import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Play, Square, RotateCcw, Trash2, Plus, Radio, Users, Volume2, Wifi, Edit, X, Save, ExternalLink } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const StreamManagement = () => {
  const { api } = useAuth();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editStream, setEditStream] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', port: '', mount_point: '/stream', bitrate: 128, format: 'MP3', max_listeners: 50, password: '' });

  useEffect(() => { fetchStreams(); }, []);

  const fetchStreams = async () => {
    try {
      const res = await api.get('/streams');
      setStreams(res.data);
    } catch (e) {
      toast({ title: "Error", description: "No se pudieron cargar los streams", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditStream(null);
    setForm({ name: '', description: '', port: '', mount_point: '/stream', bitrate: 128, format: 'MP3', max_listeners: 50, password: '' });
    setShowCreate(true);
  };

  const openEdit = (s) => {
    setEditStream(s);
    setForm({ name: s.name, description: s.description || '', port: s.port, mount_point: s.mount_point, bitrate: s.bitrate, format: s.format, max_listeners: s.max_listeners, password: s.password });
    setShowCreate(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, port: parseInt(form.port), bitrate: parseInt(form.bitrate), max_listeners: parseInt(form.max_listeners) };
      if (editStream) {
        await api.put(`/streams/${editStream.id}`, { name: data.name, description: data.description, max_listeners: data.max_listeners, password: data.password });
        toast({ title: "✅ Stream actualizado" });
      } else {
        await api.post('/streams', data);
        toast({ title: "✅ Stream creado" });
      }
      setShowCreate(false);
      fetchStreams();
    } catch (e) {
      toast({ title: "Error", description: e.response?.data?.detail || "Error al guardar", variant: "destructive" });
    }
  };

  const action = async (streamId, act) => {
    try {
      await api.post(`/streams/${streamId}/${act}`);
      toast({ title: "✅ Listo", description: `Stream ${act === 'start' ? 'iniciado' : act === 'stop' ? 'detenido' : 'reiniciado'}` });
      fetchStreams();
    } catch (e) {
      toast({ title: "Error", description: `No se pudo ejecutar la acción`, variant: "destructive" });
    }
  };

  const deleteStream = async (id) => {
    if (!window.confirm('¿Eliminar este stream?')) return;
    try {
      await api.delete(`/streams/${id}`);
      toast({ title: "✅ Stream eliminado" });
      fetchStreams();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Streams</h1>
          <p className="text-gray-600">{streams.length} streams configurados</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium">
          <Plus className="w-4 h-4" />Crear Stream
        </button>
      </div>

      {streams.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin streams</h3>
          <p className="text-gray-500 mb-4">Crea tu primer stream de radio</p>
          <button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium">
            <Plus className="w-4 h-4 inline mr-2" />Crear Stream
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {streams.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${s.status === 'online' ? 'bg-green-500 animate-pulse' : s.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
                    <h3 className="text-xl font-semibold text-gray-900">{s.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'online' ? 'bg-green-100 text-green-700' : s.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.status === 'online' ? 'En línea' : s.status === 'error' ? 'Error' : 'Offline'}
                    </span>
                  </div>
                  {s.description && <p className="text-gray-500 text-sm mb-4">{s.description}</p>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600"><Wifi className="w-4 h-4 text-gray-400" />Puerto {s.port}</div>
                    <div className="flex items-center gap-2 text-gray-600"><Users className="w-4 h-4 text-gray-400" />{s.current_listeners}/{s.max_listeners} oyentes</div>
                    <div className="flex items-center gap-2 text-gray-600"><Volume2 className="w-4 h-4 text-gray-400" />{s.bitrate} kbps {s.format}</div>
                    <div className="flex items-center gap-2 text-gray-600"><Radio className="w-4 h-4 text-gray-400" />{s.mount_point}</div>
                  </div>
                  {s.status === 'online' && (
                    <div className="mt-3">
                      <a href={`http://${window.location.hostname}:${s.port}${s.mount_point}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-orange-500 hover:text-orange-700">
                        <ExternalLink className="w-3 h-3" />Escuchar stream
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {s.status === 'online' ? (
                    <button onClick={() => action(s.id, 'stop')}
                      className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium">
                      <Square className="w-4 h-4" />Detener
                    </button>
                  ) : (
                    <button onClick={() => action(s.id, 'start')}
                      className="flex items-center gap-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-sm font-medium">
                      <Play className="w-4 h-4" />Iniciar
                    </button>
                  )}
                  <button onClick={() => action(s.id, 'restart')}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg" title="Reiniciar">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(s)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg" title="Editar">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteStream(s.id)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editStream ? 'Editar Stream' : 'Crear Nuevo Stream'}</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Stream *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              {!editStream && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Puerto *</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={form.port} onChange={e => setForm({...form, port: e.target.value})} placeholder="8001" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mount Point</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={form.mount_point} onChange={e => setForm({...form, mount_point: e.target.value})} />
                  </div>
                </div>
              )}
              {!editStream && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bitrate</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={form.bitrate} onChange={e => setForm({...form, bitrate: e.target.value})}>
                      {[64,96,128,192,256,320].map(b => <option key={b} value={b}>{b} kbps</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={form.format} onChange={e => setForm({...form, format: e.target.value})}>
                      {['MP3','AAC','OGG'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Máx Oyentes</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={form.max_listeners} onChange={e => setForm({...form, max_listeners: e.target.value})} />
                  </div>
                </div>
              )}
              {editStream && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx Oyentes</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.max_listeners} onChange={e => setForm({...form, max_listeners: e.target.value})} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del Stream *</label>
                <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editStream} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
                  <Save className="w-4 h-4" />{editStream ? 'Actualizar' : 'Crear Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default StreamManagement;
