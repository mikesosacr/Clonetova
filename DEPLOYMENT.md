# CentovaCast Clone - Deployment Guide

This document provides comprehensive deployment instructions for the CentovaCast clone on Ubuntu Linux servers.

## 📋 Pre-Deployment Checklist

### Server Requirements
- [ ] Ubuntu 18.04 LTS or newer (20.04/22.04 recommended)
- [ ] Minimum 2GB RAM (4GB recommended)
- [ ] 2+ CPU cores
- [ ] 20GB+ disk space (SSD recommended)
- [ ] Root or sudo access
- [ ] Internet connection
- [ ] Domain name (optional, for SSL)

### Network Requirements
- [ ] Ports 80, 443 available for web access
- [ ] Ports 8000-8100 available for streaming
- [ ] Port 22 for SSH access
- [ ] Firewall configured appropriately

## 🚀 Quick Deployment (Automated)

### Step 1: Download and Run Installation Script

```bash
# Download the installation script
wget https://raw.githubusercontent.com/your-repo/centovacast-clone/main/install.sh

# Make it executable
chmod +x install.sh

# Run the installation (do NOT run as root)
./install.sh
```

The script will automatically:
- Install all system dependencies
- Configure MongoDB, IceCast, Nginx
- Set up the application
- Create systemd services
- Configure firewall
- Start all services

### Step 2: Access Your Installation

1. **Open your web browser**
2. **Navigate to:** `http://your-server-ip`
3. **Login with default credentials:**
   - Email: `admin@centovacast.local`
   - Password: `admin123`

### Step 3: Post-Installation Security

1. **Change default admin password immediately**
2. **Update JWT secret in** `/opt/centovacast/backend/.env`
3. **Configure SSL for production use**

## 🐳 Docker Deployment (Alternative)

### Prerequisites
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Deploy with Docker Compose
```bash
# Clone the repository
git clone https://github.com/your-repo/centovacast-clone.git
cd centovacast-clone

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Access Application
- **Web Interface:** http://localhost
- **Backend API:** http://localhost:8001

## ⚙️ Manual Deployment (Advanced)

### Step 1: System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    python3 python3-pip python3-venv \
    nodejs npm yarn \
    nginx mongodb icecast2 \
    supervisor git curl \
    build-essential ffmpeg
```

### Step 2: Create Application User

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash centovacast
sudo usermod -aG sudo centovacast

# Create directories
sudo mkdir -p /opt/centovacast
sudo mkdir -p /var/log/centovacast
sudo mkdir -p /opt/centovacast/media
sudo chown -R centovacast:centovacast /opt/centovacast
sudo chown -R centovacast:centovacast /var/log/centovacast
```

### Step 3: Application Setup

```bash
# Switch to application user
sudo su - centovacast

# Clone repository
git clone https://github.com/your-repo/centovacast-clone.git /opt/centovacast
cd /opt/centovacast

# Setup Python backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Setup Node.js frontend
cd ../frontend
yarn install
yarn build
```

### Step 4: Database Configuration

```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongo << 'EOF'
use centovacast
db.createUser({
  user: "centovacast",
  pwd: "centovacast123",
  roles: ["readWrite"]
})
EOF
```

### Step 5: Environment Configuration

Create backend environment file:
```bash
sudo -u centovacast cat > /opt/centovacast/backend/.env << 'EOF'
MONGO_URL=mongodb://centovacast:centovacast123@localhost:27017/centovacast
DB_NAME=centovacast
SECRET_KEY=your-super-secret-jwt-key-change-in-production
EOF
```

Create frontend environment file:
```bash
sudo -u centovacast cat > /opt/centovacast/frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
```

### Step 6: Service Configuration

#### Systemd Service for Backend
```bash
sudo cat > /etc/systemd/system/centovacast.service << 'EOF'
[Unit]
Description=CentovaCast Backend
After=network.target mongodb.service

[Service]
Type=simple
User=centovacast
WorkingDirectory=/opt/centovacast/backend
Environment=PATH=/opt/centovacast/backend/venv/bin
ExecStart=/opt/centovacast/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

#### Nginx Configuration
```bash
sudo cat > /etc/nginx/sites-available/centovacast << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /media {
        alias /opt/centovacast/media;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/centovacast /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

#### IceCast Configuration
```bash
# Enable IceCast
sudo sed -i 's/ENABLE=false/ENABLE=true/' /etc/default/icecast2

# Update passwords (optional)
sudo sed -i 's/<source-password>hackme<\/source-password>/<source-password>icecast123<\/source-password>/' /etc/icecast2/icecast.xml
sudo sed -i 's/<admin-password>hackme<\/admin-password>/<admin-password>icecast123<\/admin-password>/' /etc/icecast2/icecast.xml
```

### Step 7: Service Startup

```bash
# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable centovacast
sudo systemctl start centovacast

sudo systemctl enable nginx
sudo systemctl start nginx

