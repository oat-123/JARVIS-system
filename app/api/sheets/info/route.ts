import { NextRequest, NextResponse } from "next/server"
import { getSheetsService, validateGoogleAuthConfig } from "@/lib/google-auth"

export async function GET(request: NextRequest) {
  try {
    // Check if we're in development mode and environment variables are not set
    const isDevelopment = process.env.NODE_ENV === 'development'
    const hasGoogleConfig = process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_PRIVATE_KEY

    if (isDevelopment && !hasGoogleConfig) {
      console.log('Development mode: Returning mock sheet info')
      
      return NextResponse.json({
        success: true,
        sheets: [
          'รวมชั้น4',
          'ชั้น4_พัน4',
          'ชั้น4_พัน3', 
          'ชั้น4_พัน1'
        ],
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

    // Get spreadsheet metadata to list all sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    })
    
    const sheetNames = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title) || []
    
    console.log('Available sheets in spreadsheet:', sheetNames)

    return NextResponse.json({
      success: true,
      sheets: sheetNames,
      timestamp: new Date().toISOString(),
      mode: 'production'
    })
  } catch (error) {
    console.error('Error fetching sheet info from Google Sheets:', error)
    
    // Return mock data in development if Google Sheets fails
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock sheet info due to Google Sheets error')
      
      return NextResponse.json({
        success: true,
        sheets: [
          'รวมชั้น4',
          'ชั้น4_พัน4',
          'ชั้น4_พัน3', 
          'ชั้น4_พัน1'
        ],
        timestamp: new Date().toISOString(),
        mode: 'mock-fallback',
        warning: 'Using mock sheet info due to Google Sheets error'
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sheet info from Google Sheets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
} 