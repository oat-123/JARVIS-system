# 🔧 Troubleshooting Guide

## ปัญหาที่พบบ่อยและวิธีแก้ไข

### 1. OpenSSL Error: "DECODER routines::unsupported"

#### อาการ:
```
Error: error:1E08010C:DECODER routines::unsupported
library: 'DECODER routines',
reason: 'unsupported',
code: 'ERR_OSSL_UNSUPPORTED'
```

#### สาเหตุ:
- Private key format ไม่ถูกต้อง
- OpenSSL version ไม่รองรับ
- Environment variable format ผิด

#### วิธีแก้ไข:

##### 1. ตรวจสอบ Private Key Format
```bash
# ตรวจสอบว่า private key มี format ถูกต้อง
echo $GOOGLE_PRIVATE_KEY
```

Private key ควรมี format แบบนี้:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

##### 2. แก้ไข Environment Variable
```env
# ผิด
GOOGLE_PRIVATE_KEY=MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...

# ถูก
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
```

##### 3. ใช้ Node.js Version ที่เหมาะสม
```bash
# ตรวจสอบ Node.js version
node --version

# ควรใช้ Node.js 18+ 
# อัปเดต Node.js ถ้าจำเป็น
```

##### 4. ตั้งค่า NODE_OPTIONS
```bash
# เพิ่มใน .env หรือ environment
NODE_OPTIONS="--openssl-legacy-provider"
```

### 2. Google Sheets API Error

#### อาการ:
```
Error: Failed to fetch data from Google Sheets
```

#### วิธีแก้ไข:

##### 1. ตรวจสอบ Service Account
```bash
# ตรวจสอบว่า service account มี permissions ถูกต้อง
# 1. ไปที่ Google Cloud Console
# 2. IAM & Admin > Service Accounts
# 3. ตรวจสอบว่า service account มี role "Editor"
```

##### 2. ตรวจสอบ Google Sheets Permissions
```bash
# 1. เปิด Google Sheets
# 2. คลิก "Share"
# 3. เพิ่ม service account email
# 4. ให้ permission "Editor"
```

##### 3. ตรวจสอบ API Enable
```bash
# 1. ไปที่ Google Cloud Console
# 2. APIs & Services > Library
# 3. ค้นหา "Google Sheets API"
# 4. เปิดใช้งาน
```

### 3. Environment Variables Error

#### อาการ:
```
Missing required environment variables
```

#### วิธีแก้ไข:

##### 1. ตรวจสอบ Environment Variables
```bash
# ตรวจสอบว่ามี environment variables ครบ
echo $GOOGLE_PROJECT_ID
echo $GOOGLE_PRIVATE_KEY_ID
echo $GOOGLE_PRIVATE_KEY
echo $GOOGLE_CLIENT_EMAIL
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_SPREADSHEET_ID
```

##### 2. ตั้งค่าใน Local Development
```bash
# สร้างไฟล์ .env.local
cp env.example .env.local

# แก้ไขไฟล์ .env.local
nano .env.local
```

##### 3. ตั้งค่าใน Production
```bash
# Vercel
# 1. ไปที่ Vercel Dashboard
# 2. Project Settings > Environment Variables
# 3. เพิ่ม environment variables

# Railway
# 1. ไปที่ Railway Dashboard
# 2. Variables tab
# 3. เพิ่ม environment variables
```

### 4. Build Error

#### อาการ:
```
Module not found: Can't resolve '@/components/...'
```

#### วิธีแก้ไข:

##### 1. ตรวจสอบ tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

##### 2. ลบ Cache และ Build ใหม่
```bash
# ลบ cache
rm -rf .next
rm -rf node_modules

# ติดตั้ง dependencies ใหม่
npm install

# Build ใหม่
npm run build
```

### 5. Deployment Error

#### อาการ:
```
Build failed
```

#### วิธีแก้ไข:

##### 1. ตรวจสอบ Node.js Version
```bash
# ตรวจสอบ package.json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

##### 2. ตรวจสอบ Dependencies
```bash
# อัปเดต dependencies
npm update