sudo systemctl enable icecast2
sudo systemctl start icecast2

# Serve frontend (for production, use proper process manager)
cd /opt/centovacast/frontend
nohup npx serve -s build -l 3000 > /var/log/centovacast/frontend.log 2>&1 &
```

### Step 8: Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8000:8100/tcp  # IceCast streams
sudo ufw --force enable
```

## 🔒 Production Security Hardening

### 1. SSL/HTTPS Configuration

#### Using Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Manual SSL Certificate
```bash
# Generate self-signed certificate (development only)
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/centovacast.key \
    -out /etc/nginx/ssl/centovacast.crt

# Update Nginx configuration for HTTPS
```

### 2. Database Security

```bash
# Enable MongoDB authentication
sudo nano /etc/mongod.conf
# Add or uncomment:
# security:
#   authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

### 3. Application Security

```bash
# Change JWT secret key
sudo nano /opt/centovacast/backend/.env
# Update SECRET_KEY to a strong random value

# Restart backend service
sudo systemctl restart centovacast
```

### 4. System Security

```bash
# Update system packages regularly
sudo apt update && sudo apt upgrade

# Configure automatic updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# Disable root login (if not already done)
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh
```

## 📊 Monitoring and Maintenance

### Service Health Checks

```bash
# Check all services
systemctl status centovacast nginx mongod icecast2

# View logs
journalctl -u centovacast -f
tail -f /var/log/centovacast/backend.log
tail -f /var/log/nginx/error.log
```

### Resource Monitoring

```bash
# System resources
htop
df -h
free -m

# Network connections
ss -tlnp
netstat -tlnp | grep :80
```

### Backup Strategy

```bash
# Database backup
mongodump --uri="mongodb://centovacast:centovacast123@localhost:27017/centovacast" --out=/backup/mongo/$(date +%Y%m%d)

# Media files backup
rsync -av /opt/centovacast/media/ /backup/media/

# Configuration backup
tar -czf /backup/config/centovacast-config-$(date +%Y%m%d).tar.gz /opt/centovacast/backend/.env /opt/centovacast/frontend/.env /etc/nginx/sites-available/centovacast
```

## 🔧 Troubleshooting Common Issues

### Service Won't Start

```bash
# Check service status
systemctl status centovacast
journalctl -u centovacast

# Common fixes
sudo systemctl daemon-reload
sudo systemctl restart centovacast
```

### Port Conflicts

```bash
# Find what's using a port
sudo ss -tlnp | grep :8001
sudo lsof -i :8001

# Kill process if necessary
sudo kill -9 <PID>
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R centovacast:centovacast /opt/centovacast
sudo chmod -R 755 /opt/centovacast

# Fix media directory
sudo chown -R centovacast:centovacast /opt/centovacast/media
sudo chmod -R 755 /opt/centovacast/media
```

### Database Connection Issues

```bash
# Test MongoDB connection
mongo centovacast -u centovacast -p

# Check MongoDB logs
sudo journalctl -u mongod

# Restart MongoDB
sudo systemctl restart mongod
```

## 📈 Performance Optimization

### System Optimization

```bash
# Increase file limits for high-traffic servers
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize MongoDB
# Edit /etc/mongod.conf and adjust:
# - wiredTiger.engineConfig.cacheSizeGB
# - net.maxIncomingConnections
```

### Nginx Optimization

```bash
# Add to Nginx configuration
# worker_processes auto;
# worker_connections 1024;
# keepalive_timeout 65;
# gzip on;
```

### Application Scaling

For high-traffic deployments:

1. **Use a reverse proxy** (HAProxy, Nginx Plus)
2. **Deploy multiple backend instances** behind a load balancer
3. **Use MongoDB replica set** for database redundancy
4. **Implement Redis** for session storage and caching
5. **Use CDN** for static content delivery

## 🆘 Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Check service status
   - Review error logs
   - Monitor disk space
   - Backup database

2. **Monthly:**
   - Update system packages
   - Review security logs
   - Check SSL certificate expiry
   - Performance monitoring

3. **Quarterly:**
   - Security audit
   - Dependency updates
   - Backup strategy review
   - Disaster recovery testing

### Getting Help

1. **Check logs first:** Always start with system and application logs
2. **Verify configuration:** Ensure all configuration files are correct
3. **Test connectivity:** Verify network connectivity and DNS resolution
4. **Review documentation:** Check this deployment guide and README
5. **Community support:** Create an issue on GitHub with detailed error information

## 📝 Post-Deployment Checklist

After successful deployment:

- [ ] Changed default admin password
- [ ] Updated JWT secret key
- [ ] Configured SSL/HTTPS
- [ ] Set up automated backups
- [ ] Configured monitoring
- [ ] Reviewed firewall settings
- [ ] Tested stream creation and management
- [ ] Verified media upload functionality
- [ ] Tested AutoDJ features
- [ ] Documented custom configurations

Your CentovaCast clone is now ready for production use!