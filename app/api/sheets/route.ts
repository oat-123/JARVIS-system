import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

// Google Sheets configuration
const GOOGLE_SHEETS_CREDENTIALS = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL || "oatmultitools-oatdev-com@oat-assist.iam.gserviceaccount.com",
  private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n')
}

// Spreadsheet ID (default); can be overridden via query ?spreadsheetId=
const DEFAULT_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk"

// Initialize Google Sheets client
const getGoogleSheetsClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_SHEETS_CREDENTIALS as any,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  })
  return google.sheets({ version: "v4", auth })
}

// Helper function to convert array data to objects with Thai headers
const convertToObjects = (data: any[][]) => {
  if (!data || data.length === 0) return []
  
  const headers = data[0]
  return data.slice(1).map((row, index) => {
    const obj: any = { ลำดับ: (index + 1).toString() }
    headers.forEach((header, i) => {
      obj[header] = row[i] || ""
    })
    return obj
  })
}

// Helper function to find column index by header name
const findColumnIndex = (headers: string[], columnName: string): number => {
  return headers.findIndex(header => header === columnName)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const spreadsheetId = searchParams.get("spreadsheetId") || DEFAULT_SPREADSHEET_ID
    const gid = searchParams.get("gid")
    let sheetName = searchParams.get("sheetName") || "ชั้น4_พัน4"

    const sheets = getGoogleSheetsClient()

    // If gid provided and sheetName not provided, resolve gid -> sheet title
    if (gid && !searchParams.get("sheetName")) {
      const meta = await sheets.spreadsheets.get({ spreadsheetId })
      const match = meta.data.sheets?.find(s => String(s.properties?.sheetId) === String(gid))
      if (match?.properties?.title) {
        sheetName = match.properties.title
      }
    }

    // Get data from the specified sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:L`, // Adjust range as needed
    })

    const values = response.data.values
    if (!values || values.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No data found in the sheet",
      })
    }

    // Convert to objects with proper Thai headers
    const data = convertToObjects(values)

    return NextResponse.json({
      success: true,
      data: data,
      sheetName: sheetName,
      spreadsheetId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch data from Google Sheets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { selectedPersons, dutyName, sheetName } = body
    
    if (!selectedPersons || !Array.isArray(selectedPersons) || selectedPersons.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No persons selected for update",
        },
        { status: 400 }
      )
    }
    
    const sheets = getGoogleSheetsClient()
    
    // First, get the current data to find the correct rows and column
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:L`,
    })
    
    const values = response.data.values
    if (!values || values.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No data found in the sheet",
        },
        { status: 404 }
      )
    }
    
    const headers = values[0]
    const statsColumnIndex = findColumnIndex(headers, "สถิติโดนยอด")
    const nameColumnIndex = findColumnIndex(headers, "ชื่อ")
    const surnameColumnIndex = findColumnIndex(headers, "สกุล")
    
    if (statsColumnIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Stats column not found in the sheet",
        },
        { status: 400 }
      )
    }
    
    // Prepare batch update requests
    const batchUpdateRequests = []
    
    for (const person of selectedPersons) {
      // Find the row for this person
      const rowIndex = values.findIndex((row, index) => {
        if (index === 0) return false // Skip header row
        const firstName = row[nameColumnIndex] || ""
        const lastName = row[surnameColumnIndex] || ""
        const fullName = `${firstName} ${lastName}`.trim()
        return fullName === person.name || 
               firstName === person.name ||
               `${person.rank}${firstName} ${lastName}` === person.name
      })
      
      if (rowIndex > 0) { // Found the person (rowIndex 0 is header)
        const currentStats = parseInt(values[rowIndex][statsColumnIndex] || "0")
        const newStats = currentStats + 1
        
        // Create update request for this cell
        batchUpdateRequests.push({
          range: `${sheetName}!${String.fromCharCode(65 + statsColumnIndex)}${rowIndex + 1}`,
          values: [[newStats.toString()]]
        })
      }
    }
    
    if (batchUpdateRequests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No matching persons found in the sheet",
        },
        { status: 404 }
      )
    }
    
    // Execute batch update
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: batchUpdateRequests
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `Updated stats for ${batchUpdateRequests.length} people in ${sheetName}`,
      updatedCount: batchUpdateRequests.length,
      dutyName: dutyName,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating Google Sheets:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update Google Sheets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}