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
    const rawHeaders = values[0]
    const headers = rawHeaders.map((h: any) => (h || '').toString().trim())
    const normalize = (s: string) => (s || '')
      .toString()
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width
      .replace(/\./g, '') // dots like 'ยศ.'
      .replace(/\s+/g, '') // spaces
      .toLowerCase()
    const normalizedHeaders = headers.map(normalize)
    const idxOf = (name: string) => {
      const key = normalize(name)
      return normalizedHeaders.findIndex(h => h.includes(key))
    }
    
    const idxOrder = idxOf('ลำดับ')
    const idxFullName = idxOf('ยศชื่อ-สกุล') >= 0 ? idxOf('ยศชื่อ-สกุล') : idxOf('ยศชื่อสกุล')
    const idxRank = idxOf('ยศ')
    const idxFirstName = idxOf('ชื่อ')
    const idxLastName = idxOf('สกุล')
    const idxYear = idxOf('ชั้นปีที่')
    const idxClass = idxOf('ตอน')
    const idxPosition = idxOf('ตำแหน่ง')
    const idxUnit = idxOf('สังกัด')
    const idxPhone = idxOf('เบอร์โทรศัพท์')
    const idxNote = idxOf('หมายเหตุ')
    const idxClub = idxOf('ชมรม')
    const idxRoom = idxOf('ห้องนอน')
    const idxDuty = idxOf('หน้าที่')
    const idxStats = idxOf('สถิติโดนยอด')
    
    // Fallback index by fixed positions (0-based) as seen in the provided sheet images
    const F_ORDER = 0, F_RANK = 1, F_FIRST = 2, F_LAST = 3, F_YEAR = 4, F_CLASS = 5, F_POSITION = 6, F_UNIT = 7, F_PHONE = 8, F_NOTE = 9
    
    const safeIdx = (preferred: number, fallback: number) => (preferred >= 0 ? preferred : fallback)
    
    const data = values.slice(1).map((row) => {
      const get = (j: number) => (j >= 0 && j < row.length ? row[j] : '')
      const clean = (v: any) => String(v ?? '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim()
      // ตามคำขอ: ไม่สนใจ header ให้ถือว่าชื่ออยู่คอลัมน์ C และสกุลคอลัมน์ D เสมอ
      let firstRaw = clean(get(F_FIRST))
      let lastRaw = clean(get(F_LAST))
      let rankRaw = clean(get(F_RANK) || (idxRank >= 0 ? get(idxRank) : ''))
      
      // ถ้า C มีรูปแบบ "นนร. ชื่อ สกุล" และ D ว่าง ให้ split ออกจาก C
      if ((!firstRaw || !lastRaw) && /^(นนร|นตท|นตต|นช|นส|นร)\.?\s+/i.test(firstRaw)) {
        const parts = firstRaw.split(' ').filter(Boolean)
        if (parts.length >= 3) {
          rankRaw = rankRaw || parts[0]
          firstRaw = parts[1]
          lastRaw = parts.slice(2).join(' ')
        }
      }
      
      // Heuristic: หาก C/D ยังว่าง ให้ค้นหาช่องแรกๆ ทางขวาของคอลัมน์ B ที่เป็นชื่อ-สกุล
      if (!firstRaw || !lastRaw) {
        const isThaiDigitStr = (s: string) => /^[๐๑๒๓๔๕๖๗๘๙0-9]+$/.test((s || '').replace(/\s+/g,'').trim())
        const rankCandidates = ['นนร','นตท','นตต','นช','นส','นร']
        const isRank = (s: string) => rankCandidates.some(r => new RegExp('^'+r+'\.?$','i').test(s.trim()))
        const cells = [clean(get(2)), clean(get(3)), clean(get(4)), clean(get(5)), clean(get(6))]
        // กรองค่าไม่ใช่ยศ/ตัวเลข/ว่าง
        const words = cells.filter(v => v && !isRank(v) && !isThaiDigitStr(v))
        if (words.length >= 1 && !firstRaw) firstRaw = words[0]
        if (words.length >= 2 && !lastRaw) lastRaw = words[1]
      }
      
      return {
        ลำดับ: clean(get(safeIdx(idxOrder, F_ORDER))),
        ยศ: rankRaw,
        ชื่อ: firstRaw,
        สกุล: lastRaw,
        ชั้นปีที่: clean(get(safeIdx(idxYear, F_YEAR))),
        ตอน: clean(get(safeIdx(idxClass, F_CLASS))),
        ตำแหน่ง: clean(get(safeIdx(idxPosition, F_POSITION))),
        สังกัด: clean(get(safeIdx(idxUnit, F_UNIT))),
        เบอร์โทรศัพท์: clean(get(safeIdx(idxPhone, F_PHONE))),
        หมายเหตุ: clean(get(safeIdx(idxNote, F_NOTE))),
        ชมรม: idxClub >= 0 ? clean(get(idxClub)) : '',
        ห้องนอน: idxRoom >= 0 ? clean(get(idxRoom)) : '',
        หน้าที่: idxDuty >= 0 ? clean(get(idxDuty)) : '',
        สถิติโดนยอด: idxStats >= 0 ? clean(get(idxStats) || '0') : '0',
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