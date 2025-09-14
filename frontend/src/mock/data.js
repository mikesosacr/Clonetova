// Mock data for CentovaCast clone

export const streamStats = {
  currentListeners: 24,
  maxListeners: 100,
  bitrate: 128,
  format: 'MP3',
  uptime: '2d 14h 32m',
  status: 'online'
};

export const currentTrack = {
  title: 'The Phantom Beat',
  artist: 'Electronic Vibes',
  album: 'Digital Soundscapes',
  duration: '3:45',
  elapsed: '2:15',
  artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
};

export const recentTracks = [
  {
    id: 1,
    time: '14:32:15',
    listeners: 24,
    song: 'The Phantom Beat',
    artist: 'Electronic Vibes',
    duration: '3:45'
  },
  {
    id: 2,
    time: '14:28:30',
    listeners: 22,
    song: 'Night Echoes',
    artist: 'Synthwave Masters',
    duration: '4:12'
  },
  {
    id: 3,
    time: '14:24:18',
    listeners: 19,
    song: 'Urban Lights',
    artist: 'City Sounds',
    duration: '3:58'
  },
  {
    id: 4,
    time: '14:20:20',
    listeners: 17,
    song: 'Digital Dreams',
    artist: 'Cyber Collective',
    duration: '4:23'
  },
  {
    id: 5,
    time: '14:16:02',
    listeners: 21,
    song: 'Neon Pulse',
    artist: 'Retrowave Society',
    duration: '3:34'
  },
  {
    id: 6,
    time: '14:12:28',
    listeners: 18,
    song: 'Midnight Groove',
    artist: 'Electronic Vibes',
    duration: '4:01'
  }
];

export const serverInfo = {
  serverName: 'Radio Stream Server',
  location: 'New York, USA',
  provider: 'CloudStream Hosting',
  ip: '192.168.1.100',
  port: 8000,
  mountPoint: '/stream',
  maxBitrate: 320,
  genres: ['Electronic', 'House', 'Techno', 'Ambient']
};

export const userAccounts = [
  {
    id: 1,
    username: 'dj_phoenix',
    email: 'phoenix@radiostation.com',
    role: 'DJ',
    status: 'active',
    lastLogin: '2024-01-15 14:30:22'
  },
  {
    id: 2,
    username: 'admin_sarah',
    email: 'sarah@radiostation.com',
    role: 'Administrator',
    status: 'active',
    lastLogin: '2024-01-15 13:45:10'
  },
  {
    id: 3,
    username: 'dj_mike',
    email: 'mike@radiostation.com',
    role: 'DJ',
    status: 'inactive',
    lastLogin: '2024-01-14 20:15:33'
  }
];

export const playlists = [
  {
    id: 1,
    name: 'Morning Mix',
    tracks: 45,
    duration: '3h 22m',
    status: 'active',
    scheduled: '06:00 - 09:00'
  },
  {
    id: 2,
    name: 'Electronic Afternoon',
    tracks: 32,
    duration: '2h 45m',
    status: 'active',
    scheduled: '14:00 - 17:00'
  },
  {
    id: 3,
    name: 'Night Vibes',
    tracks: 28,
    duration: '2h 18m',
    status: 'scheduled',
    scheduled: '22:00 - 02:00'
  }
];

export const newsItems = [
  {
    id: 1,
    title: 'Centova Cast v3.2.12 Released',
    summary: 'Enhanced security updates, improved AutoDJ functionality, and better compatibility with modern streaming formats.',
    date: '2024-01-15',
    author: 'Centova Technologies'
  },
  {
    id: 2,
    title: 'New Mobile Interface Available',
    summary: 'Manage your streams on the go with our new responsive mobile interface.',
    date: '2024-01-10',
    author: 'Development Team'
  },
  {
    id: 3,
    title: 'Server Maintenance Scheduled',
    summary: 'Planned maintenance window scheduled for January 20th from 2:00 AM to 4:00 AM EST.',
    date: '2024-01-08',
    author: 'Operations Team'
  }
];