#!/bin/bash
# Deployment script for ankeng.com
# Run this on your Ubuntu VPS after initial setup

set -e

echo "🚀 Starting deployment for ankeng.com..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/ankeng"
DOMAIN="ankeng.com"

echo -e "${YELLOW}Step 1: Updating system...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}Step 2: Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo -e "${YELLOW}Step 3: Installing PM2...${NC}"
sudo npm install -g pm2

echo -e "${YELLOW}Step 4: Installing Nginx...${NC}"
sudo apt install -y nginx

echo -e "${YELLOW}Step 5: Installing Certbot for SSL...${NC}"
sudo apt install -y certbot python3-certbot-nginx

echo -e "${YELLOW}Step 6: Creating app directory...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

echo -e "${YELLOW}Step 7: Copying application files...${NC}"
# Copy your project files to the server (run this locally)
# rsync -avz --exclude 'node_modules' --exclude '.git' ./ user@your-server:/var/www/ankeng/

echo -e "${YELLOW}Step 8: Installing dependencies...${NC}"
cd $APP_DIR
npm install --production

echo -e "${YELLOW}Step 9: Building frontend...${NC}"
cd $APP_DIR/new-frontend
npm install
npm run build
cd $APP_DIR

echo -e "${YELLOW}Step 10: Building backend...${NC}"
npm run build

echo -e "${YELLOW}Step 11: Setting up environment...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${RED}Please edit .env file with your production values!${NC}"
    nano .env
fi

echo -e "${YELLOW}Step 12: Configuring Nginx...${NC}"
sudo cp deploy/nginx.conf /etc/nginx/sites-available/$DOMAIN
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo -e "${YELLOW}Step 13: Setting up SSL...${NC}"
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m your-email@example.com

echo -e "${YELLOW}Step 14: Starting application with PM2...${NC}"
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Your app should be available at https://${DOMAIN}${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart app"
echo "  sudo certbot renew  - Renew SSL certificate"
