#!/bin/bash
set -e

echo "=== CentovaCast Clone Installation Script for Ubuntu ==="
echo "This script will install and configure the CentovaCast clone on Ubuntu Linux"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should NOT be run as root for security reasons."
   echo "Please run as a regular user with sudo privileges."
   exit 1
fi

# Check Ubuntu version
if ! grep -q "Ubuntu" /etc/os-release; then
    echo "This script is designed for Ubuntu Linux only."
    exit 1
fi

echo "Detected Ubuntu version:"
lsb_release -d

# Update system
echo "=== Updating system packages ==="
sudo apt update && sudo apt upgrade -y

# Install required system packages
echo "=== Installing system dependencies ==="
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    mongodb \
    icecast2 \
    supervisor \
    git \
    curl \
    build-essential \
    ffmpeg \
    certbot \
    python3-certbot-nginx

# Install Yarn
echo "=== Installing Yarn ==="
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install -y yarn

# Create application user
echo "=== Creating application user ==="
if ! id "centovacast" &>/dev/null; then
    sudo useradd -m -s /bin/bash centovacast
    sudo usermod -aG sudo centovacast
    echo "User 'centovacast' created"
else
    echo "User 'centovacast' already exists"
fi

# Create application directories
echo "=== Setting up application directories ==="
sudo mkdir -p /opt/centovacast
sudo mkdir -p /var/log/centovacast
sudo mkdir -p /etc/centovacast
sudo mkdir -p /opt/centovacast/media
sudo mkdir -p /opt/centovacast/streams

# Set permissions
sudo chown -R centovacast:centovacast /opt/centovacast
sudo chown -R centovacast:centovacast /var/log/centovacast
sudo chmod 755 /opt/centovacast
sudo chmod 755 /var/log/centovacast

# Copy application files
echo "=== Copying application files ==="
sudo cp -r . /opt/centovacast/
sudo chown -R centovacast:centovacast /opt/centovacast

# Switch to application user for the rest of the installation
sudo -u centovacast bash << 'EOF'
cd /opt/centovacast

# Create Python virtual environment
echo "=== Creating Python virtual environment ==="
python3 -m venv backend/venv
source backend/venv/bin/activate

# Install Python dependencies
echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r backend/requirements.txt

# Install Node.js dependencies
echo "=== Installing Node.js dependencies ==="
cd frontend
yarn install
yarn build
cd ..

echo "Dependencies installed successfully"
EOF

# Configure MongoDB
echo "=== Configuring MongoDB ==="
sudo systemctl enable mongod
sudo systemctl start mongod

# Wait for MongoDB to start
sleep 5

# Create MongoDB user and database
echo "=== Setting up MongoDB database ==="
sudo -u centovacast mongo << 'EOF'
use centovacast
db.createUser({
  user: "centovacast",
  pwd: "centovacast123",
  roles: ["readWrite"]
})
EOF

# Create environment files
echo "=== Creating environment configuration ==="
sudo -u centovacast cat > /opt/centovacast/backend/.env << 'EOF'
MONGO_URL=mongodb://centovacast:centovacast123@localhost:27017/centovacast
DB_NAME=centovacast
SECRET_KEY=your-super-secret-jwt-key-change-in-production
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

sudo -u centovacast cat > /opt/centovacast/frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Configure IceCast
echo "=== Configuring IceCast ==="
sudo sed -i 's/<source-password>hackme<\/source-password>/<source-password>icecast123<\/source-password>/' /etc/icecast2/icecast.xml
sudo sed -i 's/<relay-password>hackme<\/relay-password>/<relay-password>icecast123<\/relay-password>/' /etc/icecast2/icecast.xml
sudo sed -i 's/<admin-password>hackme<\/admin-password>/<admin-password>icecast123<\/admin-password>/' /etc/icecast2/icecast.xml

# Enable IceCast
sudo sed -i 's/ENABLE=false/ENABLE=true/' /etc/default/icecast2
sudo systemctl enable icecast2

