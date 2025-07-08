# Security Guide

## การจัดการข้อมูลที่สำคัญ

### ข้อมูลที่ต้องป้องกัน

1. **Google Service Account Credentials**
   - Private Key
   - Client Email
   - Project ID
   - Client ID

2. **Google Spreadsheet IDs**
   - Spreadsheet URLs
   - Sheet IDs

3. **Environment Variables**
   - API Keys
   - Database URLs
   - Secret Tokens

### วิธีป้องกันการรั่วไหล

#### 1. ใช้ Environment Variables

```bash
# ✅ ถูกต้อง - ใช้ environment variables
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ❌ ผิด - ใส่ข้อมูลโดยตรงในโค้ด
const credentials = {
  project_id: "oat-assist",
  private_key: "-----BEGIN PRIVATE KEY-----\n..."
}
```

#### 2. ใช้ .env.local สำหรับ Development

```bash
# สร้างไฟล์ .env.local (ไม่ commit)
cp env.local.example .env.local
# แก้ไข .env.local ด้วยข้อมูลจริง
```

#### 3. ตั้งค่า Environment Variables ใน Production

**Vercel:**
1. ไปที่ Vercel Dashboard
2. Settings > Environment Variables
3. เพิ่ม variables ทั้งหมด

**Netlify:**
1. ไปที่ Netlify Dashboard
2. Site settings > Environment variables
3. เพิ่ม variables ทั้งหมด

#### 4. ใช้ .gitignore ที่เหมาะสม

```gitignore
# Environment files
.env*.local
.env
.env.production

# Credentials
*.key
*.pem
google-credentials.json
service-account.json

# Backup files
/backups
*.backup
```

### การจัดการเมื่อข้อมูลรั่วไหล

#### 1. ขั้นตอนฉุกเฉิน

```bash
# 1. ลบข้อมูลที่รั่วไหลออกจากไฟล์
# 2. Commit การเปลี่ยนแปลง
git add .
git commit -m "Remove sensitive data"

# 3. ใช้สคริปต์ทำความสะอาด git history
chmod +x scripts/clean-history.sh
./scripts/clean-history.sh

# 4. Force push
git push --force-with-lease origin main
```

#### 2. Revoke Credentials

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. IAM & Admin > Service Accounts
3. ลบ Service Account ที่รั่วไหล
4. สร้าง Service Account ใหม่
5. ดาวน์โหลด credentials ใหม่

#### 3. อัปเดต Environment Variables

```bash
# 1. อัปเดต .env.local
# 2. อัปเดต production environment variables
# 3. ทดสอบการเชื่อมต่อ
npm run check-env
```

### การตรวจสอบความปลอดภัย

#### 1. ตรวจสอบ Git History

```bash
# ตรวจสอบว่ามีข้อมูลที่สำคัญใน git history หรือไม่
git log --all --full-history -- "*.env*"
git log --all --full-history -- "*.json"
```

#### 2. ตรวจสอบ Environment Variables

```bash
# ใช้สคริปต์ตรวจสอบ
npm run check-env
```

#### 3. ตรวจสอบ Dependencies

```bash
# ตรวจสอบ dependencies ที่อาจมีช่องโหว่
npm audit
```

### Best Practices

#### 1. ใช้ Placeholder Values

```typescript
// ✅ ถูกต้อง
const config = {
  projectId: process.env.GOOGLE_PROJECT_ID || 'your-project-id',
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || 'your-spreadsheet-id'
}

// ❌ ผิด
const config = {
  projectId: 'oat-assist',
  spreadsheetId: '1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk'
}
```

#### 2. ใช้ TypeScript สำหรับ Type Safety

```typescript
interface GoogleConfig {
  projectId: string
  privateKey: string
  clientEmail: string
  spreadsheetId: string
}

const validateConfig = (config: GoogleConfig): boolean => {
  return !!(config.projectId && config.privateKey && config.clientEmail)
}
```

#### 3. ใช้ Environment Validation

```typescript
// ตรวจสอบ environment variables ตอน startup
const validateEnvironment = () => {
  const required = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_SPREADSHEET_ID'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }
}
```

### การ Monitor และ Alert

#### 1. ตั้งค่า Monitoring

```typescript
// ตรวจสอบการเชื่อมต่อ Google Sheets
const checkGoogleSheetsConnection = async () => {
  try {
    const sheets = await getSheetsService()
    await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!
    })
    return true
  } catch (error) {
    console.error('Google Sheets connection failed:', error)
    return false
  }
}
```

#### 2. ตั้งค่า Alerts

```typescript
// ส่ง alert เมื่อการเชื่อมต่อล้มเหลว
const sendAlert = async (message: string) => {
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    })
  }
}
```

### การ Backup ที่ปลอดภัย

#### 1. Backup Environment Variables

```bash
# Backup ไปยัง secure location
cp .env.local ~/secure-backup/env-$(date +%Y%m%d).local
```

#### 2. Backup Google Sheets

```typescript
// Export Google Sheets ไปยัง secure storage
const backupGoogleSheets = async () => {
  const sheets = await getSheetsService()
  const data = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'A:Z'
  })
  
  // Save to secure location
  await saveToSecureStorage(data)
}
```

### การทดสอบความปลอดภัย

#### 1. Automated Security Checks

```bash
# ตรวจสอบไฟล์ที่มีข้อมูลที่สำคัญ
npm run security-check

# ตรวจสอบ git history
npm run check-git-history
```

#### 2. Manual Security Review

1. ตรวจสอบ .gitignore
2. ตรวจสอบ environment variables
3. ตรวจสอบ production settings
4. ทดสอบการเชื่อมต่อ

### การ Training และ Awareness

1. **Developer Training**
   - การใช้ environment variables
   - การจัดการ credentials
   - การตรวจสอบความปลอดภัย

2. **Code Review Guidelines**
   - ตรวจสอบข้อมูลที่สำคัญใน PR
   - ตรวจสอบ environment variables
   - ตรวจสอบ security best practices

3. **Incident Response**
   - ขั้นตอนเมื่อข้อมูลรั่วไหล
   - การแจ้งเตือนทีม
   - การกู้คืนระบบ 