# ตรวจสอบ vulnerabilities
npm audit fix
```

##### 3. ตรวจสอบ Build Script
```bash
# ตรวจสอบ package.json scripts
{
  "scripts": {
    "build": "next build"
  }
}
```

### 6. Runtime Error

#### อาการ:
```
Application crashed
```

#### วิธีแก้ไข:

##### 1. ตรวจสอบ Logs
```bash
# Vercel
# ไปที่ Vercel Dashboard > Functions > View Function Logs

# Railway
# ไปที่ Railway Dashboard > Deployments > View Logs

# Local
npm run dev
# ดู console output
```

##### 2. ตรวจสอบ Health Check
```bash
# ตรวจสอบ health endpoint
curl https://your-domain.com/api/health
```

### 7. Performance Issues

#### อาการ:
```
Slow loading times
```

#### วิธีแก้ไข:

##### 1. ตรวจสอบ Google Sheets API Quotas
```bash
# 1. ไปที่ Google Cloud Console
# 2. APIs & Services > Quotas
# 3. ตรวจสอบ Google Sheets API quotas
```

##### 2. ใช้ Caching
```javascript
// เพิ่ม caching ใน API routes
export async function GET(request: NextRequest) {
  // Add cache headers
  const response = NextResponse.json(data)
  response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate')
  return response
}
```

##### 3. Optimize Database Queries
```javascript
// ใช้ batch operations
const batchGet = await sheets.spreadsheets.values.batchGet({
  spreadsheetId,
  ranges: ['Sheet1!A:L', 'Sheet2!A:L']
})
```

## 🔍 Debugging Tools

### 1. Local Development
```bash
# รันใน development mode
npm run dev

# ดู logs
npm run dev 2>&1 | tee debug.log
```

### 2. Production Debugging
```bash
# ตรวจสอบ environment variables
echo $GOOGLE_PROJECT_ID

# ตรวจสอบ API response
curl -X GET "https://your-domain.com/api/sheets?sheetName=ชั้น4_พัน4"
```

### 3. Google Cloud Debugging
```bash
# ตรวจสอบ service account
gcloud auth list

# ตรวจสอบ API quotas
gcloud auth application-default print-access-token
```

## 📞 Getting Help

### 1. ตรวจสอบ Logs
- Vercel: Dashboard > Functions > Logs
- Railway: Dashboard > Deployments > Logs
- Local: `npm run dev` console

### 2. ตรวจสอบ Environment Variables
```bash
# ตรวจสอบว่าตั้งค่าถูกต้อง
node -e "console.log(process.env.GOOGLE_PROJECT_ID)"
```

### 3. ตรวจสอบ Google Cloud
- Service Account permissions
- API enablement
- Quotas

### 4. ตรวจสอบ Google Sheets
- Sharing permissions
- Sheet structure
- Data format

## 🚨 Emergency Procedures

### 1. Rollback Deployment
```bash
# Vercel
# ไปที่ Vercel Dashboard > Deployments > Rollback

# Railway
# ไปที่ Railway Dashboard > Deployments > Rollback
```

### 2. Restart Application
```bash
# PM2
pm2 restart jarvis-app

# Docker
docker-compose restart

# Manual
npm run start
```

### 3. Clear Cache
```bash
# Next.js cache
rm -rf .next

# Node modules
rm -rf node_modules
npm install
```

## 📋 Checklist

### Before Deployment
- [ ] Environment variables ครบถ้วน
- [ ] Google Cloud API เปิดใช้งาน
- [ ] Service Account permissions ถูกต้อง
- [ ] Google Sheets sharing permissions ถูกต้อง
- [ ] Build สำเร็จใน local
- [ ] Tests ผ่าน

### After Deployment
- [ ] Health check endpoint ทำงาน
- [ ] Login ทำงาน
- [ ] Google Sheets API ทำงาน
- [ ] โมดูลต่างๆ ทำงาน
- [ ] Monitoring ตั้งค่า
- [ ] Backup ตั้งค่า 