# NexusTraffic

## Stack
- **Backend**: Node.js + Express
- **Engine**: HTTP requests dengan real browser headers
- **Database**: SQLite (zero setup)
- **Scheduler**: node-cron (auto-pickup campaign)
- **Frontend**: Vanilla HTML/CSS/JS (no build step)

---

## Deploy ke VPS (Ubuntu 22.04)

### 1. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install PM2
```bash
npm install -g pm2
```

### 3. Clone & Install
```bash
git clone https://github.com/USERNAME/nexustraffic.git
cd nexustraffic
npm install
npx playwright install chromium --with-deps
```

### 4. Konfigurasi
```bash
cp .env.example .env
nano .env
```

Isi `.env`:
```
PORT=3000
PANEL_PASSWORD=passwordkamu123
MAX_CONCURRENT=3
```

### 5. Jalankan
```bash
pm2 start src/server.js --name nexustraffic
pm2 save
pm2 startup
```

### 6. (Opsional) Nginx reverse proxy
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/nexustraffic
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

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

```bash
sudo ln -s /etc/nginx/sites-available/nexustraffic /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### 7. SSL (opsional)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

## Spesifikasi VPS

| RAM | MAX_CONCURRENT |
|---|---|
| 1GB | 2 |
| 2GB | 3 |
| 4GB | 5 |
| 8GB | 10 |
