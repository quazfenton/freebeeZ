# FreebeeZ Setup Guide

This guide will help you set up FreebeeZ on your local machine or server.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm/pnpm
- **Python 3.8+** with pip
- **Chrome/Chromium browser** (for Playwright automation)
- **Git** (for cloning the repository)

## Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/freebeeZ.git
cd freebeeZ
```

### 2. Automated Setup

Run the automated setup script:

```bash
npm run setup
```

This will:
- Install Node.js dependencies
- Install Python dependencies
- Install Playwright browsers
- Set up the development environment

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# CAPTCHA Solving Services (Optional but recommended)
NEXT_PUBLIC_2CAPTCHA_KEY=your_2captcha_api_key_here
NEXT_PUBLIC_ANTICAPTCHA_KEY=your_anticaptcha_api_key_here

# Encryption Key for Credential Storage (Required)
ENCRYPTION_KEY=your_secure_32_character_key_here

# Email Notifications (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Browser Settings
HEADLESS_BROWSER=true
MAX_CONCURRENT_BROWSERS=3
```

### 4. Start the Application

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`

## Manual Setup

If the automated setup doesn't work, follow these manual steps:

### 1. Install Node.js Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Playwright Browsers

```bash
playwright install chromium
```

### 4. Verify Installation

Check if everything is working:

```bash
npm run check:health
```

## Configuration Options

### CAPTCHA Solving Services

To enable automatic CAPTCHA solving, sign up for one of these services:

#### 2captcha.com (Recommended)
1. Sign up at https://2captcha.com
2. Get your API key from the dashboard
3. Add to `.env`: `NEXT_PUBLIC_2CAPTCHA_KEY=your_api_key`

#### anti-captcha.com (Alternative)
1. Sign up at https://anti-captcha.com
2. Get your API key
3. Add to `.env`: `NEXT_PUBLIC_ANTICAPTCHA_KEY=your_api_key`

### Email Notifications

To receive notifications about task completion:

1. Set up an email account (Gmail recommended)
2. Generate an app password
3. Configure in `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

### Proxy Configuration (Optional)

For enhanced privacy and avoiding rate limits:

```env
PROXY_HOST=your_proxy_host
PROXY_PORT=your_proxy_port
PROXY_USER=your_proxy_username
PROXY_PASS=your_proxy_password
```

## Testing the Setup

### 1. Test Service Discovery

```bash
npm run test:service protonmail
```

### 2. Test Browser Automation

```bash
npm run test:automation
```

### 3. Health Check

```bash
npm run check:health
```

## Troubleshooting

### Common Issues

#### 1. Python Dependencies Installation Failed

**Solution:**
```bash
# On Ubuntu/Debian
sudo apt-get update
sudo apt-get install python3-dev python3-pip

# On macOS
brew install python3

# Then retry
pip install -r requirements.txt
```

#### 2. Playwright Browser Installation Failed

**Solution:**
```bash
# Install system dependencies
npx playwright install-deps

# Install browsers
playwright install chromium
```

#### 3. Permission Errors

**Solution:**
```bash
# On Linux/macOS
sudo chown -R $USER:$USER .
chmod +x python_scripts/*.py
```

#### 4. Port Already in Use

**Solution:**
```bash
# Use a different port
npm run dev -- -p 3001
```

### Browser Issues

#### Chrome/Chromium Not Found

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install chromium-browser

# macOS
brew install chromium

# Or set custom path in .env
CHROME_EXECUTABLE_PATH=/path/to/chrome
```

#### Headless Mode Issues

If you're having issues with headless mode, try running in headed mode:

```env
HEADLESS_BROWSER=false
```

### Python Script Issues

#### Import Errors

**Solution:**
```bash
# Ensure all dependencies are installed
pip install -r requirements.txt

# Check Python path
which python3
```

#### Permission Denied

**Solution:**
```bash
chmod +x python_scripts/*.py
```

## Performance Optimization

### 1. Increase Concurrent Browsers

For faster processing (requires more RAM):

```env
MAX_CONCURRENT_BROWSERS=5
```

### 2. Adjust Request Delays

To avoid rate limiting:

```env
DELAY_BETWEEN_REQUESTS=3000
REQUESTS_PER_MINUTE=15
```

### 3. Enable Caching

For better performance with repeated operations:

```env
REDIS_URL=redis://localhost:6379
```

## Security Considerations

### 1. Secure Your Environment File

```bash
chmod 600 .env
```

### 2. Use Strong Encryption Key

Generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Regular Updates

Keep dependencies updated:

```bash
npm update
pip install -r requirements.txt --upgrade
```

## Production Deployment

### 1. Build for Production

```bash
npm run build
```

### 2. Start Production Server

```bash
npm start
```

### 3. Use Process Manager

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "freebeeZ" -- start
```

### 4. Set Up Reverse Proxy

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Backup and Recovery

### 1. Backup Data

```bash
npm run backup:data
```

### 2. Restore Data

```bash
npm run migrate
```

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the logs in the browser console
3. Check Python script outputs
4. Open an issue on GitHub with:
   - Your operating system
   - Node.js and Python versions
   - Error messages
   - Steps to reproduce

## Next Steps

Once FreebeeZ is running:

1. Visit the dashboard at `http://localhost:3000`
2. Click "Auto-Register Services" to start
3. Monitor progress in the Orchestration tab
4. Check the Services tab for connected accounts

Happy automating! 🤖✨