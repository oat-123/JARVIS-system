# 🚀 คู่มือการ Deploy แบบเร็ว

## ตัวเลือกที่แนะนำ (ฟรี)

### 1. Vercel (แนะนำที่สุด)

#### ขั้นตอนการ Deploy บน Vercel

1. **เตรียมโปรเจค**
   ```bash
   # ตรวจสอบว่า build ได้
   npm run build
   ```

2. **Deploy ผ่าน Vercel**
   - ไปที่ [vercel.com](https://vercel.com)
   - Sign up/Login ด้วย GitHub
   - คลิก "New Project"
   - Import repository จาก GitHub
   - ตั้งค่า Environment Variables

3. **Environment Variables ที่ต้องตั้งค่า**
   ```
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_PRIVATE_KEY_ID=your-private-key-id
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
   ```

4. **Deploy**
   - คลิก "Deploy"
   - รอ 2-3 นาที
   - ได้ URL สำหรับใช้งาน

### 2. Railway (ง่ายและฟรี)

#### ขั้นตอนการ Deploy บน Railway

1. **เตรียมโปรเจค**
   ```bash
   # ตรวจสอบว่า build ได้
   npm run build
   ```

2. **Deploy ผ่าน Railway**
   - ไปที่ [railway.app](https://railway.app)
   - Sign up/Login ด้วย GitHub
   - คลิก "New Project"
   - เลือก "Deploy from GitHub repo"
   - เลือก repository

3. **ตั้งค่า Environment Variables**
   - ไปที่ Variables tab
   - เพิ่ม environment variables ทั้งหมด

4. **Deploy**
   - Railway จะ deploy อัตโนมัติ
   - ได้ URL สำหรับใช้งาน

## การตั้งค่า Google Cloud

### 1. สร้าง Google Cloud Project
1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. สร้าง project ใหม่
3. เปิดใช้งาน Google Sheets API

### 2. สร้าง Service Account
1. ไปที่ "IAM & Admin" > "Service Accounts"
2. คลิก "Create Service Account"
3. ตั้งชื่อและ description
4. ให้ role: "Editor"
5. ดาวน์โหลด JSON key file

### 3. ตั้งค่า Google Sheets
1. สร้าง Google Sheets ใหม่
2. แชร์ให้ service account email (จาก JSON file)
3. ให้ permission: "Editor"

## การทดสอบหลัง Deploy

### 1. ทดสอบ Login
- เข้าไปที่ URL ที่ได้จาก deployment
- ทดสอบ login ด้วยผู้ใช้ทั้ง 3 คน:
  - `oat` / `crma74`
  - `time` / `crma74`
  - `chai` / `crma74`

### 2. ทดสอบโมดูลต่างๆ
- เวรรักษาการณ์
- เวรเตรียมการ
- จัดยอดพิธี
- ยอดปล่อย
- สถิติโดนยอด

### 3. ทดสอบการเปลี่ยนฐานข้อมูล
- Login ด้วยผู้ใช้ `oat` → ตรวจสอบฐานข้อมูล `ชั้น4_พัน4`
- Login ด้วยผู้ใช้ `time` → ตรวจสอบฐานข้อมูล `ชั้น4_พัน1`
- Login ด้วยผู้ใช้ `chai` → ตรวจสอบฐานข้อมูล `ชั้น4_พัน3`

## การอัปเดตแอป

### Vercel
- Push code ไปยัง GitHub
- Vercel จะ deploy อัตโนมัติ

### Railway
- Push code ไปยัง GitHub
- Railway จะ deploy อัตโนมัติ

## การ Monitor

### Vercel
- ไปที่ Vercel Dashboard
- ดู Analytics และ Logs

### Railway
- ไปที่ Railway Dashboard
- ดู Logs และ Metrics

## Troubleshooting

### ปัญหาที่พบบ่อย

1. **Build Error**
   ```bash
   # ตรวจสอบ dependencies
   npm install
   
   # ลบ cache
   rm -rf .next
   npm run build
   ```

2. **Environment Variables Error**
   - ตรวจสอบการตั้งค่าใน deployment platform
   - ตรวจสอบ format ของ private key

3. **Google Sheets API Error**
   - ตรวจสอบ permissions ของ service account
   - ตรวจสอบ spreadsheet ID

## ค่าใช้จ่าย

### ฟรี
- Vercel Hobby Plan: ฟรี
- Railway Free Tier: ฟรี
- GitHub: ฟรี

### มีค่าใช้จ่าย (ถ้าต้องการ)
- Custom Domain: $10-15/ปี
- Vercel Pro: $20/เดือน
- Railway Pro: $5/เดือน

## หมายเหตุสำคัญ

1. **Security**: อย่า commit environment variables
2. **Backup**: สร้าง backup ของ Google Sheets
3. **Monitoring**: ตั้งค่า uptime monitoring
4. **Updates**: อัปเดต dependencies เป็นประจำ

## Support

หากมีปัญหา:
1. ตรวจสอบ logs ใน deployment platform
2. ตรวจสอบ environment variables
3. ทดสอบใน local ก่อน deploy
4. ดู documentation ของ platform ที่ใช้ 