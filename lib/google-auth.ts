import { GoogleAuth } from "google-auth-library"
import { google } from "googleapis"

// Google Sheets configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

// Initialize Google Auth with proper private key handling
export const getGoogleAuth = async () => {
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
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
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