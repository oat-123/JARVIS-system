import { GoogleAuth } from "google-auth-library"
import { google } from "googleapis"

// Initialize Google Auth with proper private key handling
export async function getGoogleAuth() {
  try {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
    
    // Handle different private key formats
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }
    
    // Ensure the private key has proper formatting
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`
    }

    // Validate required environment variables
    const requiredVars = {
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
    }

    // Check if any required variable is missing
    const missingVars = Object.entries(requiredVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }

    const auth = new GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: requiredVars.project_id,
        private_key_id: requiredVars.private_key_id,
        private_key: requiredVars.private_key,
        client_email: requiredVars.client_email,
        client_id: requiredVars.client_id,
      },
      scopes: SCOPES,
    })

    return auth
  } catch (error) {
    console.error('Error initializing Google Auth:', error)
    throw new Error(`Google Auth initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Get Google Sheets service
export const getSheetsService = async () => {
  try {
    const auth = await getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    return sheets
  } catch (error) {
    console.error('Error getting Google Sheets service:', error)
    throw error
  }
}

// Validate Google Auth configuration
export const validateGoogleAuthConfig = () => {
  const requiredEnvVars = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY_ID',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_SPREADSHEET_ID'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}. Please configure these variables in your production environment.`
    console.error('Environment Variables Error:', errorMessage)
    throw new Error(errorMessage)
  }

  // Additional validation for production
  if (process.env.NODE_ENV === 'production') {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
    if (!privateKey || privateKey === 'your-private-key-here') {
      throw new Error('GOOGLE_PRIVATE_KEY is not properly configured for production')
    }
    
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID
    if (!spreadsheetId || spreadsheetId === 'your-google-spreadsheet-id') {
      throw new Error('GOOGLE_SPREADSHEET_ID is not properly configured for production')
    }
  }

  return true
}

// Mock data for development/testing
export const getMockData = () => {
  return [
    {
      ลำดับ: "1",
      ยศ: "ร.ต.",
      ชื่อ: "ทดสอบ",
      สกุล: "ระบบ",
      ชั้นปีที่: "4",
      ตอน: "1",
      ตำแหน่ง: "นักเรียน",
      สังกัด: "พัน4",
      เบอร์โทรศัพท์: "0812345678",
      หน้าที่: "ทั่วไป",
      ชมรม: "คอมพิวเตอร์",
      สถิติโดนยอด: "0",
    },
    {
      ลำดับ: "2",
      ยศ: "ร.ต.",
      ชื่อ: "ตัวอย่าง",
      สกุล: "ข้อมูล",
      ชั้นปีที่: "4",
      ตอน: "2",
      ตำแหน่ง: "นักเรียน",
      สังกัด: "พัน4",
      เบอร์โทรศัพท์: "0898765432",
      หน้าที่: "ทั่วไป",
      ชมรม: "กีฬา",
      สถิติโดนยอด: "0",
    }
  ]
} 

// Google Sheets + Drive API scopes (ต้องมีแค่ 1 อันในไฟล์นี้)
export const SCOPES: string[] = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
];

// Get Google Drive service
export const getDriveService = async () => {
  try {
    const auth = await getGoogleAuth()
    const drive = google.drive({ version: 'v3', auth })
    return drive
  } catch (error) {
    console.error('Error getting Google Drive service:', error)
    throw error
  }
}

// ค้นหาโฟลเดอร์ย่อยใน Google Drive ตามชื่อ (fuzzy)
export const findFolderByName = async (parentId: string, name: string) => {
  const drive = await getDriveService()
  const res = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1000,
  })
  // fuzzy match: ชื่อโฟลเดอร์ที่มีชื่อใกล้เคียง name
  const folders = res.data.files || []
  // ให้คะแนนความคล้าย (simple)
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const target = norm(name)
  let best = null
  let bestScore = 0
  for (const f of folders) {
    const n = norm(f.name || '')
    let score = 0
    if (n === target) score = 100
    else if (n.includes(target) || target.includes(n)) score = 80
    else if (n.includes('ฉก')) score = 60
    else if (n.match(/ฉก/)) score = 50
    if (score > bestScore) {
      best = f
      bestScore = score
    }
  }
  return best
}

// ค้นหาไฟล์ Word ในโฟลเดอร์ (ชื่อใกล้เคียง targetName)
export const findWordFileByName = async (parentId: string, targetName: string) => {
  const drive = await getDriveService()
  const res = await drive.files.list({
    q: `('${parentId}' in parents) and trashed = false and (mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/msword')`,
    fields: 'files(id, name, webViewLink, webContentLink)',
    pageSize: 100,
  })
  const files = res.data.files || []
  // fuzzy match
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const target = norm(targetName)
  let best = null
  let bestScore = 0
  for (const f of files) {
    const n = norm(f.name || '')
    let score = 0
    if (n === target) score = 100
    else if (n.includes(target) || target.includes(n)) score = 80
    else if (n.split('.')[0] === target.split('.')[0]) score = 70
    if (score > bestScore) {
      best = f
      bestScore = score
    }
  }
  return best
}

// สร้างลิงก์ดาวน์โหลด (webViewLink/webContentLink)
export const getDownloadLink = (file: any) => {
  // ถ้ามี webContentLink ให้ใช้เลย (direct download)
  if (file.webContentLink) return file.webContentLink
  // ถ้าไม่มี ให้ใช้ webViewLink (view in browser)
  if (file.webViewLink) return file.webViewLink
  // ถ้าไม่มีเลย คืน null
  return null
} 