import { NextRequest, NextResponse } from 'next/server'
import { getSheetsService } from '@/lib/google-auth'

// Spreadsheet provided by user for weekly 433 duty tabs (each sheet = weekend)
const SPREADSHEET_ID_WEEKLY = '1VLyX1Ug7wY0SENaBzyl50i7HoJIhhOGAnPTbd02hqqw'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sheetName = (searchParams.get('sheetName') || '').trim()
    if (!sheetName) {
      return NextResponse.json({ success: false, error: 'Missing sheetName' }, { status: 400 })
    }

    const sheets = await getSheetsService()
    // Attempt exact tab first
    let targetTab = sheetName
    let values: any[][] = []
    try {
      const range = `${targetTab}!A:AB`
      const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID_WEEKLY, range })
      values = resp.data.values || []
    } catch (e) {
      // Fallback: list sheet titles and try fuzzy match
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID_WEEKLY })
      const titles = (meta.data.sheets || []).map(s => s.properties?.title || '').filter(Boolean)
      // normalize function: remove spaces/dots, keep Thai chars and digits
      const norm = (s: string) => s.toString().replace(/[\s\.]/g, '').trim()
      const targetN = norm(sheetName)
      // try match by including month token and day range regardless of spaces
      const candidates = titles.map(t => ({ title: t, score: similarity(norm(t), targetN) }))
        .sort((a,b)=> b.score - a.score)
      if (candidates.length && candidates[0].score >= 0.5) {
        targetTab = candidates[0].title
        const range = `${targetTab}!A:AB`
        const resp2 = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID_WEEKLY, range })
        values = resp2.data.values || []
      } else {
        return NextResponse.json({ success: false, error: `Tab not found: ${sheetName}`, tabs: titles }, { status: 404 })
      }
    }
    if (values.length < 2) {
      return NextResponse.json({ success: true, people: [] })
    }

    // Determine header row (if first row is date banner, second row is header)
    const headerRowIdx = 1
    const headers = (values[headerRowIdx] || []).map((h: any) => (h || '').toString().trim())
    const idxOf = (name: string) => headers.findIndex(h => h.includes(name))
    const idxRank = idxOf('ยศ') >= 0 ? idxOf('ยศ') : 0
    const idxFirst = idxOf('ชื่อ') >= 0 ? idxOf('ชื่อ') : 1
    const idxLast = idxOf('สกุล') >= 0 ? idxOf('สกุล') : 2
    const idxPosition = headers.findIndex(h => h.includes('ตำแหน่ง'))
    const idxHeight = headers.findIndex(h => h.includes('ส่วนสูง') || h.includes('สูง'))
    const idxPartner = headers.findIndex(h => h.includes('คู่'))

    const people: any[] = []
    for (let r = headerRowIdx + 1; r < values.length; r++) {
      const row = values[r] || []
      const first = (row[idxFirst] || '').toString().trim()
      const last = (row[idxLast] || '').toString().trim()
      const rank = (row[idxRank] || '').toString().trim()
      if (!first && !last) continue
      const position = (idxPosition>=0 ? (row[idxPosition]||'') : '')
      // Fallback to fixed columns if headers are unknown: I (8), J (9)
      const height = (idxHeight>=0 ? row[idxHeight] : row[8]) || ''
      const partner = (idxPartner>=0 ? row[idxPartner] : row[9]) || ''
      people.push({ ยศ: rank, ชื่อ: first, สกุล: last, ตำแหน่ง: position, ส่วนสูง: String(height).trim(), partner: String(partner).trim(), คู่: String(partner).trim() })
    }

    return NextResponse.json({ success: true, people, sheet: targetTab })
  } catch (e:any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

// simple similarity based on longest common subsequence over length
function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  const la = a.length, lb = b.length
  const dp: number[][] = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0))
  for (let i=1;i<=la;i++){
    for (let j=1;j<=lb;j++){
      if (a[i-1] === b[j-1]) dp[i][j] = dp[i-1][j-1] + 1
      else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1])
    }
  }
  const lcs = dp[la][lb]
  const maxLen = Math.max(la, lb)
  return maxLen ? lcs / maxLen : 0
}


