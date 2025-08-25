import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

// Types
interface DiagnosticsData {
  attempts: any[]
  docCandidates: { label: string; downloadUrl: string }[]
  highlightRequested: string | null
  fetchFolderStatus?: number
  fetchFolderError?: string
  subfolders?: string[]
  reason?: string
  chosenEntry?: { label: string; downloadUrl: string }
  exportUrl?: string
  fileStatus?: number
  fileError?: string
  folderName?: string
  mkdirError?: string
  writeError?: string
}

interface RequestBody {
  name: string
  date: string
  folderLabel?: string
  highlightSection?: string
}

interface ChartHighlightData {
  name: string
  value: number
  fill: string
  stroke: string
  strokeWidth: number
  outerRadius: number
  cornerRadius: number
  isHighlighted: boolean
}

// POST { name, date, highlightSection }
export async function POST(req: Request) {
  try {
    const { name, date, folderLabel, highlightSection }: RequestBody = await req.json()
    const baseFolderUrl = 'https://drive.google.com/drive/folders/1yNdCSMtz0vE4b4Kugap5JPHH86r7zyp_'
    
    // Candidates (for diagnostics/matching hints)
    const candidates = [name, `ประวัติ ${name}`, 'ประวัติ ฉก. 2 หน้า', 'ประวัติ 2 หน้า', 'ประวัติ']

    // diagnostics
    const diagnostics: DiagnosticsData = { 
      attempts: [], 
      docCandidates: [],
      highlightRequested: highlightSection || null
    }
    
    const tryUrl = baseFolderUrl
    let folderHtml: string | null = null
    try {
      const res = await fetch(tryUrl)
      diagnostics.fetchFolderStatus = res.status
      folderHtml = await res.text()
    } catch (e: any) {
      diagnostics.fetchFolderError = String(e?.message || e)
      return NextResponse.json({ 
        ok: false, 
        message: 'ไม่สามารถดึงข้อมูลโฟลเดอร์ Drive', 
        diagnostics 
      })
    }

    // helper: normalize string for matching
    const norm = (s: any): string => (s == null ? '' : String(s)).replace(/\s+/g, '').toLowerCase()

    // pick nearest aria-label before index
    const pickNearestLabel = (html: string, idx: number): string => {
      const start = Math.max(0, idx - 1500)
      const chunk = html.slice(start, idx)
      const re = /aria-label=\"([^\"]+)\"/g
      const matches: RegExpExecArray[] = []
      let m: RegExpExecArray | null
      while ((m = re.exec(chunk)) !== null) {
        matches.push(m)
      }
      return matches.length ? matches[matches.length - 1][1] : ''
    }

    // extract docs, file links, and open?id entries into unified entries with downloadUrl
    const extractEntriesFromHtml = (html: string): { label: string; downloadUrl: string }[] => {
      const results: { label: string; downloadUrl: string }[] = []

      // Google Docs (export as docx)
      const docsRe = /https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/g
      for (let m; (m = docsRe.exec(html)); ) {
        const id = m[1]
        const label = pickNearestLabel(html, m.index)
        const downloadUrl = `https://docs.google.com/document/d/${id}/export?format=docx`
        results.push({ label, downloadUrl })
      }

      // Drive files (download via uc)
      const fileRe = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g
      for (let m; (m = fileRe.exec(html)); ) {
        const id = m[1]
        const label = pickNearestLabel(html, m.index)
        const downloadUrl = `https://drive.google.com/uc?id=${id}&export=download`
        results.push({ label, downloadUrl })
      }

      // open?id= pattern
      const openRe = /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/g
      for (let m; (m = openRe.exec(html)); ) {
        const id = m[1]
        const label = pickNearestLabel(html, m.index)
        const downloadUrl = `https://drive.google.com/uc?id=${id}&export=download`
        results.push({ label, downloadUrl })
      }

      return results
    }

    // extract subfolder ids and traverse one level deep
    const extractSubfolderIds = (html: string): string[] => {
      const set = new Set<string>()
      const subRe = /\/drive\/folders\/([a-zA-Z0-9_-]+)/g
      for (let m; (m = subRe.exec(html)); ) set.add(m[1])
      return Array.from(set)
    }

    let allEntries: { label: string; downloadUrl: string }[] = []
    if (folderHtml) {
      allEntries.push(...extractEntriesFromHtml(folderHtml))
      const subfolders = extractSubfolderIds(folderHtml).slice(0, 10)
      diagnostics.subfolders = subfolders
      for (const fid of subfolders) {
        try {
          const subUrl = `https://drive.google.com/drive/folders/${fid}`
          const subRes = await fetch(subUrl)
          const subHtml = await subRes.text()
          allEntries.push(...extractEntriesFromHtml(subHtml))
        } catch (e) {
          // ignore subfolder fetch errors
        }
      }
    }

    diagnostics.docCandidates = allEntries

    // Choose best match by provided name
    const wants = [name, `ประวัติ ${name}`].map(norm)
    const nameTokens = String(name || '').split(/\s+/).filter(Boolean).map(norm)

    let chosen = allEntries.find(e => wants.some(w => norm(e.label).includes(w)))
    if (!chosen) {
      // try partial token match (e.g., last name only)
      chosen = allEntries.find(e => {
        const el = norm(e.label)
        return nameTokens.some(t => t && el.includes(t))
      })
    }
    if (!chosen) {
      // as a weak fallback, pick first entry that looks like 'ประวัติ'
      chosen = allEntries.find(e => /ประวัติ/.test(e.label)) || allEntries[0]
    }

    if (!chosen) {
      diagnostics.reason = 'no-docs-links-parsed'
      return NextResponse.json({ 
        ok: false, 
        message: 'ไม่พบไฟล์ในโฟลเดอร์', 
        diagnostics 
      })
    }

    diagnostics.chosenEntry = chosen
    // Build export URL to download as .docx
    const exportUrl = chosen.downloadUrl
    diagnostics.exportUrl = exportUrl

    const fileRes = await fetch(exportUrl)
    diagnostics.fileStatus = fileRes.status
    if (!fileRes.ok) {
      diagnostics.fileError = `status ${fileRes.status}`
      return NextResponse.json({ 
        ok: false, 
        message: 'ดาวน์โหลดไฟล์ไม่สำเร็จ', 
        diagnostics 
      })
    }

    const arr = await fileRes.arrayBuffer()
    const folderName = folderLabel && String(folderLabel).trim() 
      ? String(folderLabel).trim() 
      : dateToFolderName(date)
    
    diagnostics.folderName = folderName
    
    // Determine base path based on highlight section
    let basePath: string
    if (highlightSection === 'ถวายรายงาน') {
      basePath = `D:\\Desktop\\ฝ1\\433 ชั้น4\\${folderName}\\ถวายรายงาน\\ผู้ปฏิบัติหน้าที่`
    } else if (highlightSection === 'เข้า433') {
      basePath = `D:\\Desktop\\ฝ1\\433 ชั้น4\\${folderName}\\เข้า433\\ผู้ปฏิบัติหน้าที่`
    } else if (highlightSection === 'ธุรการ') {
      basePath = `D:\\Desktop\\ฝ1\\433 ชั้น4\\${folderName}\\ธุรการ\\ผู้ปฏิบัติหน้าที่`
    } else if (highlightSection === 'ไม่เคยเข้า') {
      basePath = `D:\\Desktop\\ฝ1\\433 ชั้น4\\${folderName}\\ไม่เคยเข้า\\ผู้ปฏิบัติหน้าที่`
    } else {
      // Default path
      basePath = `D:\\Desktop\\ฝ1\\433 ชั้น4\\${folderName}\\ประวัติ 2 แผ่น\\ผู้ปฏิบัติหน้าที่`
    }

    try {
      await fs.promises.mkdir(basePath, { recursive: true })
    } catch (e: any) {
      diagnostics.mkdirError = String(e?.message || e)
      return NextResponse.json({ 
        ok: false, 
        message: 'ไม่สามารถสร้างโฟลเดอร์บนเซิร์ฟเวอร์', 
        diagnostics 
      })
    }

    const safeName = (str: any): string => (str || '').replace(/[\\/:*?"<>|]/g, '').trim()
    const finalName = safeName(chosen.label || name || 'document') || 'document'
    const fileName = `${finalName}.docx`
    const savePath = path.join(basePath, fileName)

    try {
      await fs.promises.writeFile(savePath, Buffer.from(arr))
      
      // Generate chart highlighting data based on the selected section
      const chartHighlight = generateChartHighlight(highlightSection)
      
      return NextResponse.json({ 
        ok: true, 
        path: savePath, 
        diagnostics,
        chartHighlight // Include chart highlight data in response
      })
    } catch (e: any) {
      diagnostics.writeError = String(e?.message || e)
      return NextResponse.json({ 
        ok: false, 
        message: 'ไม่สามารถเขียนไฟล์ลงดิสก์', 
        diagnostics 
      })
    }
  } catch (e: unknown) {
    console.error(e)
    return NextResponse.json({ 
      ok: false, 
      message: 'error', 
      error: String(e) 
    })
  }
}

// Helper function to generate chart highlighting configuration
function generateChartHighlight(section: string | undefined): ChartHighlightData[] {
  const sections = ['ถวายรายงาน', 'เข้า433', 'ธุรการ', 'ไม่เคยเข้า']
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']
  const highlightColors = ['#FF5252', '#26C6DA', '#2196F3', '#FF7043']
  
  return sections.map((sectionName, index) => ({
    name: sectionName,
    value: 25, // Example equal distribution
    fill: section === sectionName ? highlightColors[index] : colors[index],
    stroke: section === sectionName ? '#FFFFFF' : 'none',
    strokeWidth: section === sectionName ? 3 : 0,
    outerRadius: section === sectionName ? 110 : 100, // Make highlighted section larger
    cornerRadius: section === sectionName ? 8 : 4,
    isHighlighted: section === sectionName
  }))
}

function dateToFolderName(dateStr: any): string {
  try {
    const d = new Date(dateStr)
    // compute range as selected day to next day
    const next = new Date(d)
    next.setDate(d.getDate() + 1)
    const day1 = d.getDate()
    const day2 = next.getDate()
    const monthIdx = d.getMonth()
    const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    const beShort = String(d.getFullYear() + 543).slice(-2)
    return `${day1}-${day2} ${thMonths[monthIdx]} ${beShort}`
  } catch { 
    return String(dateStr) 
  }
}