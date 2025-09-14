import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  Upload, 
  Music, 
  Search, 
  Play, 
  Trash2, 
  Download, 
  Filter,
  Grid,
  List,
  Folder,
  File
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

const MediaLibrary = () => {
  const { api } = useAuth();
  const fileInputRef = useRef();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedTracks, setSelectedTracks] = useState([]);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const response = await api.get('/media');
      setTracks(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load media library",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    setUploading(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      
      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });
      
      fetchTracks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteTrack = async (trackId) => {
    if (window.confirm('Are you sure you want to delete this track?')) {
      try {
        await api.delete(`/media/${trackId}`);
        toast({
          title: "Success",
          description: "Track deleted successfully",
        });
        fetchTracks();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete track",
          variant: "destructive"
        });
      }
    }
  };

  const filteredTracks = tracks.filter(track =>
    track.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.album?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600">Manage your music files</p>
        </div>
        <Button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-orange-500 hover:bg-orange-600"
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Upload className="w-6 h-6 text-orange-500" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tracks, artists, albums..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Grid/List */}
      {filteredTracks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No media files found</h3>
            <p className="text-gray-600 mb-4">Upload your first audio files to get started</p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
          {filteredTracks.map((track) => (
            <Card key={track.id} className={`${viewMode === 'list' ? 'hover:bg-gray-50' : ''} transition-colors`}>
              <CardContent className={viewMode === 'grid' ? 'p-4' : 'p-3'}>
                {viewMode === 'grid' ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <Music className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 truncate" title={track.title}>
                      {track.title || track.filename}
                    </h3>
                    <p className="text-xs text-gray-600 mb-1 truncate" title={track.artist}>
                      {track.artist || 'Unknown Artist'}
                    </p>
                    <p className="text-xs text-gray-500 mb-3 truncate" title={track.album}>
                      {track.album || 'Unknown Album'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>{formatDuration(track.duration || 0)}</span>
                      <span>{formatFileSize(track.fileSize || 0)}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteTrack(track.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded flex items-center justify-center">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{track.title || track.filename}</h3>
                      <p className="text-sm text-gray-600 truncate">
                        {track.artist || 'Unknown Artist'} • {track.album || 'Unknown Album'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDuration(track.duration || 0)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(track.fileSize || 0)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteTrack(track.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;