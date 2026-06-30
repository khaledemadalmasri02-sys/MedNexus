# Deployment Guide for ankeng.com

## Prerequisites

1. A VPS server (Ubuntu 22.04 recommended)
2. A domain name (ankeng.com) pointed to your server's IP
3. SSH access to your server

## Server Setup

### 1. Get a VPS Server

Recommended providers:
- **DigitalOcean**: $4/month basic droplet (https://digitalocean.com)
- **Vultr**: $3.50/month basic instance (https://vultr.com)
- **Hetzner**: €3.29/month (https://hetzner.com)

**Minimum specs:** 1 vCPU, 1GB RAM, 25GB SSD

### 2. Point Your Domain to Your Server

In your domain registrar's DNS settings, create an A record:
```
Type: A
Name: @
Value: YOUR_SERVER_IP
TTL: 3600
```

Also create a www CNAME:
```
Type: CNAME
Name: www
Value: ankeng.com
TTL: 3600
```

### 3. Initial Server Setup

SSH into your server and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Create a deploy user (optional but recommended)
sudo adduser deploy
sudo usermod -aG sudo deploy
su - deploy

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 4. Deploy the Application

From your local machine, copy the project to your server:

```bash
# Create a tarball of your project (excluding node_modules)
tar -czf ankeng.tar.gz --exclude='node_modules' --exclude='.git' --exclude='new-frontend/node_modules' .

# Copy to server
scp ankeng.tar.gz deploy@YOUR_SERVER_IP:/var/www/

# SSH into server
ssh deploy@YOUR_SERVER_IP

# Extract
cd /var/www
tar -xzf ankeng.tar.gz
mv "new app" ankeng  # or whatever your folder is named
cd ankeng
```

### 5. Install Dependencies and Build

```bash
# Install backend dependencies
npm install --production

# Install and build frontend
cd new-frontend
npm install
npm run build
cd ..

# Build backend
npm run build
```

### 6. Configure Environment

```bash
# Copy production env template
cp deploy/.env.production .env

# Edit with your values
nano .env
```

Make sure to set:
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `JWT_SECRET` - A random secret string
- `SESSION_SECRET` - A random secret string

### 7. Configure Nginx

```bash
# Copy nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/ankeng.com

# Enable the site
sudo ln -sf /etc/nginx/sites-available/ankeng.com /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 8. Set Up SSL with Let's Encrypt

```bash
# Get SSL certificate
sudo certbot --nginx -d ankeng.com -d www.ankeng.com --non-interactive --agree-tos -m your-email@example.com

# Auto-renewal is set up automatically
```

### 9. Start the Application

```bash
# Start with PM2
pm2 start deploy/ecosystem.config.js

# Save PM2 config
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

### 10. Verify Deployment

```bash
# Check app status
pm2 status

# Check logs
pm2 logs

# Test health endpoint
curl https://ankeng.com/healthz
```

## Updating the Application

```bash
# Pull latest changes (if using git)
git pull

# Install dependencies
npm install --production
cd new-frontend && npm install && npm run build && cd ..
npm run build

# Restart app
pm2 restart ankeng-api
```

## Useful Commands

```bash
# View logs
pm2 logs ankeng-api

# Monitor resources
pm2 monit

# Restart app
pm2 restart ankeng-api

# Stop app
pm2 stop ankeng-api

# Check nginx status
sudo systemctl status nginx

# Renew SSL certificate
sudo certbot renew

# View nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### App not starting
```bash
pm2 logs ankeng-api
```

### 502 Bad Gateway
```bash
# Check if app is running
pm2 status

# Check nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### SSL issues
```bash
# Re-run certbot
sudo certbot --nginx -d ankeng.com -d www.ankeng.com
```

## Security Notes

1. Keep your server updated: `sudo apt update && sudo apt upgrade -y`
2. Use UFW firewall: `sudo ufw allow 'Nginx Full' && sudo ufw enable`
3. Regularly check logs for suspicious activity
4. Keep your API keys secure in .env file
5. Set proper file permissions: `chmod 600 .env`
