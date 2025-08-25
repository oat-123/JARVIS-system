import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

// POST { name, date }
export async function POST(req: Request) {
  try {
    const { name, date } = await req.json()
    const baseFolderUrl = 'https://drive.google.com/drive/folders/1yNdCSMtz0vE4b4Kugap5JPHH86r7zyp_'
    // Build candidate folder names: exact name, name inside 'ประวัติ' etc.
    const candidates = [name, `ประวัติ ${name}`, 'ประวัติ ฉก. 2 หน้า', 'ประวัติ 2 หน้า', 'ประวัติ']
    // Try fetching folder HTML and find a link to a docx file
    // diagnostics
    const diagnostics: any = { attempts: [] }
    const tryUrl = baseFolderUrl
    let folderHtml: string | null = null
    try {
      const res = await fetch(tryUrl)
      diagnostics.fetchFolderStatus = res.status
      folderHtml = await res.text()
    } catch (e:any) {
      diagnostics.fetchFolderError = String(e.message || e)
      return NextResponse.json({ ok: false, message: 'ไม่สามารถดึงข้อมูลโฟลเดอร์ Drive', diagnostics })
    }

    for (const cand of candidates) {
      try {
        const found = folderHtml && folderHtml.includes(cand)
        diagnostics.attempts.push({ candidate: cand, foundInHtml: !!found })
        if (!found) continue
        const m = (folderHtml || '').match(/https:\/\/[^\s"']+\.docx/gi)
        diagnostics.docxLinks = m || []
        if (!m || m.length === 0) continue
        const fileUrl = m[0]
        diagnostics.chosenFile = fileUrl
        const fileRes = await fetch(fileUrl)
        diagnostics.fileStatus = fileRes.status
        if (!fileRes.ok) { diagnostics.fileError = `status ${fileRes.status}`; continue }
        const arr = await fileRes.arrayBuffer()
        const dateFolderName = dateToFolderName(date)
        const basePath = `D:\\Desktop\\ฝ1\\${dateFolderName}\\ประวัติ 2 แผ่น\\ผู้ปฏิบัติหน้าที่`
        try {
          await fs.promises.mkdir(basePath, { recursive: true })
        } catch (e:any) {
          diagnostics.mkdirError = String(e.message || e)
          return NextResponse.json({ ok: false, message: 'ไม่สามารถสร้างโฟลเดอร์บนเซิร์ฟเวอร์', diagnostics })
        }
        const fileName = fileUrl.split('/').pop() || `${cand}.docx`
        const savePath = path.join(basePath, fileName)
        try {
          await fs.promises.writeFile(savePath, Buffer.from(arr))
          return NextResponse.json({ ok: true, path: savePath, diagnostics })
        } catch (e:any) {
          diagnostics.writeError = String(e.message || e)
          return NextResponse.json({ ok: false, message: 'ไม่สามารถเขียนไฟล์ลงดิสก์', diagnostics })
        }
      } catch (e:any) {
        diagnostics.attempts.push({ candidate: cand, error: String(e.message || e) })
        continue
      }
    }
    return NextResponse.json({ ok: false, message: 'ไม่พบไฟล์ในโฟลเดอร์', diagnostics })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, message: 'error', error: String(e) })
  }
}

function dateToFolderName(dateStr:any){
  try {
    const d = new Date(dateStr)
    const day = d.getDate()
    const mo = d.getMonth()+1
    const yy = d.getFullYear()-2000
    return `${day}-${mo} ส.ค. ${yy}`
  } catch { return String(dateStr) }
}
