import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Shuffle, 
  Play, 
  Pause, 
  SkipForward, 
  Plus, 
  Trash2, 
  Edit,
  Clock,
  Music,
  List,
  Settings
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

const AutoDJ = () => {
  const { api } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    streamId: '',
    shuffle: true,
    crossfade: 5,
    schedule: 'continuous'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [playlistsRes, streamsRes] = await Promise.all([
        api.get('/autodj/playlists'),
        api.get('/streams')
      ]);
      setPlaylists(playlistsRes.data);
      setStreams(streamsRes.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load AutoDJ data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    try {
      await api.post('/autodj/playlists', playlistForm);
      toast({
        title: "Success",
        description: "Playlist created successfully",
      });
      setShowCreatePlaylist(false);
      setPlaylistForm({
        name: '',
        streamId: '',
        shuffle: true,
        crossfade: 5,
        schedule: 'continuous'
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive"
      });
    }
  };

  const togglePlaylist = async (playlistId, enabled) => {
    try {
      await api.post(`/autodj/playlists/${playlistId}/${enabled ? 'enable' : 'disable'}`);
      toast({
        title: "Success",
        description: `Playlist ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${enabled ? 'enable' : 'disable'} playlist`,
        variant: "destructive"
      });
    }
  };

  const deletePlaylist = async (playlistId) => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        await api.delete(`/autodj/playlists/${playlistId}`);
        toast({
          title: "Success",
          description: "Playlist deleted successfully",
        });
        fetchData();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete playlist",
          variant: "destructive"
        });
      }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AutoDJ</h1>
          <p className="text-gray-600">Manage automated playlists and scheduling</p>
        </div>
        <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create AutoDJ Playlist</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Playlist Name</label>
                <Input
                  value={playlistForm.name}
                  onChange={(e) => setPlaylistForm({...playlistForm, name: e.target.value})}
                  placeholder="My Playlist"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stream</label>
                <Select value={playlistForm.streamId} onValueChange={(value) => setPlaylistForm({...playlistForm, streamId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a stream" />
                  </SelectTrigger>
                  <SelectContent>
                    {streams.map(stream => (
                      <SelectItem key={stream.id} value={stream.id}>
                        {stream.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Shuffle Mode</label>
                <Switch
                  checked={playlistForm.shuffle}
                  onCheckedChange={(checked) => setPlaylistForm({...playlistForm, shuffle: checked})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Crossfade Duration (seconds)</label>
                <Input
                  type="number"
                  value={playlistForm.crossfade}
                  onChange={(e) => setPlaylistForm({...playlistForm, crossfade: parseInt(e.target.value)})}
                  min="0"
                  max="30"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Schedule</label>
                <Select value={playlistForm.schedule} onValueChange={(value) => setPlaylistForm({...playlistForm, schedule: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="continuous">Continuous</SelectItem>
                    <SelectItem value="scheduled">Scheduled Times</SelectItem>
                    <SelectItem value="fallback">Fallback Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreatePlaylist(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                  Create Playlist
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* AutoDJ Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Playlists</p>
                <p className="text-3xl font-bold text-gray-900">
                  {playlists.filter(p => p.enabled).length}
                </p>
              </div>
              <Shuffle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tracks</p>
                <p className="text-3xl font-bold text-gray-900">
                  {playlists.reduce((total, playlist) => total + (playlist.trackCount || 0), 0)}
                </p>
              </div>
              <Music className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Running Time</p>
                <p className="text-3xl font-bold text-gray-900">24h</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Playlists */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <List className="w-5 h-5 mr-2" />
            AutoDJ Playlists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {playlists.length === 0 ? (
              <div className="text-center py-8">
                <Shuffle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No playlists found</h3>
                <p className="text-gray-600 mb-4">Create your first AutoDJ playlist to get started</p>
                <Button onClick={() => setShowCreatePlaylist(true)} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Playlist
                </Button>
              </div>
            ) : (
              playlists.map((playlist) => (
                <div key={playlist.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{playlist.name}</h3>
                        <Badge variant={playlist.enabled ? 'default' : 'secondary'}>
                          {playlist.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span>{playlist.trackCount || 0} tracks</span>
                        <span className="mx-2">•</span>
                        <span>Stream: {streams.find(s => s.id === playlist.streamId)?.name || 'Unknown'}</span>
                        <span className="mx-2">•</span>
                        <span>{playlist.shuffle ? 'Shuffle' : 'Sequential'}</span>
                      </div>
                      {playlist.currentTrack && (
                        <div className="text-sm text-blue-600 mt-1">
                          Now Playing: {playlist.currentTrack}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={playlist.enabled}
                      onCheckedChange={(checked) => togglePlaylist(playlist.id, checked)}
                    />
                    <Button size="sm" variant="outline">
                      {playlist.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="outline">
                      <SkipForward className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deletePlaylist(playlist.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Global AutoDJ Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Global Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enable AutoDJ Globally</label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Auto-start on Stream Start</label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Fallback to AutoDJ</label>
                <Switch defaultChecked />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Default Crossfade (seconds)</label>
                <Input type="number" defaultValue="5" min="0" max="30" />
              </div>
              <div>
                <label className="text-sm font-medium">Silence Threshold</label>
                <Select defaultValue="5">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 seconds</SelectItem>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="15">15 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-orange-500 hover:bg-orange-600">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoDJ;