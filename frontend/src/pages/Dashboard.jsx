import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Radio, 
  Users, 
  Music, 
  Server, 
  Play, 
  Pause, 
  SkipForward, 
  Volume2,
  Activity,
  TrendingUp,
  Clock,
  Wifi
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

const Dashboard = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState({
    totalStreams: 0,
    activeStreams: 0,
    totalListeners: 0,
    totalTracks: 0,
    serverUptime: '0d 0h 0m'
  });
  const [activeStreams, setActiveStreams] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, streamsRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/streams/active'),
        api.get('/dashboard/recent-activity')
      ]);
      
      setStats(statsRes.data);
      setActiveStreams(streamsRes.data);
      setRecentActivity(activityRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStreamControl = async (streamId, action) => {
    try {
      await api.post(`/streams/${streamId}/${action}`);
      toast({
        title: "Success",
        description: `Stream ${action} successful`,
      });
      fetchDashboardData(); // Refresh data
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} stream`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your streaming servers</p>
        </div>
        <Button onClick={fetchDashboardData} className="bg-orange-500 hover:bg-orange-600">
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Streams</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStreams}</p>
              </div>
              <Radio className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-600">{stats.activeStreams} active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Listeners</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalListeners}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600">+12% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Media Tracks</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTracks}</p>
              </div>
              <Music className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">Across all streams</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Server Uptime</p>
                <p className="text-2xl font-bold text-gray-900">{stats.serverUptime}</p>
              </div>
              <Server className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <Wifi className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600">Online</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Streams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Radio className="w-5 h-5 mr-2" />
              Active Streams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeStreams.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No active streams</p>
              ) : (
                activeStreams.map((stream) => (
                  <div key={stream.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{stream.name}</h3>
                        <Badge variant={stream.status === 'online' ? 'default' : 'secondary'}>
                          {stream.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span>{stream.listeners} listeners</span>
                        <span className="mx-2">•</span>
                        <span>{stream.bitrate} kbps</span>
                        <span className="mx-2">•</span>
                        <span>Port {stream.port}</span>
                      </div>
                      {stream.currentTrack && (
                        <div className="text-sm text-blue-600 mt-1">
                          Now Playing: {stream.currentTrack}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStreamControl(stream.id, stream.status === 'online' ? 'stop' : 'start')}
                      >
                        {stream.status === 'online' ? 
                          <Pause className="w-4 h-4" /> : 
                          <Play className="w-4 h-4" />
                        }
                      </Button>
                      <Button size="sm" variant="outline">
                        <SkipForward className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Radio className="w-6 h-6 mb-2" />
              <span>Create Stream</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Music className="w-6 h-6 mb-2" />
              <span>Upload Media</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Users className="w-6 h-6 mb-2" />
              <span>Add User</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Volume2 className="w-6 h-6 mb-2" />
              <span>Configure AutoDJ</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;