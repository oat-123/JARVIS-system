import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

// Google Sheets configuration
const GOOGLE_SHEETS_CREDENTIALS = {
  type: "service_account",
  project_id: "oat-assist",
  private_key_id: "6e9fd4d2776efa9d1c49e0c39ac3e0337d9219bb",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEFaLot9VdrGgi\nXdzlGHwjM/WEhaoazbLgQdz+0lfemzewKSfcmNRyyOW8CEkRboYn+u2LSb8+1H06\nEIGkFTbQ8+3ZTZQLMJuUBeApcV8DIwf6ACIEhFL/WnnSYUUQJNB3Kcw99ZG7qvCN\nu3+36XkTdQf2NE+EmBLnMqZD5OP+uMCuzAbixXavYvbmcHMo7o1PLwoYddPbXR/r\nQiRasJeqtLb6yHSzlZepVBo4BPq5ng2+Zo7bKk9JmsKymXATN7UhGtidCm9WDeHM\n+cuzrn2U0kz1+tBT5e3FHzHwrBDcoTytiedpMBbCdTWPakLeV1kO6JTKqxk+YjBU\nnLQ4URyFAgMBAAECggEAXi2aKjYpZ61n8qGsd+hzryDEmlrsoaUMdgOMVmPGymc4\nrwaFW8GXwG3XUaGVHqc8DjXKI+1OyqmaX+oPqjR6OJAAPC+znFBDWSwdRyppnQMV\nULEBpbO8fWMCQdZwKlnUOne73kJ1NXLbyOc2Z6neekbqhQkI7EFyStMb4l4sV2mj\n/f7CW1zXZo7txP9atz7RJWujOoXfspEUIXJBbiUV0Azna1k9/QasUrcyzEMf++iJ\n7oUG10NL8yx8fZNumHtsHaraHt6tIwVhitnCUVpl70inri7gQWZSAou96k3v+Vph\nOSkeI0P/Me47+B9/pEBCrcV4CZy2dWYd7/gTXACQvQKBgQDikUcx50DvWinYoLmV\nEskZ1niS7im62fsG/Z3yFa2QSrqBMPv0zAEFuWohFHT/kGO4RExKfk2QfWqcTk/u\niBrzU49VjqZu5HIqkWYbTdQSJFedOE6ur23uYRq4XGuKhzX2mfb68j6xSsEnO4bM\nr9cHFuc86rRfmXDE1b+DzmIxqwKBgQDdjp4IdGuL1dWgI7F8YX5VJFXfpcdRWtbK\nf40PKBAEdlQ2naPKpvFQqL8kHApEBgx5QNKhG7VU2KC+sDd7aXEfhJGKR8+LFpJ/\nHy6zgPRULop03jUq51Mm80fq4OPIYwwEKbFUi/DpqzjPe1Ao+lRQQraL3B5yH1ro\nyFQfT0QajwKBgArLBOs5qvw7/VZWgcC6Pl4+u0u0kMRX8f9pQYbwxW3kQXI6FSaa\nOUo+hPHCebha9oUmq8O4tJU3hEah7Gjejvocdu2KeB88PrwMZSLT2FBs7seMkSL9\nNG1wrsctj+nvewCeYQefVqE3gHAQA+HoVoP98VITlDghpR+bVx4+TKs1AoGANGj7\nS0a29iJEYZhv8NtjNiLdSYV+y+jwLIDVzoMMnvGa5DyQNW0eYpU4egNEDmlb5AcI\njGHwmDyScelfhosf3nPOteZc2ysgxn+K3Z2grpU/3Xt/GkIUcn9UQOSoHYwImKeA\nMl7UQ4JkcvhZswfckAvoANe2QArYx340IB/xHVMCgYEAtXRKoGX+07+VThdazkl/\nVsHQGZ8EuB0JWSyMxkNgrIWwM0egLmlDrgWUeDM+Q0SSTRSFrN6pHlEQ4kPBtGBk\nxQ5RJFCEwaVtFc2iW9chWvVX+lbbw9NVGbPCcai8s3msV8gGZCzvVuadGMYx6UsU\nPQMFGMIGH/0EBzLT+LFEeYE=\n-----END PRIVATE KEY-----\n",
  client_email: "oatmultitools-oatdev-com@oat-assist.iam.gserviceaccount.com",
  client_id: "106726004126140712061",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/oatmultitools-oatdev-com%40oat-assist.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
}

// Spreadsheet ID - replace with your actual spreadsheet ID
const SPREADSHEET_ID = "1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk"

// Initialize Google Sheets client
const getGoogleSheetsClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_SHEETS_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
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
    const sheetName = searchParams.get("sheetName") || "ชั้น4_พัน4"
    
    const sheets = getGoogleSheetsClient()
    
    // Get data from the specified sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
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