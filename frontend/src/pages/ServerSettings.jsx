import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../hooks/use-toast';
import { Save, Server, Mail, Radio, Shield, User } from 'lucide-react';

const ServerSettings = () => {
  const { api, user } = useAuth();
  const [settings, setSettings] = useState({
    serverName: '', adminEmail: '', enableRegistration: true,
    defaultBitrate: 128, maxStreams: 10, enableAutoDJ: true,
    icecastHost: '', icecastPort: 8000, icecastPassword: ''
  });
  const [profile, setProfile] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('server');

  useEffect(() => {
    fetchSettings();
    if (user) setProfile(p => ({ ...p, name: user.name, email: user.email }));
  }, [user]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo cargar la configuración", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast({ title: "✅ Guardado", description: "Configuración actualizada correctamente" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveProfile = async () => {
    if (profile.password && profile.password !== profile.confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const data = { name: profile.name, email: profile.email };
      if (profile.password) data.password = profile.password;
      await api.put('/auth/me', data);
      toast({ title: "✅ Perfil actualizado", description: "Tu perfil fue guardado correctamente" });
      setProfile(p => ({ ...p, password: '', confirmPassword: '' }));
    } catch (e) {
      toast({ title: "Error", description: "No se pudo actualizar el perfil", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;

  const tabs = [
    { id: 'server', label: 'Servidor', icon: Server },
    { id: 'streaming', label: 'Streaming', icon: Radio },
    { id: 'profile', label: 'Mi Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Administra la configuración del servidor</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white shadow text-orange-600' : 'text-gray-600 hover:text-gray-800'}`}>
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Server Settings */}
      {activeTab === 'server' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Server className="w-5 h-5 text-orange-500" />Configuración del Servidor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servidor</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={settings.serverName} onChange={e => setSettings({...settings, serverName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de Administrador</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={settings.adminEmail} onChange={e => setSettings({...settings, adminEmail: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Streams</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={settings.maxStreams} onChange={e => setSettings({...settings, maxStreams: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitrate por defecto (kbps)</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={settings.defaultBitrate} onChange={e => setSettings({...settings, defaultBitrate: parseInt(e.target.value)})}>
                {[64,96,128,192,256,320].map(b => <option key={b} value={b}>{b} kbps</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <input type="checkbox" id="reg" checked={settings.enableRegistration}
              onChange={e => setSettings({...settings, enableRegistration: e.target.checked})}
              className="w-4 h-4 text-orange-500 rounded" />
            <label htmlFor="reg" className="text-sm text-gray-700">Permitir registro de nuevos usuarios</label>
          </div>
          <div className="flex items-center space-x-3">
            <input type="checkbox" id="autodj" checked={settings.enableAutoDJ}
              onChange={e => setSettings({...settings, enableAutoDJ: e.target.checked})}
              className="w-4 h-4 text-orange-500 rounded" />
            <label htmlFor="autodj" className="text-sm text-gray-700">Habilitar AutoDJ</label>
          </div>
          <button onClick={saveSettings} disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      )}

      {/* Streaming Settings */}
      {activeTab === 'streaming' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Radio className="w-5 h-5 text-orange-500" />Configuración de IceCast</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host de IceCast</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={settings.icecastHost} onChange={e => setSettings({...settings, icecastHost: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puerto de IceCast</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={settings.icecastPort} onChange={e => setSettings({...settings, icecastPort: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de IceCast</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={settings.icecastPassword} onChange={e => setSettings({...settings, icecastPassword: e.target.value})} />
            </div>
          </div>
          <button onClick={saveSettings} disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><User className="w-5 h-5 text-orange-500" />Mi Perfil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={profile.password} onChange={e => setProfile({...profile, password: e.target.value})}
                placeholder="Dejar en blanco para no cambiar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={profile.confirmPassword} onChange={e => setProfile({...profile, confirmPassword: e.target.value})} />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Actualizar Perfil'}
          </button>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Shield className="w-5 h-5 text-orange-500" />Seguridad</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium">⚠️ Recomendaciones de seguridad</p>
            <ul className="mt-2 text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Cambia la contraseña del administrador inmediatamente</li>
              <li>Usa contraseñas fuertes para los streams de IceCast</li>
              <li>Configura un dominio con SSL/HTTPS para producción</li>
              <li>Desactiva el registro público si no lo necesitas</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium">ℹ️ Estado actual</p>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>Registro de usuarios: {settings.enableRegistration ? '✅ Habilitado' : '❌ Deshabilitado'}</li>
              <li>AutoDJ: {settings.enableAutoDJ ? '✅ Habilitado' : '❌ Deshabilitado'}</li>
              <li>Máximo de streams: {settings.maxStreams}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
export default ServerSettings;
