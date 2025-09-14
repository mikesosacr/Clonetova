# CentovaCast Clone - Backend Integration Contracts

## API Endpoints to Implement

### 1. Stream Management APIs
```
GET /api/streams - Get all streams
POST /api/streams - Create new stream
GET /api/streams/:id - Get specific stream
PUT /api/streams/:id - Update stream configuration
DELETE /api/streams/:id - Delete stream

POST /api/streams/:id/start - Start stream
POST /api/streams/:id/stop - Stop stream
POST /api/streams/:id/restart - Restart stream
```

### 2. Statistics APIs
```
GET /api/streams/:id/stats - Get stream statistics
GET /api/streams/:id/listeners - Get current listeners
GET /api/streams/:id/history - Get listener history
GET /api/streams/:id/tracks - Get recently played tracks
```

### 3. Media Library APIs
```
GET /api/media - Get media library
POST /api/media/upload - Upload media files
DELETE /api/media/:id - Delete media file
GET /api/playlists - Get all playlists
POST /api/playlists - Create playlist
PUT /api/playlists/:id - Update playlist
```

### 4. User Management APIs
```
POST /api/auth/login - User authentication
POST /api/auth/logout - User logout
GET /api/users - Get all users
POST /api/users - Create user
PUT /api/users/:id - Update user
```

## Mock Data Currently Used

### Frontend Mock Data (in /src/mock/data.js):
- `streamStats` - Current stream statistics and status
- `currentTrack` - Currently playing track information
- `recentTracks` - Historical track data for statistics table
- `serverInfo` - Server configuration details
- `userAccounts` - User account information
- `playlists` - AutoDJ playlist data
- `newsItems` - News and announcements

### Components Using Mock Data:
- `Dashboard.jsx` - Uses streamStats, currentTrack, recentTracks
- `ControlPanelPreview.jsx` - Uses embedded mock statistics
- `BottomCTA.jsx` - Uses newsItems for news section

## Database Models Needed

### 1. Stream Model
```javascript
{
  id: String,
  name: String,
  description: String,
  port: Number,
  mountPoint: String,
  bitrate: Number,
  format: String, // MP3, AAC, OGG
  status: String, // online, offline, error
  maxListeners: Number,
  currentListeners: Number,
  uptime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Track Model
```javascript
{
  id: String,
  streamId: String,
  title: String,
  artist: String,
  album: String,
  duration: Number, // in seconds
  playedAt: Date,
  listeners: Number
}
```

### 3. User Model
```javascript
{
  id: String,
  username: String,
  email: String,
  password: String, // hashed
  role: String, // admin, dj, user
  status: String, // active, inactive
  lastLogin: Date,
  createdAt: Date
}
```

### 4. Playlist Model
```javascript
{
  id: String,
  name: String,
  streamId: String,
  tracks: Array,
  schedule: String,
  status: String, // active, inactive
  createdAt: Date
}
```

## Frontend Integration Plan

### 1. Replace Mock Data with API Calls
- Update `Dashboard.jsx` to fetch real-time data from `/api/streams/:id/stats`
- Replace mock track history with actual API data
- Implement real stream control functionality (start/stop/pause)

### 2. Add Authentication Context
- Create AuthContext for user login/logout
- Protect dashboard routes with authentication
- Add login/register forms

### 3. Real-time Updates
- Implement WebSocket connection for live statistics updates
- Real-time listener count updates
- Live track change notifications

### 4. Form Functionality
- Add actual file upload for media library
- Implement playlist creation and management
- Stream configuration forms

## Business Logic to Implement

### 1. Stream Management
- Start/stop streaming servers (SHOUTcast/IceCast integration)
- Monitor stream health and auto-restart on failure
- Resource usage tracking and limits

### 2. Statistics Tracking
- Real-time listener counting
- Track play history logging
- Bandwidth usage monitoring
- Generate royalty reports

### 3. AutoDJ System
- Playlist scheduling and rotation
- Crossfading between tracks
- Automatic fallback to backup streams

### 4. User Management
- Role-based access control
- Stream ownership and permissions
- Account resource limits

## Integration Steps

1. **Authentication System** - Implement JWT-based auth with login/logout
2. **Basic CRUD APIs** - Create stream, user, and playlist management
3. **Real-time Statistics** - WebSocket integration for live data
4. **Stream Control** - Actual streaming server integration
5. **File Upload** - Media library with file management
6. **Advanced Features** - AutoDJ, scheduling, monitoring

This contracts file serves as the blueprint for converting the current mock-based frontend into a fully functional streaming radio control panel.