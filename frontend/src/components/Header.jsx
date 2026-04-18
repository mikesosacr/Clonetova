import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut, User, RefreshCw, X } from 'lucide-react';

const Header = () => {
  const { user, logout, api } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/dashboard/notifications');
      setNotifications(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/dashboard/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {}
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleProfile = () => { setMenuOpen(false); navigate('/settings'); };
  const handleRefresh = () => window.location.reload();

  const typeColor = (type) => {
    switch(type) {
      case 'stream': return 'bg-blue-50 border-l-2 border-blue-400';
      case 'media': return 'bg-purple-50 border-l-2 border-purple-400';
      case 'auth': return 'bg-green-50 border-l-2 border-green-400';
      case 'settings': return 'bg-yellow-50 border-l-2 border-yellow-400';
      default: return 'bg-gray-50';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Radio Streaming Control Panel</h2>
        <div className="flex items-center space-x-2">

          {/* Notificaciones */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); fetchNotifications(); }}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="font-semibold text-gray-800">Notificaciones</span>
                  <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">Sin actividad reciente</div>
                  ) : notifications.map((n, i) => (
                    <div key={i} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? typeColor(n.type) : 'bg-white'}`}>
                      <p className="text-sm text-gray-800">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{n.timestamp}</p>
                    </div>
                  ))}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2 text-center border-t border-gray-100">
                    <button onClick={markAllRead} className="text-sm text-orange-500 hover:text-orange-700 font-medium">
                      Marcar todas como leídas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Recargar">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>

          {/* Menú usuario */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-orange-600" />
              </div>
              <span className="font-medium text-gray-700">{user?.name || user?.email || 'Admin'}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-1">
                <button onClick={handleProfile} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <User className="w-4 h-4 mr-3 text-gray-400" />Perfil
                </button>
                <button onClick={() => { setMenuOpen(false); navigate('/settings'); }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="w-4 h-4 mr-3 text-gray-400" />Configuración
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4 mr-3" />Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Header;
