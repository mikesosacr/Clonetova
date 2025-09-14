import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Settings, 
  Trash2, 
  Plus,
  Radio,
  Users,
  Volume2,
  Wifi,
  Edit
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

const StreamManagement = () => {
  const { api } = useAuth();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStream, setSelectedStream] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    port: '',
    mountPoint: '/stream',
    bitrate: '128',
    format: 'MP3',
    maxListeners: '50',
    password: ''
  });

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const response = await api.get('/streams');
      setStreams(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load streams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStreamAction = async (streamId, action) => {
    try {
      await api.post(`/streams/${streamId}/${action}`);
      toast({
        title: "Success",
        description: `Stream ${action} successful`,
      });
      fetchStreams();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} stream`,
        variant: "destructive"
      });
    }
  };

  const handleCreateStream = async (e) => {
    e.preventDefault();
    try {
      await api.post('/streams', formData);
      toast({
        title: "Success",
        description: "Stream created successfully",
      });
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        port: '',
        mountPoint: '/stream',
        bitrate: '128',
        format: 'MP3',
        maxListeners: '50',
        password: ''
      });
      fetchStreams();
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create stream",
        variant: "destructive"
      });
    }
  };

  const handleDeleteStream = async (streamId) => {
    if (window.confirm('Are you sure you want to delete this stream?')) {
      try {
        await api.delete(`/streams/${streamId}`);
        toast({
          title: "Success",
          description: "Stream deleted successfully",
        });
        fetchStreams();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete stream",
          variant: "destructive"
        });
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
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
          <h1 className="text-3xl font-bold text-gray-900">Stream Management</h1>
          <p className="text-gray-600">Manage your radio streams</p>
        </div>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Stream
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Stream</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStream} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Stream Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="My Radio Stream"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Stream description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Port</label>
                  <Input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: e.target.value})}
                    placeholder="8000"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Mount Point</label>
                  <Input
                    value={formData.mountPoint}
                    onChange={(e) => setFormData({...formData, mountPoint: e.target.value})}
                    placeholder="/stream"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Bitrate</label>
                  <Select value={formData.bitrate} onValueChange={(value) => setFormData({...formData, bitrate: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="64">64 kbps</SelectItem>
                      <SelectItem value="128">128 kbps</SelectItem>
                      <SelectItem value="192">192 kbps</SelectItem>
                      <SelectItem value="256">256 kbps</SelectItem>
                      <SelectItem value="320">320 kbps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Format</label>
                  <Select value={formData.format} onValueChange={(value) => setFormData({...formData, format: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MP3">MP3</SelectItem>
                      <SelectItem value="AAC">AAC</SelectItem>
                      <SelectItem value="OGG">OGG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Max Listeners</label>
                  <Input
                    type="number"
                    value={formData.maxListeners}
                    onChange={(e) => setFormData({...formData, maxListeners: e.target.value})}
                    placeholder="50"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Admin Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Stream admin password"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                  Create Stream
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Streams List */}
      <div className="grid gap-4">
        {streams.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No streams found</h3>
              <p className="text-gray-600 mb-4">Create your first stream to get started</p>
              <Button onClick={() => setShowCreateForm(true)} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Stream
              </Button>
            </CardContent>
          </Card>
        ) : (
          streams.map((stream) => (
            <Card key={stream.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{stream.name}</h3>
                      <Badge variant={stream.status === 'online' ? 'default' : 'secondary'}>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(stream.status)} mr-2`}></div>
                        {stream.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-4">{stream.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Wifi className="w-4 h-4 text-gray-400" />
                        <span>Port: {stream.port}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{stream.currentListeners || 0}/{stream.maxListeners} listeners</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Volume2 className="w-4 h-4 text-gray-400" />
                        <span>{stream.bitrate} kbps {stream.format}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Radio className="w-4 h-4 text-gray-400" />
                        <span>{stream.mountPoint}</span>
                      </div>
                    </div>
                    
                    {stream.currentTrack && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-900">Now Playing:</div>
                        <div className="text-sm text-blue-700">{stream.currentTrack}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-6">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStreamAction(stream.id, stream.status === 'online' ? 'stop' : 'start')}
                      className="flex items-center space-x-1"
                    >
                      {stream.status === 'online' ? 
                        <><Square className="w-4 h-4" /> <span>Stop</span></> :
                        <><Play className="w-4 h-4" /> <span>Start</span></>
                      }
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStreamAction(stream.id, 'restart')}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    
                    <Button size="sm" variant="outline">
                      <Settings className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteStream(stream.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default StreamManagement;