import { NextRequest, NextResponse } from "next/server"
import { getSheetsService, validateGoogleAuthConfig, getMockData } from "@/lib/google-auth"

// Type definitions for the data structure
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

interface UpdateRequest {
  selectedPersons: string[]
  dutyName: string
  sheetName: string
}

// Convert sheet data to PersonData format
const convertSheetDataToPersonData = (values: any[][]): PersonData[] => {
  if (!values || values.length === 0) return []

  const headers = values[0]
  const data: PersonData[] = []

  for (let i = 1; i < values.length; i++) {
    const row = values[i]
    const person: PersonData = {
      ลำดับ: row[0] || '',
      ยศ: row[1] || '',
      ชื่อ: row[2] || '',
      สกุล: row[3] || '',
      ชั้นปีที่: row[4] || '',
      ตอน: row[5] || '',
      ตำแหน่ง: row[6] || '',
      สังกัด: row[7] || '',
      เบอร์โทรศัพท์: row[8] || '',
      หน้าที่: row[9] || '',
      ชมรม: row[10] || '',
      สถิติโดนยอด: row[11] || '0',
    }
    data.push(person)
  }

  return data
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let sheetName = searchParams.get("sheetName") || "ชั้น4_พัน4"
    
    console.log('Original sheet name from request:', sheetName)
    
    // Clean and validate sheet name - preserve Thai characters
    sheetName = sheetName.replace(/[^\w\s\u0E00-\u0E7F-]/g, '').trim()
    
    console.log('Cleaned sheet name:', sheetName)
    
    // Common sheet name mappings based on actual Google Sheets
    const sheetNameMappings: { [key: string]: string } = {
      'ชั้น4พัน4': 'ชั้น4_พัน4',
      'ชั้น4พัน3': 'ชั้น4_พัน3', 
      'ชั้น4พัน1': 'ชั้น4_พัน1',
      'ชั้น4_พัน4': 'ชั้น4_พัน4',
      'ชั้น4_พัน3': 'ชั้น4_พัน3',
      'ชั้น4_พัน1': 'ชั้น4_พัน1',
      'ชั้น4': 'รวมชั้น4', // Main sheet - updated based on actual sheet name
      '4': 'รวมชั้น4', // Fallback for numeric sheet names
      '44': 'ชั้น4_พัน4', // Fallback for numeric sheet names
      '43': 'ชั้น4_พัน3',
      '41': 'ชั้น4_พัน1'
    }
    
    // Use mapped name if available
    if (sheetNameMappings[sheetName]) {
      console.log('Mapping sheet name from', sheetName, 'to', sheetNameMappings[sheetName])
      sheetName = sheetNameMappings[sheetName]
    } else {
      console.log('No mapping found for sheet name:', sheetName)
    }
    
    console.log('Final sheet name:', sheetName)
    
    // Check if we're in development mode and environment variables are not set
    const isDevelopment = process.env.NODE_ENV === 'development'
    const hasGoogleConfig = process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_PRIVATE_KEY

    if (isDevelopment && !hasGoogleConfig) {
      console.log('Development mode: Using mock data')
      const mockData = getMockData()
      
      return NextResponse.json({
        success: true,
        data: mockData,
        timestamp: new Date().toISOString(),
        sheetName: sheetName,
        mode: 'mock'
      })
    }

    // Validate configuration for production
    try {
      validateGoogleAuthConfig()
    } catch (error) {
      console.error('Configuration validation failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets configuration is missing",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      )
    }

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Spreadsheet ID not configured",
        },
        { status: 500 }
      )
    }

    // Get Google Sheets service
    const sheets = await getSheetsService()

    // First, try to get sheet metadata to validate sheet name
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [`${sheetName}!A1`],
        includeGridData: false
      })
      
      console.log('Available sheets:', spreadsheet.data.sheets?.map(s => s.properties?.title))
    } catch (metadataError) {
      console.log('Could not get sheet metadata, proceeding with direct access')
    }

    // Read data from the specified sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:L`, // Adjust range based on your sheet structure
    })

    const values = response.data.values
    const data = convertSheetDataToPersonData(values || [])

    return NextResponse.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
      sheetName: sheetName,
      mode: 'production'
    })
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error)
    
    // Return mock data in development if Google Sheets fails
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock data due to Google Sheets error')
      const mockData = getMockData()
      const { searchParams } = new URL(request.url)
      const fallbackSheetName = searchParams.get("sheetName") || "ชั้น4_พัน4"
      
      return NextResponse.json({
        success: true,
        data: mockData,
        timestamp: new Date().toISOString(),
        sheetName: fallbackSheetName,
        mode: 'mock-fallback',
        warning: 'Using mock data due to Google Sheets error'
      })
    }

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
  // อ่าน body แค่ครั้งเดียว
  const body = await request.json();
  // ประกาศตัวแปรให้ทุก scope เห็น
  const selectedPersons = body.selectedPersons || [];
  const selectedSheets = body.data?.sheets || [];
  const sheetSettings = body.data?.settings || {};

  // Check if we're in development mode and environment variables are not set
  const isDevelopment = process.env.NODE_ENV === 'development'
  const hasGoogleConfig = process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_PRIVATE_KEY

  if (isDevelopment && !hasGoogleConfig) {
    console.log('Development mode: Mock update operation')
    
    return NextResponse.json({
      success: true,
      message: `Mock update for ${selectedPersons.length} people in ${selectedSheets[0]}`,
      updatedCount: selectedPersons.length,
      timestamp: new Date().toISOString(),
      mode: 'mock'
    })
  }

  // Validate configuration for production
  try {
    validateGoogleAuthConfig()
  } catch (error) {
    console.error('Configuration validation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Google Sheets configuration is missing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID

  if (!spreadsheetId) {
    return NextResponse.json(
      {
        success: false,
        error: "Google Spreadsheet ID not configured",
      },
      { status: 500 }
    )
  }

  // Get Google Sheets service
  const sheets = await getSheetsService()

  // First, get current data to find the rows to update
  const currentDataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${selectedSheets[0]}!A:L`,
  })

  const currentValues = currentDataResponse.data.values || []
  const updates: any[] = []

  // Find rows to update based on selectedPersons
  for (let i = 1; i < currentValues.length; i++) {
    const row = currentValues[i]
    const personId = row[0] // ลำดับ
    
    if (selectedPersons.includes(personId)) {
      // Update สถิติโดนยอด (column L, index 11)
      const currentStats = parseInt(row[11] || '0')
      const newStats = currentStats + 1
      
      updates.push({
        range: `${selectedSheets[0]}!L${i + 1}`, // L column for สถิติโดนยอด
        values: [[newStats.toString()]],
      })
    }
  }

  // Batch update the statistics
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates,
      },
    })
  }

  // Log the update for audit purposes
  const logEntry = {
    timestamp: new Date().toISOString(),
    dutyName: sheetSettings.dutyName || '',
    updatedPersons: selectedPersons,
    sheetName: selectedSheets[0],
  }

  // Optionally, you can add the log to a separate sheet
  // await logUpdateToSheet(sheets, spreadsheetId, logEntry)

  return NextResponse.json({
    success: true,
    message: `Updated stats for ${selectedPersons.length} people in ${selectedSheets[0]}`,
    updatedCount: updates.length,
    timestamp: new Date().toISOString(),
    mode: 'production'
  })
}

// Optional: Function to log updates to a separate sheet
async function logUpdateToSheet(
  sheets: any,
  spreadsheetId: string,
  logEntry: {
    timestamp: string
    dutyName: string
    updatedPersons: string[]
    sheetName: string
  }
) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Logs!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          logEntry.timestamp,
          logEntry.dutyName,
          logEntry.updatedPersons.join(', '),
          logEntry.sheetName
        ]]
      }
    })
  } catch (error) {
    console.error('Error logging to sheet:', error)
  }
}