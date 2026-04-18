import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, Music, Server, Play, Square, Activity, TrendingUp, Clock, Wifi, Plus, Upload, UserPlus, Shuffle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const Dashboard = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStreams: 0, activeStreams: 0, totalListeners: 0, totalTracks: 0, serverUptime: '0d 0h 0m' });
  const [activeStreams, setActiveStreams] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    try {
      const [statsRes, streamsRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/streams/active'),
        api.get('/dashboard/recent-activity')
      ]);
      setStats(statsRes.data);
      setActiveStreams(streamsRes.data);
      setRecentActivity(activityRes.data);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally { setLoading(false); }
  };

  const handleStreamAction = async (streamId, action) => {
    try {
      await api.post(`/streams/${streamId}/${action}`);
      toast({ title: "✅ Listo", description: `Stream ${action === 'stop' ? 'detenido' : 'iniciado'}` });
      fetchAll();
    } catch (e) {
      toast({ title: "Error", description: `No se pudo ejecutar la acción`, variant: "destructive" });
    }
  };

  const activityTypeColor = (type) => {
    const colors = { stream: 'bg-blue-500', media: 'bg-purple-500', auth: 'bg-green-500', settings: 'bg-yellow-500', user: 'bg-pink-500' };
    return colors[type] || 'bg-orange-500';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen de tu plataforma de streaming</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium">
          <Activity className="w-4 h-4" />Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Streams', value: stats.totalStreams, sub: `${stats.activeStreams} activos`, icon: Radio, color: 'text-blue-600', subColor: 'text-green-600' },
          { label: 'Oyentes', value: stats.totalListeners, sub: 'En este momento', icon: Users, color: 'text-green-600', subColor: 'text-gray-500' },
          { label: 'Pistas de Media', value: stats.totalTracks, sub: 'En biblioteca', icon: Music, color: 'text-purple-600', subColor: 'text-gray-500' },
          { label: 'Uptime', value: stats.serverUptime, sub: 'En línea', icon: Server, color: 'text-orange-600', subColor: 'text-green-600', isText: true },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">{s.label}</p>
              <s.icon className={`w-6 h-6 ${s.color} opacity-70`} />
            </div>
            <p className={`${s.isText ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>{s.value}</p>
            <p className={`text-sm mt-1 flex items-center gap-1 ${s.subColor}`}>
              {i === 3 && <Wifi className="w-3 h-3" />}{s.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Streams */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Radio className="w-5 h-5 text-orange-500" />Streams Activos
            </h2>
            <button onClick={() => navigate('/streams')} className="text-sm text-orange-500 hover:text-orange-700">Ver todos →</button>
          </div>
          <div className="p-4 space-y-3">
            {activeStreams.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Radio className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay streams activos</p>
                <button onClick={() => navigate('/streams')} className="mt-3 text-sm text-orange-500 hover:text-orange-700">Gestionar streams →</button>
              </div>
            ) : activeStreams.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="font-medium text-sm truncate">{s.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.current_listeners}/{s.max_listeners} oyentes • {s.bitrate} kbps • Puerto {s.port}
                  </p>
                </div>
                <button onClick={() => handleStreamAction(s.id, 'stop')}
                  className="ml-2 flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs">
                  <Square className="w-3 h-3" />Detener
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />Actividad Reciente
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin actividad reciente</p>
              </div>
            ) : recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${activityTypeColor(a.type)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Crear Stream', icon: Plus, path: '/streams', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
            { label: 'Subir Media', icon: Upload, path: '/media', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
            { label: 'Agregar Usuario', icon: UserPlus, path: '/users', color: 'text-green-600 bg-green-50 hover:bg-green-100' },
            { label: 'Configurar AutoDJ', icon: Shuffle, path: '/autodj', color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
          ].map((a, i) => (
            <button key={i} onClick={() => navigate(a.path)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl transition-colors h-24 ${a.color}`}>
              <a.icon className="w-7 h-7 mb-2" />
              <span className="text-sm font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
