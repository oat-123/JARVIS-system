# คู่มือการ Deploy J.A.R.V.I.S Authentication System

## ตัวเลือกการ Deploy

### 1. Vercel (แนะนำสำหรับ Next.js)

#### ขั้นตอนการ Deploy บน Vercel

1. **เตรียมโปรเจค**
   ```bash
   # สร้างไฟล์ .env.production
   cp .env.example .env.production
   ```

2. **สร้างไฟล์ vercel.json**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "framework": "nextjs",
     "installCommand": "npm install",
     "devCommand": "npm run dev"
   }
   ```

3. **Deploy ผ่าน Vercel Dashboard**
   - ไปที่ [vercel.com](https://vercel.com)
   - เชื่อมต่อ GitHub repository
   - ตั้งค่า Environment Variables ใน Vercel Dashboard

4. **Environment Variables ที่ต้องตั้งค่าใน Vercel**
   ```
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_PRIVATE_KEY_ID=your-private-key-id
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
   ```

### 2. Netlify

#### ขั้นตอนการ Deploy บน Netlify

1. **สร้างไฟล์ netlify.toml**
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [build.environment]
     NODE_VERSION = "18"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy ผ่าน Netlify Dashboard**
   - ไปที่ [netlify.com](https://netlify.com)
   - เชื่อมต่อ GitHub repository
   - ตั้งค่า Environment Variables

### 3. Railway

#### ขั้นตอนการ Deploy บน Railway

1. **สร้างไฟล์ railway.json**
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "healthcheckPath": "/",
       "healthcheckTimeout": 100,
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

2. **Deploy ผ่าน Railway Dashboard**
   - ไปที่ [railway.app](https://railway.app)
   - เชื่อมต่อ GitHub repository
   - ตั้งค่า Environment Variables

### 4. Docker Deployment

#### สร้างไฟล์ Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### สร้างไฟล์ docker-compose.yml

```yaml
version: '3.8'
services:
  jarvis-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GOOGLE_PROJECT_ID=${GOOGLE_PROJECT_ID}
      - GOOGLE_PRIVATE_KEY_ID=${GOOGLE_PRIVATE_KEY_ID}
      - GOOGLE_PRIVATE_KEY=${GOOGLE_PRIVATE_KEY}
      - GOOGLE_CLIENT_EMAIL=${GOOGLE_CLIENT_EMAIL}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_SPREADSHEET_ID=${GOOGLE_SPREADSHEET_ID}
    restart: unless-stopped
```

### 5. Self-Hosted Server

#### ขั้นตอนการ Deploy บน Server

1. **เตรียม Server**
   ```bash
   # อัปเดตระบบ
   sudo apt update && sudo apt upgrade -y
   
   # ติดตั้ง Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # ติดตั้ง PM2 สำหรับ process management
   sudo npm install -g pm2
   ```

2. **Clone และ Deploy**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/jarvis-auth-system.git
   cd jarvis-auth-system
   
   # ติดตั้ง dependencies
   npm install
   
   # สร้างไฟล์ .env
   cp .env.example .env
   # แก้ไขไฟล์ .env ตามต้องการ
   
   # Build แอป
   npm run build
   
   # รันด้วย PM2
   pm2 start npm --name "jarvis-app" -- start
   pm2 save
   pm2 startup
   ```

3. **ตั้งค่า Nginx (Optional)**
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
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## การตั้งค่า Environment Variables

### สำหรับ Production

สร้างไฟล์ `.env.production`:

```env
# Google Sheets API Configuration
GOOGLE_PROJECT_ID=your-production-project-id
GOOGLE_PRIVATE_KEY_ID=your-production-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRODUCTION_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=your-production-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_SPREADSHEET_ID=your-production-spreadsheet-id

# Application Configuration
NEXT_PUBLIC_APP_NAME=J.A.R.V.I.S
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production
```

## การตั้งค่า Domain และ SSL

### 1. ใช้ Cloudflare (ฟรี)
- ไปที่ [cloudflare.com](https://cloudflare.com)
- เพิ่ม domain
- ตั้งค่า DNS records
- เปิดใช้งาน SSL

### 2. ใช้ Let's Encrypt (ฟรี)
```bash
# ติดตั้ง Certbot
sudo apt install certbot python3-certbot-nginx

# สร้าง SSL certificate
sudo certbot --nginx -d your-domain.com
```

## การตั้งค่า Database และ Google Sheets

### 1. สร้าง Google Cloud Project
1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. สร้าง project ใหม่
3. เปิดใช้งาน Google Sheets API
4. สร้าง Service Account
5. ดาวน์โหลด credentials

### 2. ตั้งค่า Google Sheets
1. สร้าง Google Sheets ใหม่
2. แชร์ให้ service account email
3. ตั้งค่า permissions

## การ Monitor และ Maintenance

### 1. ใช้ PM2 (สำหรับ Self-Hosted)
```bash
# ดูสถานะ
pm2 status

# ดู logs
pm2 logs jarvis-app

# Restart แอป
pm2 restart jarvis-app

# อัปเดตแอป
git pull
npm install
npm run build
pm2 restart jarvis-app
```

### 2. ใช้ Uptime Monitoring
- [UptimeRobot](https://uptimerobot.com) (ฟรี)
- [Pingdom](https://pingdom.com)
- [StatusCake](https://statuscake.com)

## การ Backup และ Security

### 1. Backup Strategy
```bash
# Backup ข้อมูล
# สร้าง script สำหรับ backup Google Sheets
# ใช้ Google Drive API หรือ Google Sheets API
```

### 2. Security Best Practices
- ใช้ HTTPS เท่านั้น
- ตั้งค่า CORS headers
- ใช้ environment variables
- ตั้งค่า rate limiting
- ใช้ firewall rules

## การอัปเดตแอป

### 1. Automated Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      # Add deployment steps here
```

### 2. Manual Update
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build แอป
npm run build

# Restart แอป
pm2 restart jarvis-app
```

## Troubleshooting

### ปัญหาที่พบบ่อย

1. **Environment Variables ไม่ทำงาน**
   - ตรวจสอบการตั้งค่าใน deployment platform
   - ตรวจสอบ format ของ private key

2. **Google Sheets API Error**
   - ตรวจสอบ permissions ของ service account
   - ตรวจสอบ spreadsheet ID

3. **Build Error**
   - ตรวจสอบ Node.js version
   - ตรวจสอบ dependencies

4. **Performance Issues**
   - ใช้ CDN สำหรับ static files
   - ตั้งค่า caching
   - ใช้ database connection pooling

## ค่าใช้จ่ายโดยประมาณ

### ฟรี
- Vercel (Hobby plan)
- Netlify (Free plan)
- Railway (Free tier)
- GitHub Actions (Free tier)

### มีค่าใช้จ่าย
- VPS: $5-20/เดือน
- Domain: $10-15/ปี
- SSL Certificate: ฟรี (Let's Encrypt)
- Monitoring: $5-20/เดือน

## หมายเหตุสำคัญ

1. **Security**: อย่า commit environment variables ลงใน repository
2. **Backup**: สร้าง backup strategy สำหรับข้อมูลสำคัญ
3. **Monitoring**: ตั้งค่า monitoring และ alerting
4. **Updates**: อัปเดต dependencies เป็นประจำ
5. **Documentation**: เก็บเอกสารการตั้งค่าและ troubleshooting 