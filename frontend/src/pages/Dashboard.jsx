import React, { useState } from 'react';
import { Play, Pause, SkipForward, Volume2, Settings, Users, BarChart3, Music, Radio, Folder } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';

const Dashboard = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTrack] = useState({
    title: 'The Phantom Beat',
    artist: 'Electronic Vibes',
    duration: '3:45',
    elapsed: '2:15'
  });

  const [listeners] = useState(24);
  const [maxListeners] = useState(100);

  const navigationItems = [
    { icon: Radio, label: 'Quick Links', active: false },
    { icon: Settings, label: 'Server Status', active: false },
    { icon: BarChart3, label: 'Statistics', active: true },
    { icon: Music, label: 'AutoDJ', active: false },
    { icon: Folder, label: 'Media', active: false },
    { icon: Play, label: 'Scheduled', active: false },
    { icon: Settings, label: 'General', active: false },
    { icon: Volume2, label: 'Mount Points', active: false },
    { icon: Radio, label: 'Live', active: false },
  ];

  const recentTracks = [
    { time: '14:32:15', listeners: 24, song: 'The Phantom Beat', duration: '3:45' },
    { time: '14:28:30', listeners: 22, song: 'Night Echoes', duration: '4:12' },
    { time: '14:24:18', listeners: 19, song: 'Urban Lights', duration: '3:58' },
    { time: '14:20:20', listeners: 17, song: 'Digital Dreams', duration: '4:23' },
    { time: '14:16:02', listeners: 21, song: 'Neon Pulse', duration: '3:34' },
    { time: '14:12:28', listeners: 18, song: 'Midnight Groove', duration: '4:01' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Stream Control Panel</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Server: <span className="font-medium text-green-600">Online</span>
              </div>
              <Button variant="outline" size="sm">
                Account Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {navigationItems.map((item, index) => (
                    <button
                      key={index}
                      className={`w-full text-left px-4 py-2 flex items-center space-x-3 transition-colors ${
                        item.active
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>

            {/* Stream Controls */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Stream Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="flex items-center space-x-2"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </Button>
                    <Button variant="outline" size="sm">
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">{currentTrack.title}</div>
                    <div className="text-xs text-gray-500">{currentTrack.artist}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {currentTrack.elapsed} / {currentTrack.duration}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-6">
            {/* Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">{listeners}</div>
                      <div className="text-xs text-gray-500">Current Listeners</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">128</div>
                      <div className="text-xs text-gray-500">Bitrate (kbps)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-5 h-5 text-orange-500" />
                    <div>
                      <div className="text-2xl font-bold">MP3</div>
                      <div className="text-xs text-gray-500">Format</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stream Statistics Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Stream Statistics</span>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 font-medium text-gray-600">Time</th>
                        <th className="py-2 font-medium text-gray-600">Listeners</th>
                        <th className="py-2 font-medium text-gray-600">Song</th>
                        <th className="py-2 font-medium text-gray-600">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTracks.map((track, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-2 text-blue-600 font-medium">{track.time}</td>
                          <td className="py-2 font-medium">{track.listeners}</td>
                          <td className="py-2 text-gray-800">{track.song}</td>
                          <td className="py-2 text-gray-600">{track.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            {/* Current Status */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Stream Online</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Listeners:</span>
                      <span className="font-medium">{listeners}/{maxListeners}</span>
                    </div>
                    <Progress value={(listeners / maxListeners) * 100} className="h-2" />
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bitrate:</span>
                      <span className="font-medium">128 kbps</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-medium">MP3</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-medium">2d 14h 32m</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Now Playing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Now Playing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
                  <div className="text-sm font-medium mb-2">Currently Broadcasting</div>
                  <div className="text-lg font-bold mb-1">{currentTrack.title}</div>
                  <div className="text-sm opacity-90 mb-3">{currentTrack.artist}</div>
                  <div className="text-xs opacity-75">
                    {currentTrack.elapsed} / {currentTrack.duration}
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <Button className="w-full" variant="outline" size="sm">
                    Skip Current Track
                  </Button>
                  <Button className="w-full" variant="outline" size="sm">
                    View Playlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;