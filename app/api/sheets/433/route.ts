import { NextRequest, NextResponse } from "next/server"
import { getSheetsService } from "@/lib/google-auth"

// Spreadsheet ID for 433 data (from user)
const SPREADSHEET_ID_433 = "1E0cu1J33gpRA-OHyNYL7tND30OoHBX4YpeoQ7JFUOaQ"

function safeParseDateCell(cell: string | undefined): string | null {
  if (!cell) return null
  // Cell may contain date plus extra text, e.g. "๒๓ ส.ค. ๖๘ ภูธร"
  // Extract up to first non-date word by stopping at any non-Thai/space/dot/digit characters sequence after the date
  // For simplicity, take the first 20 characters and try to match Thai date-like pattern
  const trimmed = cell.toString().trim()
  // Basic heuristic: keep tokens that contain Thai digits or Thai month abbreviations or digits/./space
  const tokens = trimmed.split(/\s+/)
  const kept: string[] = []
  for (const t of tokens) {
    // allow Thai characters, digits, dots, short Latin month-like words (rare)
    if (/^[\u0E00-\u0E7F0-9.\/:-]+$/.test(t) || /[\u0E00-\u0E7F]/.test(t)) {
      kept.push(t)
    } else {
      break
    }
  }
  return kept.length ? kept.join(' ') : trimmed
}

export async function GET(request: NextRequest) {
  try {
    const sheets = await getSheetsService()

    // Try to read main sheet named 'นนร.' or first sheet
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID_433 })
    const sheetTitle = spreadsheet.data.sheets?.[0]?.properties?.title || 'นนร.'

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID_433,
      // Extend range to include AA และ AB (น.กำกับยาม, วันที่)
      range: `${sheetTitle}!A:AB`,
    })

    const values = response.data.values || []
    if (values.length === 0) {
      return NextResponse.json({ success: true, data: [], message: 'empty' })
    }

    const headers = values[0].map((h: any) => (h || '').toString().trim())

    // Find column indexes by header names (best-effort)
    const idxOf = (name: string) => headers.findIndex(h => h.includes(name))
  const idxReport = idxOf('ถวายรายงาน')
  const idxDutyOfficer = idxOf('น.กำกับยาม')
  const idxDate = idxOf('วันที่')
  const idx433Cols = [idxOf('433 ครั้งที่ 1'), idxOf('433 ครั้งที่ 2'), idxOf('433 ครั้งที่ 3'), idxOf('433 ครั้งที่ 4')]
  const idxAdminCols = [idxOf('ธุรการ ครั้งที่ 1'), idxOf('ธุรการ ครั้งที่ 2'), idxOf('ธุรการ ครั้งที่ 3'), idxOf('ธุรการ ครั้งที่ 4'), idxOf('ธุรการ ครั้งที่ 5')]
  // extra columns we want to surface into each person row
  const idxGrade = idxOf('คัดเกรด')
  const idxAdminField = idxOf('ธุรการ ฝอ.') >= 0 ? idxOf('ธุรการ ฝอ.') : idxOf('ธุรการ')
  const idxTua = idxOf('ตัวชน')
  const idxHeight = idxOf('ส่วนสูง')
  const idxSport = idxOf('นักกีฬา')

    const people: any[] = []
    for (let i = 1; i < values.length; i++) {
      const row = values[i]
      const get = (j: number) => (j >= 0 && j < row.length ? row[j] : '')
      const person = {
        ลำดับ: get(0),
        ยศ: get(1),
        ชื่อ: get(2),
        สกุล: get(3),
        ชั้นปีที่: get(4),
        ตอน: get(5),
        ตำแหน่ง: get(6),
        สังกัด: get(7),
  เบอร์โทรศัพท์: get(8),
  คัดเกรด: get(idxGrade),
  "ธุรการ ฝอ.": get(idxAdminField),
  ตัวชน: get(idxTua),
  ส่วนสูง: get(idxHeight),
  นักกีฬา: get(idxSport),
        ถวายรายงาน: get(idxReport),
        "น.กำกับยาม": get(idxDutyOfficer),
        "วันที่": get(idxDate),
        _433_dates: idx433Cols.map(c => safeParseDateCell(get(c))),
        _admin_dates: idxAdminCols.map(c => safeParseDateCell(get(c))),
      }
      people.push(person)
    }

    // Aggregations for pie chart
    let countReport = 0
    let count433 = 0
    let countAdmin = 0
    let countNever = 0

    // Also compute report counts per person
    const reportCounts: Record<string, number> = {}

    people.forEach(p => {
      const reportCell = (p.ถวายรายงาน || '').toString()
      const hasReport = !!(reportCell && reportCell.toString().trim())
      const has433 = p._433_dates.some((d: any) => d && d.toString().trim())
      const hasAdmin = p._admin_dates.some((d: any) => d && d.toString().trim())

      if (hasReport) countReport++
      if (has433) count433++
      if (hasAdmin) countAdmin++
      if (!hasReport && !has433 && !hasAdmin) countNever++

      // For reportCounts, check ถวายรายงาน column may contain codes like HMSV, 904, 919 separated by commas or spaces
      if (hasReport) {
        const tokens = reportCell.toString().split(/[\s,;\/]+/).map((t: string) => t.trim()).filter(Boolean)
        tokens.forEach((tok: string) => {
          reportCounts[tok] = (reportCounts[tok] || 0) + 1
        })
      }
    })

    // Turn reportCounts into sorted array
    const topReporters = Object.entries(reportCounts).map(([k, v]) => ({ name: k, count: v })).sort((a, b) => b.count - a.count)

    // For top people (by number of report dates), compute counts per person by counting non-empty report date tokens in ถวายรายงาน + 433 + admin depending on metric
    const personStats = people.map((p: any) => {
      const reportDates = (p.ถวายรายงาน || '').toString() ? 1 : 0
      const num433 = p._433_dates.filter((d: any) => d && d.toString().trim()).length
      const numAdmin = p._admin_dates.filter((d: any) => d && d.toString().trim()).length
      return {
        fullName: `${p.ยศ || ''} ${p.ชื่อ || ''} ${p.สกุล || ''}`.trim(),
        report: reportDates,
        _433: num433,
        admin: numAdmin,
      }
    })

    // Top 5 tables
    const topByReportPerson = [...personStats].sort((a, b) => b.report - a.report).slice(0, 5)
    const topBy433Person = [...personStats].sort((a, b) => b._433 - a._433).slice(0, 5)
    const topByAdminPerson = [...personStats].sort((a, b) => b.admin - a.admin).slice(0, 5)

    return NextResponse.json({
      success: true,
      data: {
        totals: { report: countReport, duty433: count433, admin: countAdmin, never: countNever },
        topReporters,
        topByReportPerson,
        topBy433Person,
        topByAdminPerson,
        people,
      }
    })
  } catch (error) {
    console.error('Error in 433 API:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'unknown' }, { status: 500 })
  }
}
