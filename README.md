# 🤖 J.A.R.V.I.S Authentication System

ระบบจัดการข้อมูลและระบบเข้าสู่ระบบแบบ Multi-User ที่เชื่อมต่อกับ Google Sheets

## ✨ Features

- 🔐 **Multi-User Authentication** - ระบบเข้าสู่ระบบสำหรับผู้ใช้หลายคน (oat, time, chai)
- 📊 **Google Sheets Integration** - เชื่อมต่อกับ Google Sheets สำหรับจัดการข้อมูล
- 🎯 **Modular Design** - โมดูลต่างๆ สำหรับงานที่แตกต่างกัน
- 📱 **Responsive UI** - ออกแบบให้ใช้งานได้บนทุกอุปกรณ์
- 🔄 **Real-time Updates** - อัปเดตข้อมูลแบบ Real-time
- 📈 **Statistics Tracking** - ติดตามสถิติการทำงาน
- 🚀 **Deployment Ready** - พร้อมสำหรับการ Deploy

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment Variables

```bash
# คัดลอกไฟล์ตัวอย่าง
cp env.example .env.local

# แก้ไขไฟล์ .env.local
nano .env.local
```

### 3. ตั้งค่า Google Sheets API

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่
3. เปิดใช้งาน Google Sheets API
4. สร้าง Service Account
5. ดาวน์โหลด JSON key file
6. ตั้งค่า Environment Variables

### 4. รัน Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 🔧 Troubleshooting

### OpenSSL Error

หากเจอปัญหา OpenSSL error:

```bash
# ตรวจสอบปัญหา
npm run debug

# แก้ไขอัตโนมัติ
npm run fix

# หรือตั้งค่า NODE_OPTIONS
export NODE_OPTIONS="--openssl-legacy-provider"
```

### Environment Variables

ตรวจสอบว่า Environment Variables ครบถ้วน:

```bash
# ตรวจสอบ
npm run debug

# ตรวจสอบ build
npm run debug:build
```

## 📁 Project Structure

```
jarvis-auth-system/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── sheets/        # Google Sheets API
│   │   └── health/        # Health Check
│   ├── globals.css        # Global Styles
│   ├── layout.tsx         # Root Layout
│   └── page.tsx           # Home Page
├── components/            # React Components
│   ├── ui/               # UI Components
│   ├── modules/          # Feature Modules
│   ├── dashboard.tsx     # Dashboard
│   └── login-page.tsx    # Login Page
├── lib/                  # Utilities
│   ├── google-auth.ts    # Google Auth Utility
│   └── utils.ts          # General Utils
├── scripts/              # Scripts
│   ├── debug.js          # Debug Script
│   ├── backup.js         # Backup Script
│   └── monitor.js        # Monitor Script
└── public/               # Static Assets
```

## 🔐 Authentication

### User Configuration

```typescript
const users = [
  {
    username: "oat",
    password: "password123",
    sheetName: "ชั้น4_พัน4"
  },
  {
    username: "time", 
    password: "password123",
    sheetName: "ชั้น4_พัน3"
  },
  {
    username: "chai",
    password: "password123", 
    sheetName: "ชั้น4_พัน2"
  }
]
```

### Login Flow

1. ผู้ใช้กรอก Username และ Password
2. ระบบตรวจสอบกับ User Configuration
3. หากถูกต้อง จะเข้าสู่ Dashboard พร้อม Sheet Name
4. ข้อมูลจะถูกดึงจาก Google Sheets ตาม Sheet Name

## 📊 Google Sheets Integration

### API Endpoints

```typescript
// GET - ดึงข้อมูล
GET /api/sheets?sheetName=ชั้น4_พัน4

// POST - อัปเดตสถิติ
POST /api/sheets
{
  "selectedPersons": ["1", "2", "3"],
  "dutyName": "ceremony",
  "sheetName": "ชั้น4_พัน4"
}
```

### Data Structure

```typescript
interface PersonData {
  ลำดับ: string
  ยศ: string
  ชื่อ: string
  สกุล: string
  ชั้นปีที่: string
  ตอน: string
  ตำแหน่ง: string
  สังกัด: string
  เบอร์โทรศัพท์: string
  หน้าที่: string
  ชมรม: string
  สถิติโดนยอด: string
}
```

## 🎯 Modules

### 1. Ceremony Duty (งานพิธีการ)
- จัดการงานพิธีการ
- เลือกผู้เข้าร่วม
- อัปเดตสถิติ

### 2. Night Duty (เวรยาม)
- จัดการเวรยาม
- ตารางเวร
- สถิติการเวร

### 3. Weekend Duty (เวรสุดสัปดาห์)
- จัดการเวรสุดสัปดาห์
- ตารางเวร
- สถิติการเวร

### 4. Release Report (รายงานปล่อย)
- รายงานการปล่อย
- สถิติการปล่อย
- ประวัติการปล่อย

### 5. Statistics (สถิติ)
- สถิติภาพรวม
- กราฟและชาร์ต
- รายงานสรุป

## 🚀 Deployment

### Vercel

```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Deploy
npm run vercel:prod
```

### Railway

```bash
# ติดตั้ง Railway CLI
npm i -g @railway/cli

# Deploy
railway up
```

### Docker

```bash
# Build Docker Image
npm run docker:build

# Run Container
npm run docker:run

# Docker Compose
npm run docker:compose
```

### Self-Hosted

```bash
# Build
npm run build

# Start
npm start

# หรือใช้ PM2
pm2 start npm --name "jarvis" -- start
```

## 🔧 Scripts

### Debug Script

```bash
# ตรวจสอบปัญหา
npm run debug

# ตรวจสอบ build
npm run debug:build

# แก้ไขอัตโนมัติ
npm run fix
```

### Backup Script

```bash
# สร้าง backup
npm run backup
```

### Monitor Script

```bash
# ตรวจสอบสถานะ
npm run monitor
```

## 📋 Environment Variables

### Required

```env
GOOGLE_PROJECT_ID=your-google-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
```

### Optional

```env
NEXT_PUBLIC_APP_NAME=J.A.R.V.I.S
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production
SLACK_WEBHOOK_URL=your-slack-webhook
ALERT_EMAIL=admin@domain.com
```

## 🔍 Troubleshooting

### Common Issues

1. **OpenSSL Error**
   ```bash
   npm run debug
   npm run fix
   ```

2. **Google Sheets API Error**
   - ตรวจสอบ Service Account permissions
   - ตรวจสอบ Google Sheets sharing
   - ตรวจสอบ API enablement

3. **Build Error**
   ```bash
   rm -rf .next node_modules
   npm install
   npm run build
   ```

4. **Environment Variables**
   ```bash
   npm run debug
   ```

### Debug Tools

```bash
# ตรวจสอบ Environment Variables
node -e "console.log(process.env.GOOGLE_PROJECT_ID)"

# ตรวจสอบ Google Auth
curl -X GET "http://localhost:3000/api/sheets?sheetName=ชั้น4_พัน4"

# ตรวจสอบ Health
curl -f http://localhost:3000/api/health
```

## 📚 Documentation

- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Deployment Guide](./DEPLOYMENT_SUMMARY.md)
- [Quick Deploy Guide](./QUICK_DEPLOY.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

หากมีปัญหา:

1. ตรวจสอบ [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. รัน `npm run debug` เพื่อตรวจสอบ
3. ตรวจสอบ logs ใน deployment platform
4. สร้าง issue ใน repository

---

**J.A.R.V.I.S** - Just A Rather Very Intelligent System 🤖
