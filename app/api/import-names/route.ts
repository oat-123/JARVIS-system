import { NextResponse } from 'next/server'
import fetch from 'node-fetch'

// POST { date }
export async function POST(req: Request) {
  try {
    const { date, sheetName } = await req.json()
    // Fetch Google Sheet CSV using sheet name when provided, fallback to gid
    const sheetId = '1VLyX1Ug7wY0SENaBzyl50i7HoJIhhOGAnPTbd02hqqw'
    const gid = '992125215'
    let url = ''
    if (sheetName) {
      // use gviz CSV export for named sheet (works when sheet name exists)
      const enc = encodeURIComponent(sheetName)
      url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${enc}`
    } else {
      url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
    }
    const res = await fetch(url)
    if (!res.ok) return NextResponse.json({ names: [] })
    const text = await res.text()
    // Parse CSV robustly into rows with simple quote-aware parser
    const rowsRaw = text.split('\n').filter(Boolean)
    const rows:any[] = rowsRaw.map(line => {
      const cols:any[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQuotes = !inQuotes; continue }
        if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; continue }
        cur += ch
      }
      cols.push(cur.trim())
      return cols
    })
    // Heuristic: columns: ยศ, ชื่อ, สกุล OR index 1,2,3
    // Use header row to map columns if present
    const names: any[] = []
    const header = rows[0] || []
    const findIdx = (candidates: string[]) => {
      for (let i = 0; i < header.length; i++) {
        const h = (header[i] || '').toString().trim()
        for (const c of candidates) if (h === c) return i
      }
      // try case-insensitive contains
      for (let i = 0; i < header.length; i++) {
        const h = (header[i] || '').toString().trim().toLowerCase()
        for (const c of candidates) if (h.includes(c.replace(/\s+/g,'').toLowerCase())) return i
      }
      return -1
    }

    const idxTitle = findIdx(['ยศ','title'])
    const idxFirst = findIdx(['ชื่อ','first','firstname'])
    const idxLast = findIdx(['สกุล','last','lastname'])
    const idxPos = findIdx(['ตำแหน่ง ทกท.','ตำแหน่ง','position'])
    const idxPartner = findIdx(['คู่พี่นายทหาร','คู่พี่นาย','คู่พี่','partner'])
    const idxShift = findIdx(['ผลัด','ผัด','shift'])
    const idxNote = findIdx(['หมายเหตุ','note','หมายเหตุ'])

    const norm = (s:string) => s.toString().normalize('NFKD').replace(/\s+/g, '').toLowerCase()
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const title = (idxTitle >= 0 ? r[idxTitle] : (r[1] || '')).toString().trim()
      const first = (idxFirst >= 0 ? r[idxFirst] : (r[2] || '')).toString().trim()
      const last = (idxLast >= 0 ? r[idxLast] : (r[3] || '')).toString().trim()
      const position = idxPos >= 0 ? (r[idxPos] || '').toString().trim() : ''
      const partner = idxPartner >= 0 ? (r[idxPartner] || '').toString().trim() : ''
      const shift = idxShift >= 0 ? (r[idxShift] || '').toString().trim() : ''
      const note = idxNote >= 0 ? (r[idxNote] || '').toString().trim() : ''
      const full = `${title} ${first} ${last}`.trim()
      names.push({ title, first, last, full, position, partner, shift, note, fullNorm: norm(full) })
    }
    return NextResponse.json({ names })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ names: [] })
  }
}
