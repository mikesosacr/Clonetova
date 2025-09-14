# CentovaCast Clone - Radio Streaming Server Control Panel

A complete, feature-rich clone of CentovaCast designed for Ubuntu Linux servers. This application provides a comprehensive web-based control panel for managing internet radio streaming servers with IceCast integration.

## Features

### 🎵 **Stream Management**
- Create, configure, and manage multiple radio streams
- Real-time stream control (start/stop/restart)
- IceCast server integration
- Configurable bitrates, formats (MP3/AAC/OGG), and listener limits
- Live stream monitoring and statistics

### 📚 **Media Library**
- Upload and organize music files
- Support for MP3, WAV, FLAC, AAC, OGG formats
- Drag-and-drop file upload interface
- Media search and filtering
- File management and organization

### 🤖 **AutoDJ System**
- Automated playlist management
- Crossfading between tracks
- Shuffle and sequential playback modes
- Scheduled playlist rotation
- Fallback stream configuration

### 📊 **Real-time Statistics**
- Listener analytics and demographics
- Peak and average listener tracking
- Stream performance monitoring
- Historical data and reporting
- Geographic listener distribution

### 👥 **User Management**
- Role-based access control (Admin/DJ/User)
- User account management
- Authentication and authorization
- Activity logging and monitoring

### ⚙️ **Server Administration**
- System resource monitoring
- Stream server configuration
- Global settings management
- Security and access controls

## System Requirements

### Minimum Requirements
- Ubuntu 18.04 LTS or newer
- 2 GB RAM
- 2 CPU cores
- 20 GB disk space
- Internet connection

### Recommended Requirements
- Ubuntu 20.04 LTS or Ubuntu 22.04 LTS
- 4 GB RAM
- 4 CPU cores
- 50 GB disk space
- SSD storage for better performance

## Quick Installation

### Automated Installation (Recommended)

1. **Download and run the installation script:**
```bash
wget https://raw.githubusercontent.com/your-repo/centovacast-clone/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

2. **Access your installation:**
- Open your web browser
- Navigate to `http://your-server-ip`
- Login with default credentials:
  - Email: `admin@centovacast.local`
  - Password: `admin123`

### Manual Installation

If you prefer to install manually or need custom configuration:

#### 1. Install System Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx mongodb icecast2 supervisor git curl build-essential ffmpeg
```

#### 2. Install Yarn
```bash
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install -y yarn
```

#### 3. Create Application User
```bash
sudo useradd -m -s /bin/bash centovacast
sudo usermod -aG sudo centovacast
```

#### 4. Setup Application
```bash
# Clone repository
git clone https://github.com/your-repo/centovacast-clone.git /opt/centovacast
sudo chown -R centovacast:centovacast /opt/centovacast
cd /opt/centovacast

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
yarn install
yarn build
```

#### 5. Configure Services
```bash
# Configure MongoDB
sudo systemctl enable mongod
sudo systemctl start mongod

# Configure IceCast
sudo sed -i 's/ENABLE=false/ENABLE=true/' /etc/default/icecast2
sudo systemctl enable icecast2

# Configure Nginx (see installation script for full config)
# Configure Supervisor (see installation script for full config)
```

## Configuration

### Environment Variables

#### Backend Configuration (`backend/.env`)
```env
MONGO_URL=mongodb://centovacast:centovacast123@localhost:27017/centovacast
DB_NAME=centovacast
SECRET_KEY=your-super-secret-jwt-key-change-in-production
```

#### Frontend Configuration (`frontend/.env`)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Default Ports
- **Web Interface:** 80 (HTTP) / 443 (HTTPS)
- **Backend API:** 8001
- **Frontend:** 3000 (internal)
- **IceCast Streams:** 8000-8100 (configurable)
- **MongoDB:** 27017 (internal)

## Service Management

Use the convenient management script:

```bash
# Start all services
centovacast start

# Stop all services
centovacast stop

# Restart all services
centovacast restart

# Check service status
centovacast status