# Configure Supervisor
echo "=== Configuring Supervisor ==="
sudo cat > /etc/supervisor/conf.d/centovacast.conf << 'EOF'
[program:centovacast-backend]
command=/opt/centovacast/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=/opt/centovacast/backend
user=centovacast
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/centovacast/backend.log
environment=PATH="/opt/centovacast/backend/venv/bin"

[program:centovacast-frontend]
command=npx serve -s build -l 3000
directory=/opt/centovacast/frontend
user=centovacast
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/centovacast/frontend.log
EOF

# Configure Nginx
echo "=== Configuring Nginx ==="
sudo cat > /etc/nginx/sites-available/centovacast << 'EOF'
server {
    listen 80;
    server_name localhost;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static {
        alias /opt/centovacast/frontend/build/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
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

# Test Nginx configuration
sudo nginx -t

# Configure firewall
echo "=== Configuring firewall ==="
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8000:8100/tcp  # IceCast streams
sudo ufw --force enable

# Start services
echo "=== Starting services ==="
sudo systemctl reload supervisor
sudo systemctl enable supervisor
sudo systemctl start supervisor

sudo systemctl enable nginx
sudo systemctl restart nginx

# Create systemd service (alternative to supervisor)
echo "=== Creating systemd services ==="
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

sudo systemctl daemon-reload
sudo systemctl enable centovacast

# Create management script
echo "=== Creating management script ==="
sudo cat > /usr/local/bin/centovacast << 'EOF'
#!/bin/bash

case "$1" in
    start)
        echo "Starting CentovaCast services..."
        sudo systemctl start mongod
        sudo systemctl start centovacast
        sudo systemctl start nginx
        sudo systemctl start icecast2
        echo "CentovaCast started successfully!"
        ;;
    stop)
        echo "Stopping CentovaCast services..."
        sudo systemctl stop icecast2
        sudo systemctl stop nginx
        sudo systemctl stop centovacast
        echo "CentovaCast stopped successfully!"
        ;;
    restart)
        echo "Restarting CentovaCast services..."
        sudo systemctl restart mongod
        sudo systemctl restart centovacast
        sudo systemctl restart nginx
        sudo systemctl restart icecast2
        echo "CentovaCast restarted successfully!"
        ;;
    status)
        echo "=== CentovaCast Services Status ==="
        sudo systemctl status mongod --no-pager -l
        sudo systemctl status centovacast --no-pager -l
        sudo systemctl status nginx --no-pager -l
        sudo systemctl status icecast2 --no-pager -l
        ;;
    logs)
        echo "=== Backend Logs ==="
        sudo tail -f /var/log/centovacast/backend.log
        ;;
    *)
        echo "Usage: centovacast {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
EOF

sudo chmod +x /usr/local/bin/centovacast

echo ""
echo "=== Installation Complete! ==="
echo ""
echo "CentovaCast has been successfully installed on your Ubuntu server."
echo ""
echo "Default login credentials:"
echo "  Email: admin@centovacast.local"
echo "  Password: admin123"
echo ""
echo "Service Management:"
echo "  Start:   centovacast start"
echo "  Stop:    centovacast stop"
echo "  Restart: centovacast restart"
echo "  Status:  centovacast status"
echo "  Logs:    centovacast logs"
echo ""
echo "Access your CentovaCast installation at: http://your-server-ip"
echo ""
echo "Important Security Notes:"
echo "1. Change the default admin password immediately"
echo "2. Update the JWT secret key in /opt/centovacast/backend/.env"
echo "3. Configure SSL/HTTPS for production use"
echo "4. Review firewall settings for your network"
echo ""
echo "For SSL setup, run: sudo certbot --nginx -d your-domain.com"
echo ""

# Start services
echo "Starting CentovaCast services..."
sudo systemctl start mongod
sudo systemctl start centovacast
sudo systemctl start nginx

echo "Installation completed successfully!"
echo "Please reboot your system to ensure all services start correctly."