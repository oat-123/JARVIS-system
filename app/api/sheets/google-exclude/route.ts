import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { getSheetsService } from '@/lib/google-auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const spreadsheetId = searchParams.get('spreadsheetId')
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  const user = session.username

  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!spreadsheetId) return NextResponse.json({ success: false, error: 'Missing spreadsheetId' }, { status: 400 })

  try {
    const sheets = await getSheetsService()
    const res = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' })
    const sheetProps = res.data.sheets || []
    const names = sheetProps.map(s => s.properties?.title).filter(Boolean) as string[]
    return NextResponse.json({ success: true, sheets: names })
  } catch (err) {
    console.error('[API/google-exclude] Error fetching sheets:', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
    const user = session.username
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const spreadsheetId: string = body.spreadsheetId
    const sheetsToRead: string[] = body.sheets || []

    if (!spreadsheetId) return NextResponse.json({ success: false, error: 'Missing spreadsheetId' }, { status: 400 })
    if (!sheetsToRead.length) return NextResponse.json({ success: false, error: 'No sheets selected' }, { status: 400 })

    const sheets = await getSheetsService()
  const names = new Set<string>()
  const perSheet: Record<string, string[]> = {}
  const perSheetRaw: Record<string, string[][]> = {}

    for (const sheetName of sheetsToRead) {
      try {
        // Read entire sheet values so we can detect which columns contain first/last name
        const range = `${sheetName}`
        const res = await sheets.spreadsheets.values.get({ spreadsheetId, range })
  const values = res.data.values || []
  // keep a small raw sample for debugging (first 10 rows)
  perSheetRaw[sheetName] = values.slice(0, 10)
        const foundInSheet: string[] = []

        // Try to detect header columns for 'ชื่อ' and 'สกุล' in the first 3 rows
        let idxFirst = -1
        let idxLast = -1
        const headerRows = values.slice(0, 3)
        for (let r = 0; r < headerRows.length; r++) {
          const row = headerRows[r] || []
          for (let c = 0; c < row.length; c++) {
            const cell = (row[c] || '').toString().trim()
            if (cell.match(/ชื่อ/i)) idxFirst = c
            if (cell.match(/สกุล/i)) idxLast = c
          }
        }

        // Fallback to columns C/D (0-based 2 and 3)
        if (idxFirst === -1) idxFirst = 2
        if (idxLast === -1) idxLast = 3

        // Process rows starting from row index 2 (which corresponds to row 3 in Sheets)
        for (let i = 2; i < values.length; i++) {
          const row = values[i] || []
          let first = (row[idxFirst] || '').toString().trim()
          let last = (row[idxLast] || '').toString().trim()

          // If both empty, try to find a combined full-name cell in the row and split it
          if (!first && !last) {
            const combinedCell = row.find((cell: any) => typeof cell === 'string' && cell.trim().split(/\s+/).length >= 2)
            if (combinedCell) {
              const parts = combinedCell.trim().split(/\s+/)
              first = parts[0]
              last = parts.slice(1).join(' ')
            }
          }

          const full = `${first} ${last}`.trim()
          if (full) {
            names.add(full)
            foundInSheet.push(full)
          }
        }

        perSheet[sheetName] = foundInSheet
        console.log(`[API/google-exclude] Sheet='${sheetName}' cols used first=${idxFirst} last=${idxLast} -> ${foundInSheet.length} names`, foundInSheet.slice(0, 50))
      } catch (err) {
        console.warn(`[API/google-exclude] Failed to read sheet '${sheetName}':`, err)
        perSheet[sheetName] = []
      }
    }

  return NextResponse.json({ success: true, names: Array.from(names), perSheet, perSheetRaw, count: names.size })
  } catch (err) {
    console.error('[API/google-exclude] POST error:', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
