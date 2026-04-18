import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Users, TrendingUp, RefreshCw, Radio, Music } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const Statistics = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, streamsRes] = await Promise.all([
        api.get('/statistics'),
        api.get('/streams')
      ]);
      setStats(statsRes.data);
      setStreams(streamsRes.data);
    } catch (e) {
      toast({ title: "Error", description: "No se pudieron cargar las estadísticas", variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  const cards = [
    { label: 'Streams Totales', value: stats?.totalStreams || 0, icon: Radio, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Streams Activos', value: stats?.activeStreams || 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Oyentes Activos', value: stats?.totalListeners || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pistas en Biblioteca', value: stats?.totalTracks || 0, icon: Music, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Usuarios Registrados', value: stats?.totalUsers || 0, icon: Users, color: 'text-pink-600', bg: 'bg-pink-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estadísticas</h1>
          <p className="text-gray-600">Monitorea el rendimiento de tu plataforma</p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium">
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-600">{c.label}</p>
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Streams table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />Estado de Streams
          </h2>
        </div>
        {streams.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay streams configurados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Stream', 'Estado', 'Puerto', 'Oyentes', 'Bitrate', 'Formato'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {streams.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.mount_point}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'online' ? 'bg-green-100 text-green-700' : s.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.status === 'online' ? 'En línea' : s.status === 'error' ? 'Error' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.port}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.current_listeners}/{s.max_listeners}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.bitrate} kbps</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.format}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default Statistics;
