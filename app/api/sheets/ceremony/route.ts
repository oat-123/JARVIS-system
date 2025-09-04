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

  const headers = values[0] || []
  const idxOf = (name: string) => headers.findIndex(h => h && h.toString().trim().includes(name))
  
  // Find column indexes by header names
  const idxOrder = idxOf('ลำดับ') >= 0 ? idxOf('ลำดับ') : 0
  const idxRank = idxOf('ยศ') >= 0 ? idxOf('ยศ') : 1
  const idxFirstName = idxOf('ชื่อ') >= 0 ? idxOf('ชื่อ') : 2
  const idxLastName = idxOf('สกุล') >= 0 ? idxOf('สกุล') : 3
  const idxYear = idxOf('ชั้นปีที่') >= 0 ? idxOf('ชั้นปีที่') : 4
  const idxClass = idxOf('ตอน') >= 0 ? idxOf('ตอน') : 5
  const idxPosition = idxOf('ตำแหน่ง') >= 0 ? idxOf('ตำแหน่ง') : 6
  const idxUnit = idxOf('สังกัด') >= 0 ? idxOf('สังกัด') : 7
  const idxPhone = idxOf('เบอร์โทรศัพท์') >= 0 ? idxOf('เบอร์โทรศัพท์') : 8
  const idxDuty = idxOf('หน้าที่') >= 0 ? idxOf('หน้าที่') : 9
  const idxClub = idxOf('ชมรม') >= 0 ? idxOf('ชมรม') : 10
  const idxStats = idxOf('สถิติโดนยอด') >= 0 ? idxOf('สถิติโดนยอด') : 13
  
  const data: PersonData[] = []

  for (let i = 1; i < values.length; i++) {
    const row = values[i]
    const get = (j: number) => (j >= 0 && j < row.length ? row[j] : '')
    const person: PersonData = {
      ลำดับ: get(idxOrder),
      ยศ: get(idxRank),
      ชื่อ: get(idxFirstName),
      สกุล: get(idxLastName),
      ชั้นปีที่: get(idxYear),
      ตอน: get(idxClass),
      ตำแหน่ง: get(idxPosition),
      สังกัด: get(idxUnit),
      เบอร์โทรศัพท์: get(idxPhone),
      หน้าที่: get(idxDuty),
      ชมรม: get(idxClub),
      สถิติโดนยอด: get(idxStats) || '0',
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
    
    console.log('Final sheet name for ceremony:', sheetName)
    
    // Check if we're in development mode and environment variables are not set
    const isDevelopment = process.env.NODE_ENV === 'development'
    const hasGoogleConfig = process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_PRIVATE_KEY

    if (isDevelopment && !hasGoogleConfig) {
      console.log('Development mode: Using mock data for ceremony')
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
      range: `${sheetName}!A:N`, // Adjust range to include up to column N (index 13)
    })

    const values = response.data.values || []
    
    // Use header-based mapping to handle column insertions
    const headers = values[0] || []
    const idxOf = (name: string) => headers.findIndex(h => h && h.toString().trim().includes(name))
    
    // Find column indexes by header names
    const idxOrder = idxOf('ลำดับ') >= 0 ? idxOf('ลำดับ') : 0
    const idxRank = idxOf('ยศ') >= 0 ? idxOf('ยศ') : 1
    const idxFirstName = idxOf('ชื่อ') >= 0 ? idxOf('ชื่อ') : 2
    const idxLastName = idxOf('สกุล') >= 0 ? idxOf('สกุล') : 3
    const idxYear = idxOf('ชั้นปีที่') >= 0 ? idxOf('ชั้นปีที่') : 4
    const idxClass = idxOf('ตอน') >= 0 ? idxOf('ตอน') : 5
    const idxPosition = idxOf('ตำแหน่ง') >= 0 ? idxOf('ตำแหน่ง') : 6
    const idxUnit = idxOf('สังกัด') >= 0 ? idxOf('สังกัด') : 7
    const idxPhone = idxOf('เบอร์โทรศัพท์') >= 0 ? idxOf('เบอร์โทรศัพท์') : 8
    const idxNote = idxOf('หมายเหตุ') >= 0 ? idxOf('หมายเหตุ') : 9
    const idxClub = idxOf('ชมรม') >= 0 ? idxOf('ชมรม') : 10
    const idxRoom = idxOf('ห้องนอน') >= 0 ? idxOf('ห้องนอน') : 11
    const idxDuty = idxOf('หน้าที่') >= 0 ? idxOf('หน้าที่') : 12
    const idxStats = idxOf('สถิติโดนยอด') >= 0 ? idxOf('สถิติโดนยอด') : 13
    
    const data = values.slice(1).map((row) => {
      const get = (j: number) => (j >= 0 && j < row.length ? row[j] : '')
      return {
        ลำดับ: get(idxOrder),
        ยศ: get(idxRank),
        ชื่อ: get(idxFirstName),
        สกุล: get(idxLastName),
        ชั้นปีที่: get(idxYear),
        ตอน: get(idxClass),
        ตำแหน่ง: get(idxPosition),
        สังกัด: get(idxUnit),
        เบอร์โทรศัพท์: get(idxPhone),
        หมายเหตุ: get(idxNote),
        ชมรม: get(idxClub),
        ห้องนอน: get(idxRoom),
        หน้าที่: get(idxDuty),
        สถิติโดนยอด: get(idxStats) || '0',
      }
    })

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
  try {
    const body = await request.json() as UpdateRequest
    const { selectedPersons, dutyName, sheetName } = body
    
    // Check if we're in development mode and environment variables are not set
    const isDevelopment = process.env.NODE_ENV === 'development'
    const hasGoogleConfig = process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_PRIVATE_KEY

    if (isDevelopment && !hasGoogleConfig) {
      console.log('Development mode: Mock ceremony update operation')
      
      return NextResponse.json({
        success: true,
        message: `Mock ceremony update for ${selectedPersons.length} people in ${sheetName}`,
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
      range: `${sheetName}!A:L`,
    })

    const currentValues = currentDataResponse.data.values || []
    const updates: any[] = []

    // Find rows to update based on selectedPersons
    for (let i = 1; i < currentValues.length; i++) {
      const row = currentValues[i]
      const personId = row[0] // ลำดับ
      
      if (selectedPersons.includes(personId)) {
        // Update สถิติโดนยอด (column N, index 13)
        const currentStats = (row[13] || '0').replace(/^'/, '');
        const newStats = parseInt(currentStats, 10) + 1;
        
        updates.push({
          range: `${sheetName}!N${i + 1}`, // N column for สถิติโดนยอด
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
      dutyName: dutyName,
      updatedPersons: selectedPersons,
      sheetName: sheetName,
    }

    // Optionally, you can add the log to a separate sheet
    // await logUpdateToSheet(sheets, spreadsheetId, logEntry)

    return NextResponse.json({
      success: true,
      message: `Updated ceremony stats for ${selectedPersons.length} people in ${sheetName}`,
      updatedCount: updates.length,
      timestamp: new Date().toISOString(),
      mode: 'production'
    })
  } catch (error) {
    console.error('Error updating Google Sheets:', error)
    
    // Return mock response in development if Google Sheets fails
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock ceremony update due to Google Sheets error')
      
      // Re-parse the request body to get the data
      const fallbackBody = await request.json() as UpdateRequest
      
      return NextResponse.json({
        success: true,
        message: `Mock ceremony update for ${fallbackBody.selectedPersons.length} people in ${fallbackBody.sheetName}`,
        updatedCount: fallbackBody.selectedPersons.length,
        timestamp: new Date().toISOString(),
        mode: 'mock-fallback',
        warning: 'Using mock update due to Google Sheets error'
      })
    }

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