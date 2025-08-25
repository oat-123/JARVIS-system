"use client"

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from 'lucide-react'

export function CreateFiles({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [displayDateLabel, setDisplayDateLabel] = useState('')
  const [matches, setMatches] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const importNames = async () => {
    if (!date) { setMessage('กรุณาเลือกวันที่'); return }
    setLoading(true)
    setMessage(null)
    try {
      const sheetName = displayDateLabel || date
      const res = await fetch('/api/import-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, sheetName })
      })
      const json = await res.json()
      // json.names: array of {first,last,full,fullNorm}
      setMatches(json.names || [])
      setSelectedIndex(json.names && json.names.length > 0 ? 0 : null)
      setMessage(`พบ ${(json.names || []).length} รายการ`) 
    } catch (e:any) {
      console.error(e)
      setMessage('เกิดข้อผิดพลาดในการดึงชื่อ')
    }
    setLoading(false)
  }

  // format date into tab label like "23-24 ส.ค." and short display like "23-24 ส.ค. 68"
  const formatDateLabel = (iso: string) => {
    try {
      const d = new Date(iso)
      const d2 = new Date(d)
      d2.setDate(d.getDate() + 1)
      const day1 = d.getDate()
      const day2 = d2.getDate()
      const month = d.getMonth() // 0-based
      const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
      const year = d.getFullYear() + 543
      const shortYear = String(year).slice(-2)
      const label = `${day1}-${day2} ${thaiMonths[month]}` // sheet tab (no year)
      const display = `${day1}-${day2} ${thaiMonths[month]} ${shortYear}`
      setDisplayDateLabel(label)
      return display
    } catch (e) {
      setDisplayDateLabel(iso)
      return iso
    }
  }

  const matchNameAgainstList = (q:string, list:any[]) => {
    if (!q) return []
    const qNorm = normalizeStr(q)
    const scored = list.map((it:any) => {
      const full = normalizeStr(it.full || `${it.first} ${it.last}`)
      const lev = levenshtein(qNorm, full)
      // score between 0..1
      const maxLen = Math.max(qNorm.length, full.length) || 1
      const score = 1 - lev / maxLen
      return { ...it, score, full }
    })
    return scored.filter(s => s.score >= 0.6).sort((a,b) => b.score - a.score)
  }

  function normalizeStr(s:string){
    return s.toString().normalize('NFKD').replace(/\s+/g, '').toLowerCase()
  }

  function levenshtein(a:string, b:string){
    const m = a.length, n = b.length
    if (m === 0) return n
    if (n === 0) return m
    const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0))
    for (let i=0;i<=m;i++) dp[i][0] = i
    for (let j=0;j<=n;j++) dp[0][j] = j
    for (let i=1;i<=m;i++){
      for (let j=1;j<=n;j++){
        const cost = a[i-1] === b[j-1] ? 0 : 1
        dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost)
      }
    }
    return dp[m][n]
  }

  const downloadDocx = async () => {
    if (!date) { setMessage('เลือกวันที่ก่อน'); return }
    if (selectedIndex === null || !matches[selectedIndex]) { setMessage('ยังไม่มีชื่อที่เลือก'); return }
    setLoading(true)
    setMessage(null)
    try {
      const chosen = matches[selectedIndex]
      const res = await fetch('/api/fetch-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: chosen.full, nameNorm: chosen.fullNorm || '', date })
      })
      const json = await res.json()
      if (json.ok) {
        setMessage('ดาวน์โหลดเสร็จแล้ว: ' + json.path)
        // open folder? not possible from browser, but we can provide path
      } else {
        // show server diagnostics when available
        const diag = json.diagnostics ? `: ${JSON.stringify(json.diagnostics)}` : ''
        setMessage(`${json.message || 'ไม่พบไฟล์ที่ต้องการ'}${diag}`)
      }
    } catch (e:any) {
      console.error(e)
      setMessage('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={onBack} variant="ghost" className="text-white/90 bg-slate-800/40 border border-slate-700">ย้อนกลับ</Button>
          <h2 className="text-xl font-bold">สร้างไฟล์จาก Drive ตามชื่อ</h2>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <Label>เลือกวันที่</Label>
              <input type="date" value={date} onChange={e=>{ setDate(e.target.value); const disp = formatDateLabel(e.target.value); setMessage(`วันที่เลือก: ${disp}`) }} className="w-full bg-slate-700 text-white px-3 py-2 rounded" />
            </div>
            <div className="col-span-1 sm:col-span-2 flex items-end gap-3">
              <Button onClick={importNames} disabled={loading} className="bg-blue-600 text-white">Import จาก Google Sheet</Button>
              <div className="text-sm text-slate-300">ชีทที่จะใช้: <span className="font-medium text-black bg-yellow-300 px-2 py-0.5 rounded ml-2">{displayDateLabel || '-'}</span></div>
            </div>
          </div>

          <div>
            <Label>รายการในชีท (เลือกชื่อ)</Label>
            <div className="bg-slate-900/40 rounded border border-slate-700 overflow-auto max-h-96">
              {matches.length === 0 ? (
                <div className="p-4 text-slate-400">ยังไม่มีชื่อที่นำเข้า</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-300">
                      <th className="p-3 text-left">ชื่อ</th>
                      <th className="p-3 text-left">นามสกุล</th>
                      <th className="p-3 text-left">ตำแหน่ง ทกท.</th>
                      <th className="p-3 text-left">คู่พี่นายทหาร</th>
                      <th className="p-3 text-left">ผลัด</th>
                      <th className="p-3 text-left">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m,i)=> (
                      <tr key={i} className={`cursor-pointer ${selectedIndex===i ? 'bg-blue-600 text-white' : 'hover:bg-slate-800/60'}`} onClick={()=>setSelectedIndex(i)}>
                        <td className="p-3">{m.first || ''}</td>
                        <td className="p-3">{m.last || ''}</td>
                        <td className="p-3">{m.position || '-'}</td>
                        <td className="p-3">{m.partner || '-'}</td>
                        <td className="p-3">{m.shift || '-'}</td>
                        <td className="p-3">{m.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={downloadDocx} disabled={loading || selectedIndex===null} className="bg-green-600 text-white">ดาวน์โหลด .docx</Button>
            
          </div>

          {message && <div className="text-sm text-slate-300">{message}</div>}
        </div>

      </div>
    </div>
  )
}
