import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Radio, 
  Music, 
  BarChart3, 
  Users, 
  Settings, 
  Shuffle, 
  Server,
  Headphones
} from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Radio, label: 'Streams', path: '/streams' },
    { icon: Music, label: 'Media Library', path: '/media' },
    { icon: Shuffle, label: 'AutoDJ', path: '/autodj' },
    { icon: BarChart3, label: 'Statistics', path: '/statistics' },
    { icon: Users, label: 'Users', path: '/users' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="bg-slate-800 text-white w-64 flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Clonetova</h1>
            <p className="text-xs text-slate-400">v3.2.12</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Server className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Server Status</span>
          </div>
          <div className="text-xs text-slate-400">
            <div className="flex justify-between">
              <span>CPU:</span>
              <span className="text-green-400">12%</span>
            </div>
            <div className="flex justify-between">
              <span>Memory:</span>
              <span className="text-green-400">45%</span>
            </div>
            <div className="flex justify-between">
              <span>Streams:</span>
              <span className="text-orange-400">3/10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;