# View backend logs
centovacast logs
```

### Individual Service Management
```bash
# Backend service
sudo systemctl start centovacast
sudo systemctl stop centovacast
sudo systemctl restart centovacast

# Web server
sudo systemctl restart nginx

# Database
sudo systemctl restart mongod

# IceCast server
sudo systemctl restart icecast2
```

## Security Configuration

### 1. Change Default Passwords
```bash
# Access the web interface and change admin password
# Update IceCast passwords in /etc/icecast2/icecast.xml
```

### 2. Configure SSL/HTTPS (Production)
```bash
# Install SSL certificate using Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

### 3. Firewall Configuration
```bash
sudo ufw enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8000:8100/tcp  # IceCast streams
```

### 4. Secure MongoDB
```bash
# Enable MongoDB authentication
sudo nano /etc/mongod.conf
# Add: security.authorization: enabled
sudo systemctl restart mongod
```

## Usage Guide

### Creating Your First Stream

1. **Login to Web Interface**
   - Navigate to your server's IP address
   - Use default credentials or your custom admin account

2. **Create a Stream**
   - Go to "Streams" section
   - Click "Create Stream"
   - Configure stream settings:
     - Name and description
     - Port number (8000-8100)
     - Bitrate and format
     - Maximum listeners
     - Admin password

3. **Start Your Stream**
   - Click the "Start" button on your stream
   - Stream will be available at `http://your-server:port/mountpoint`

### Uploading Media

1. **Access Media Library**
   - Navigate to "Media Library" section
   - Click "Upload Files"

2. **Upload Audio Files**
   - Drag and drop files or click to browse
   - Supported formats: MP3, WAV, FLAC, AAC, OGG
   - Files are automatically processed and catalogued

### Setting Up AutoDJ

1. **Create Playlist**
   - Go to "AutoDJ" section
   - Click "Create Playlist"
   - Select target stream
   - Configure playback settings

2. **Add Tracks to Playlist**
   - Use the media library to add tracks
   - Configure crossfade and shuffle settings
   - Enable the playlist

## API Documentation

The backend provides a comprehensive REST API for all functionality:

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user

### Stream Management
- `GET /api/streams` - List all streams
- `POST /api/streams` - Create new stream
- `POST /api/streams/{id}/start` - Start stream
- `POST /api/streams/{id}/stop` - Stop stream
- `DELETE /api/streams/{id}` - Delete stream

### Media Library
- `GET /api/media` - List media files
- `POST /api/media/upload` - Upload media files
- `DELETE /api/media/{id}` - Delete media file

### Statistics
- `GET /api/statistics` - Get streaming statistics
- `GET /api/dashboard/stats` - Get dashboard overview

## Troubleshooting

### Common Issues

#### Stream Won't Start
1. Check if port is already in use:
   ```bash
   sudo netstat -tlnp | grep :8000
   ```
2. Verify IceCast is running:
   ```bash
   sudo systemctl status icecast2
   ```
3. Check backend logs:
   ```bash
   centovacast logs
   ```

#### Can't Access Web Interface
1. Check Nginx status:
   ```bash
   sudo systemctl status nginx
   ```
2. Verify services are running:
   ```bash
   centovacast status
   ```
3. Check firewall settings:
   ```bash
   sudo ufw status
   ```

#### Database Connection Issues
1. Check MongoDB status:
   ```bash
   sudo systemctl status mongod
   ```
2. Verify database credentials in backend/.env
3. Test database connection:
   ```bash
   mongo centovacast -u centovacast -p
   ```

### Log Locations
- **Backend logs:** `/var/log/centovacast/backend.log`
- **Frontend logs:** `/var/log/centovacast/frontend.log`
- **Nginx logs:** `/var/log/nginx/error.log`
- **IceCast logs:** `/var/log/icecast2/error.log`

## Development

### Local Development Setup
```bash
# Backend development
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend development
cd frontend
yarn install
yarn start
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the system logs

## Acknowledgments

- Inspired by the original CentovaCast application
- Built with FastAPI, React, and MongoDB
- Uses IceCast for streaming server functionality