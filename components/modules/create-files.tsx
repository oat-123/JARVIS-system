"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

export function CreateFiles({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [displayDateLabel, setDisplayDateLabel] = useState('')
  const [matches, setMatches] = useState<any[]>([])
  const [additionalHeaders, setAdditionalHeaders] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [folderLabel, setFolderLabel] = useState('')
  const [progress, setProgress] = useState<number>(0)
  const [showProgress, setShowProgress] = useState<boolean>(false)
  const [progressText, setProgressText] = useState<string>('')

  type LinkState = {
    status: 'idle' | 'loading' | 'ok' | 'error'
    url?: string
    filename?: string
    percent?: number
    message?: string
    folderId?: string
    imageStatus?: 'idle' | 'loading' | 'ok' | 'error'
    imageUrl?: string
    imageFilename?: string
    imageFolderId?: string
  }
  const [linkStates, setLinkStates] = useState<Record<number, LinkState>>({})
  const [abortMap, setAbortMap] = useState<Record<number, AbortController>>({})
  const [timerMap, setTimerMap] = useState<Record<number, number>>({})
  const [stagedTimerMap, setStagedTimerMap] = useState<Record<number, number[]>>({})
  const [processingAll, setProcessingAll] = useState<boolean>(false)
  const [cancelAll, setCancelAll] = useState<boolean>(false)
  const [singleAbort, setSingleAbort] = useState<AbortController | null>(null)
  const [copiedPath, setCopiedPath] = useState<boolean>(false)
  const [rootDriveFolderId, setRootDriveFolderId] = useState('1yNdCSMtz0vE4b4Kugap5JPHH86r7zyp_')
  const [imageDriveFolderId, setImageDriveFolderId] = useState('17h7HzW7YQqXeVH7-A-EhkJKQOmGNUC5s')

  useEffect(() => {
    const fetchDriveConfigs = async () => {
      try {
        const res = await fetch('/api/admin/config')
        const data = await res.json()
        if (data.success && data.configs) {
          if (data.configs.GOOGLE_DRIVE_ROOT_ID) setRootDriveFolderId(data.configs.GOOGLE_DRIVE_ROOT_ID)
          if (data.configs.GOOGLE_DRIVE_IMAGE_ID) setImageDriveFolderId(data.configs.GOOGLE_DRIVE_IMAGE_ID)
        }
      } catch (error) {
        console.error('Error fetching drive configs:', error)
      }
    }
    fetchDriveConfigs()
  }, [])

  const [alternativeFilesInfo, setAlternativeFilesInfo] = useState<{ type: 'word' | 'image', files: any[], originalIndex: number } | null>(null);

  const normalizeSpaces = (s: string) => s.replace(/\s+/g, ' ').trim()
  const stripDuplicatePrefix = (s: string) => {
    if (!s) return ''
    let out = s
      .replace(/(นนร\.?\s*){2,}/gi, 'นนร. ')
    out = out.replace(/\s+/g, ' ').trim()
    out = out.replace(/^นนร\.?\s*นนร\.?/i, 'นนร.')
    return out
  }
  const buildPersonName = (first?: string, last?: string) => normalizeSpaces(`${first || ''} ${last || ''}`)
  const buildFolderName = (first?: string, last?: string) => {
    const base = buildPersonName(first, last)
    let name = `นนร. ${base}`
    name = stripDuplicatePrefix(name)
    return name
  }

  const nextWeekendRange = (now: Date = new Date()) => {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const day = base.getDay()
    let delta = (6 - day + 7) % 7
    if (delta === 0) delta = 7
    const start = new Date(base)
    start.setDate(base.getDate() + delta)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    return [start, end] as const
  }
  const formatThaiRange = (start: Date, end: Date) => {
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const thaiNum = (val: number | string) => String(val).split('').map(ch => {
      const d = parseInt(ch as string, 10)
      return Number.isNaN(d) ? ch : '๐๑๒๓๔๕๖๗๘๙'[d]
    }).join('')
    const yBE = start.getFullYear() + 543
    const shortThaiYear = thaiNum(String(yBE).slice(-2))
    const d1 = thaiNum(start.getDate())
    const d2 = thaiNum(end.getDate())
    const m1 = monthNames[start.getMonth()]
    const m2 = monthNames[end.getMonth()]
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${d1}-${d2} ${m1} ${shortThaiYear}`
    }
    return `${d1} ${m1} - ${d2} ${m2} ${shortThaiYear}`
  }
  const [nextStart, nextEnd] = useMemo(() => nextWeekendRange(new Date()), [])
  const nextWeekendText = useMemo(() => formatThaiRange(nextStart, nextEnd), [nextStart, nextEnd])

  const importNames = async () => {
    if (!date) { setMessage('กรุณาเลือกวันที่'); return }
    try { cancelAllLinks() } catch { }
    setLoading(true)
    setMessage(null)
    try {
      const sheetName = displayDateLabel || date
      const res = await fetch('/api/import-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName })
      })
      const json = await res.json()
      setMatches(json.names || [])
      setAdditionalHeaders(json.additionalHeaders || [])
      setSelectedIndex(json.names && json.names.length > 0 ? 0 : null)
      setMessage(`พบ ${(json.names || []).length} รายการ`)
      setLinkStates({})
      setAbortMap({})
      setTimerMap({})
      setStagedTimerMap({})
      setProcessingAll(false)
      setCancelAll(false)
    } catch (e: any) {
      console.error(e)
      setMessage('เกิดข้อผิดพลาดในการดึงชื่อ')
    }
    setLoading(false)
  }

  const formatDateLabel = (iso: string) => {
    try {
      const d = new Date(iso)
      const d2 = new Date(d)
      d2.setDate(d.getDate() + 1)
      const day1 = d.getDate()
      const day2 = d2.getDate()
      const month = d.getMonth()
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
      const year = d.getFullYear() + 543
      const shortYear = String(year).slice(-2)
      const label = `${day1}-${day2} ${thaiMonths[month]}`
      const display = `${day1}-${day2} ${thaiMonths[month]} ${shortYear}`
      setDisplayDateLabel(label)
      setFolderLabel(display)
      return display
    } catch (e) {
      setDisplayDateLabel(iso)
      return iso
    }
  }

  const createLinkForIndex = async (idx: number) => {
    const person = matches[idx]
    if (!person || !date) return
    setLinkStates(s => ({ ...s, [idx]: { ...(s[idx] || {}), status: 'loading', percent: 5, message: 'กำลังค้นหาไฟล์บน Drive...', imageStatus: 'loading' } }))
    const controller = new AbortController()
    setAbortMap(m => ({ ...m, [idx]: controller }))

    const timer = window.setInterval(() => {
      setLinkStates(s => {
        const cur = s[idx] || { status: 'loading', percent: 5 }
        if (cur.status !== 'loading') return s
        const next = Math.min((cur.percent || 0) + 4, 90)
        return { ...s, [idx]: { ...cur, percent: next } }
      })
    }, 250)
    setTimerMap(t => ({ ...t, [idx]: timer as unknown as number }))

    const staged: number[] = []
    const stage = (ms: number, text: string) => {
      const h = window.setTimeout(() => {
        setLinkStates(s => {
          const cur = s[idx] || { status: 'loading', percent: 5 }
          if (cur.status !== 'loading') return s
          return { ...s, [idx]: { ...cur, message: text } }
        })
      }, ms)
      staged.push(h as unknown as number)
    }
    stage(1500, 'กำลังเข้าถึงโฟลเดอร์หลักบน Drive...')
    stage(4000, 'กำลังอ่านรายชื่อโฟลเดอร์ย่อย (ชั้น 1)...')
    stage(8000, 'กำลังค้นหาในโฟลเดอร์ย่อย (ชั้น 2)...')
    stage(12000, 'กำลังค้นหาเชิงลึก (ชั้น 3)...')
    setStagedTimerMap(m => ({ ...m, [idx]: staged }))

    try {
      const personFolderName = buildFolderName(person.first, person.last)
      const personName = personFolderName

      const wordPromise = fetch('/api/drive-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ personName, folderName: personFolderName, rootFolderId: rootDriveFolderId })
      }).then(r => r.json())

      const imgPromise = fetch('/api/image-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          first: (person.first || '').toString().replace(/^นนร\.?\s*/i, '').trim(),
          last: (person.last || '').toString().trim(),
          imageFolderId: imageDriveFolderId
        })
      }).then(r => r.json())

      const [docRes, imgRes] = await Promise.allSettled([wordPromise, imgPromise])
      clearInterval(timer)
      setTimerMap(t => { const { [idx]: _, ...rest } = t; return rest })
      const stagedTimers = stagedTimerMap[idx] || []
      stagedTimers.forEach(id => { try { clearTimeout(id) } catch { } })
      setStagedTimerMap(m => { const { [idx]: _, ...rest } = m; return rest })

      let nextState: LinkState = { ...(linkStates[idx] || {}), status: 'idle', imageStatus: 'idle' };

      if (docRes.status === 'fulfilled' && docRes.value) {
        const val = docRes.value;
        if (val.success && val.link) {
          nextState = { ...nextState, status: 'ok', url: val.link, filename: val.fileName, percent: 100, message: 'พร้อมดาวน์โหลด', folderId: undefined };
        } else {
          nextState = { ...nextState, status: 'error', percent: 100, message: val.error || 'ไม่พบไฟล์', folderId: val.folderId };
          if (val.alternativeFiles && val.alternativeFiles.length > 0) {
            setAlternativeFilesInfo({ type: 'word', files: val.alternativeFiles, originalIndex: idx });
          }
        }
      } else {
        nextState = { ...nextState, status: 'error', percent: 100, message: 'เกิดข้อผิดพลาด' };
      }

      if (imgRes.status === 'fulfilled' && imgRes.value) {
        const val = imgRes.value;
        if (val.success && val.link) {
          nextState = { ...nextState, imageStatus: 'ok', imageUrl: val.link, imageFilename: val.fileName, imageFolderId: undefined };
        } else {
          nextState = { ...nextState, imageStatus: 'error', imageFolderId: val.folderId };
          if (val.alternativeFiles && val.alternativeFiles.length > 0) {
            setAlternativeFilesInfo({ type: 'image', files: val.alternativeFiles, originalIndex: idx });
          }
        }
      } else {
        nextState = { ...nextState, imageStatus: 'error', imageFolderId: undefined };
      }

      setLinkStates(s => ({ ...s, [idx]: nextState }))
    } catch (e: any) {
      clearInterval(timer)
      setTimerMap(t => { const { [idx]: _, ...rest } = t; return rest })
      const stagedTimers = stagedTimerMap[idx] || []
      stagedTimers.forEach(id => { try { clearTimeout(id) } catch { } })
      setStagedTimerMap(m => { const { [idx]: _, ...rest } = m; return rest })
      const isAbort = e && (e.name === 'AbortError' || e.message === 'AbortError')
      setLinkStates(s => ({ ...s, [idx]: { ...(s[idx] || {}), status: 'error', imageStatus: 'error', percent: 100, message: isAbort ? 'ยกเลิกแล้ว' : 'เกิดข้อผิดพลาด' } }))
    } finally {
      setAbortMap(m => { const { [idx]: _, ...rest } = m; return rest })
    }
  }

  const createLinkFromId = async (fileId: string, fileName: string, type: 'word' | 'image', originalIndex: number) => {
    setAlternativeFilesInfo(null); // Close dialog
    const stateKey = type === 'word' ? 'status' : 'imageStatus';
    setLinkStates(s => ({ ...s, [originalIndex]: { ...(s[originalIndex] || {}), [stateKey]: 'loading', message: 'กำลังสร้างลิงก์...' } }));

    try {
      const res = await fetch(`/api/get-download-link?fileId=${fileId}`);
      const json = await res.json();
      if (json.success && json.link) {
        if (type === 'word') {
          setLinkStates(s => ({ ...s, [originalIndex]: { ...(s[originalIndex] || {}), status: 'ok', url: json.link, filename: json.fileName, message: 'พร้อมดาวน์โหลด' } }));
        } else {
          setLinkStates(s => ({ ...s, [originalIndex]: { ...(s[originalIndex] || {}), imageStatus: 'ok', imageUrl: json.link, imageFilename: json.fileName } }));
        }
      } else {
        throw new Error(json.error || 'ไม่สามารถสร้างลิงก์ได้');
      }
    } catch (e: any) {
      const message = e.message || 'เกิดข้อผิดพลาด';
      if (type === 'word') {
        setLinkStates(s => ({ ...s, [originalIndex]: { ...(s[originalIndex] || {}), status: 'error', message } }));
      } else {
        setLinkStates(s => ({ ...s, [originalIndex]: { ...(s[originalIndex] || {}), imageStatus: 'error' } }));
      }
    }
  };

  const createLinksForAll = async () => {
    if (!matches || matches.length === 0) return
    setProcessingAll(true)
    setCancelAll(false)
    for (let i = 0; i < matches.length; i++) {
      if (cancelAll) break
      await createLinkForIndex(i)
    }
    setProcessingAll(false)
  }

  const cancelLinkForIndex = (idx: number) => {
    const c = abortMap[idx]
    if (c) try { c.abort() } catch { }
    const tm = timerMap[idx]
    if (tm) try { clearInterval(tm) } catch { }
    const stagedTimers = stagedTimerMap[idx] || []
    stagedTimers.forEach(id => { try { clearTimeout(id) } catch { } })
    setStagedTimerMap(m => { const { [idx]: _, ...rest } = m; return rest })
  }

  const cancelAllLinks = () => {
    setCancelAll(true)
    Object.values(abortMap).forEach(c => { try { c.abort() } catch { } })
    Object.values(timerMap).forEach(tm => { try { clearInterval(tm) } catch { } })
    Object.values(stagedTimerMap).forEach(list => list.forEach(id => { try { clearTimeout(id) } catch { } }))
    setAbortMap({})
    setTimerMap({})
    setStagedTimerMap({})
  }

  const downloadDocx = async () => {
    if (!date) { setMessage('เลือกวันที่ก่อน'); return }
    if (selectedIndex === null || !matches[selectedIndex]) { setMessage('ยังไม่มีชื่อที่เลือก'); return }
    setLoading(true)
    setMessage(null)
    let timer: any = null
    setShowProgress(true)
    setProgress(5)
    setProgressText('กำลังค้นหาไฟล์บน Drive...')
    timer = window.setInterval(() => setProgress(p => Math.min(p + 3, 90)), 250)
    window.setTimeout(() => setProgressText('กำลังเข้าถึงโฟลเดอร์หลักบน Drive...'), 1500)
    window.setTimeout(() => setProgressText('กำลังอ่านโฟลเดอร์ย่อย (ชั้น 1)...'), 4000)
    window.setTimeout(() => setProgressText('กำลังค้นหาในโฟลเดอร์ย่อย (ชั้น 2)...'), 8000)
    window.setTimeout(() => setProgressText('กำลังค้นหาเชิงลึก (ชั้น 3)...'), 12000)
    const controller = new AbortController()
    setSingleAbort(controller)
    try {
      const chosen = matches[selectedIndex]
      const folderName = buildFolderName(chosen?.first, chosen?.last)
      const personName = folderName

      const res = await fetch('/api/drive-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ personName, folderName, rootFolderId: rootDriveFolderId })
      })
      const json = await res.json()
      if (json.success && json.link) {
        if (timer) clearInterval(timer)
        setProgress(100)
        setProgressText('ลิงก์พร้อมดาวน์โหลด')
        setMessage('ลิงก์ดาวน์โหลด: ' + json.link)
        setTimeout(() => setShowProgress(false), 1200)
      } else {
        if (json.alternativeFiles && json.alternativeFiles.length > 0) {
          setAlternativeFilesInfo({ type: 'word', files: json.alternativeFiles, originalIndex: selectedIndex });
        }
        const msg = typeof json.error === 'string' && json.error.trim().length > 0 ? json.error : 'ไม่พบไฟล์'
        setMessage(msg)
        if (timer) clearInterval(timer)
        setProgressText('ไม่พบไฟล์ที่ต้องการ')
        setTimeout(() => setShowProgress(false), 1200)
      }
    } catch (e: any) {
      console.error(e)
      if (timer) clearInterval(timer)
      const isAbort = e && (e.name === 'AbortError' || e.message === 'AbortError')
      setProgressText(isAbort ? 'ยกเลิกแล้ว' : 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์')
      setShowProgress(false)
      setMessage(isAbort ? 'ยกเลิกแล้ว' : 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์')
    }
    setLoading(false)
  }

  const AlternativeFileDialog = () => {
    if (!alternativeFilesInfo) return null;
    const { type, files, originalIndex } = alternativeFilesInfo;
    const person = matches[originalIndex];
    const personName = buildPersonName(person.first, person.last);

    return (
      <Dialog open={!!alternativeFilesInfo} onOpenChange={() => setAlternativeFilesInfo(null)}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>ไม่พบไฟล์ที่ตรงกันสำหรับ "{personName}"</DialogTitle>
            <DialogDescription>
              แต่พบไฟล์{type === 'word' ? 'เอกสาร' : 'รูปภาพ'}อื่นในโฟลเดอร์ คุณต้องการใช้ไฟล์ใดไฟล์หนึ่งต่อไปนี้แทนหรือไม่?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto my-4 pr-4">
            <ul className="space-y-2">
              {files.map(file => (
                <li key={file.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                  <span className="truncate text-sm">{file.name}</span>
                  <Button size="sm" onClick={() => createLinkFromId(file.id, file.name, type, originalIndex)} className="bg-blue-600 hover:bg-blue-700">
                    <Download className="h-4 w-4 mr-2" />
                    ใช้ไฟล์นี้
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAlternativeFilesInfo(null)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <AlternativeFileDialog />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="ghost" className="text-white/90 bg-slate-800/40 border border-slate-700">ย้อนกลับ</Button>
            <h2 className="text-xl font-bold">สร้างไฟล์จาก Drive ตามชื่อ</h2>
          </div>
          <div className="hidden sm:block text-right text-sm text-slate-300">
            เข้าเวรครั้งถัดไปวันที่ {nextWeekendText}
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <Label>เลือกวันที่</Label>
              <input type="date" value={date} onChange={e => { setDate(e.target.value); const disp = formatDateLabel(e.target.value); setMessage(`วันที่เลือก: ${disp}`) }} className="w-full bg-slate-700 text-white px-3 py-2 rounded" />
            </div>
            <div className="col-span-1 sm:col-span-2 flex items-end gap-3">
              <Button onClick={importNames} disabled={loading} className="bg-blue-600 text-white">Import จาก Google Sheet</Button>
              <div className="text-sm text-slate-300">ชีทที่จะใช้: <span className="font-medium text-black bg-yellow-300 px-2 py-0.5 rounded ml-2">{displayDateLabel || '-'}</span></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>รายการในชีท (เลือกชื่อ)</Label>
            </div>
            <div className="bg-slate-900/40 rounded border border-slate-700 overflow-auto max-h-[60vh]">
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
                      {additionalHeaders.map(header => (
                        <th key={header} className="p-3 text-left">{header}</th>
                      ))}
                      <th className="p-3 text-left">ไฟล์ ฉก.</th>
                      <th className="p-3 text-left">รูปภาพ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => {
                      const st = linkStates[i] || { status: 'idle', percent: 0 }
                      const displayFirst = (() => {
                        const first = (m.first || '').toString().trim()
                        if (first && first !== 'นนร.' && !/^นนร\.?\s*$/i.test(first)) return first
                        const full = (m.full || '').toString().trim()
                        if (full) {
                          const noRank = full.replace(/^นนร\.?\s*/i, '')
                          const parts = noRank.split(/\s+/).filter(Boolean)
                          if (parts.length > 0) return parts[0]
                        }
                        return first
                      })()
                      return (
                        <tr key={i} className={`cursor-pointer ${selectedIndex === i ? 'bg-blue-600 text-white' : 'hover:bg-slate-800/60'}`} onClick={() => setSelectedIndex(i)}>
                          <td className="p-3">{displayFirst}</td>
                          <td className="p-3">{m.last || ''}</td>
                          <td className="p-3">{m.position || '-'}</td>
                          <td className="p-3">{m.partner || '-'}</td>
                          <td className="p-3">{m.shift || '-'}</td>
                          <td className="p-3">{m.note || '-'}</td>
                          {additionalHeaders.map(header => (
                            <td key={header} className="p-3">{m.additionalData?.[header] || '-'}</td>
                          ))}
                          <td className="p-3" onClick={e => e.stopPropagation()}>
                            {st.status === 'ok' && st.url ? (
                              <a href={st.url} target="_blank" download={st.filename || undefined} className="text-emerald-400 underline">ไฟล์ ฉก.</a>
                            ) : st.status === 'error' && st.folderId ? (
                              <a href={`https://drive.google.com/drive/folders/${st.folderId}`} target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">ตรวจสอบ Drive</a>
                            ) : (
                              <div className="inline-flex flex-nowrap gap-2 items-center min-h-0 h-8">
                                <Button size="sm" onClick={() => createLinkForIndex(i)} disabled={st.status === 'loading'} className="bg-emerald-600 whitespace-nowrap">{st.status === 'loading' ? 'กำลังสร้าง...' : 'สร้างลิงก์'}</Button>
                                {st.status === 'loading' && (
                                  <Button size="sm" variant="ghost" onClick={() => cancelLinkForIndex(i)} className="text-red-400">ยกเลิก</Button>
                                )}
                                {(st.status === 'loading' || st.status === 'error') && !st.folderId && (
                                  <div className="inline-flex flex-col items-center justify-center min-w-[60px] max-w-[120px] h-8">
                                    <div className="h-1 w-full bg-slate-700 rounded overflow-hidden">
                                      <div className={`h-1 ${st.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${st.percent || 0}%` }} />
                                    </div>
                                    <div className="text-[10px] text-slate-300 leading-none mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full" style={{ maxWidth: '112px' }}>{st.message || (st.status === 'loading' ? 'ค้นหา...' : '')}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3" onClick={e => e.stopPropagation()}>
                            {st.imageStatus === 'ok' && st.imageUrl ? (
                              <a href={st.imageUrl} target="_blank" download={st.imageFilename || undefined} className="text-emerald-400 underline">รูปภาพ</a>
                            ) : st.imageStatus === 'error' ? (
                              <a href={`https://drive.google.com/drive/folders/${st.imageFolderId || '17h7HzW7YQqXeVH7-A-EhkJKQOmGNUC5s'}`} target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">หารูป</a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={downloadDocx} disabled={loading || selectedIndex === null} className="bg-green-600 text-white">ดาวน์โหลด (เฉพาะแถวที่เลือก)</Button>
            <Button onClick={createLinksForAll} disabled={loading || matches.length === 0 || processingAll} className="bg-indigo-600 text-white">{processingAll ? 'กำลังสร้างลิงก์ทั้งหมด...' : 'สร้างลิงก์ทั้งหมด'}</Button>
            {processingAll && (
              <Button onClick={cancelAllLinks} variant="ghost" className="text-red-400">ยกเลิกทั้งหมด</Button>
            )}
          </div>

          {showProgress && (
            <div className="mt-2 w-full">
              <div className="h-2 bg-slate-700 rounded overflow-hidden">
                <div className="h-2 bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-slate-300">{progressText} {progress}%</div>
                <div>
                  <Button size="sm" variant="ghost" onClick={() => { if (singleAbort) { try { singleAbort.abort() } catch { } } setShowProgress(false) }} className="text-red-400">ยกเลิก</Button>
                </div>
              </div>
            </div>
          )}

          {message && <div className="text-sm text-slate-300">{message}</div>}
        </div>

        {folderLabel && (
          <div className="fixed bottom-4 right-4 bg-slate-800/80 border border-slate-700 rounded px-3 py-2 shadow-lg text-xs text-slate-300">
            <div className="mb-1">โฟลเดอร์ปลายทางแนะนำ:</div>
            <div className="flex flex-col items-end gap-1">
              <a
                href={'file:///' + encodeURI(`D:/Desktop/ฝ1/433 ชั้น 4/${folderLabel}/ประวัติ 2 แผ่น/ผู้ปฏิบัติหน้าที่`)}
                target="_blank"
                className="text-emerald-300 underline"
                title="คลิกเพื่อเปิดโฟลเดอร์ (อาจถูกบล็อคโดยเบราว์เซอร์)"
              >
                D:\\Desktop\\ฝ1\\433 ชั้น 4\\{folderLabel}\\ประวัติ 2 แผ่น\\ผู้ปฏิบัติหน้าที่
              </a>
              <button
                className="text-[11px] text-slate-400 hover:text-white"
                onClick={async () => {
                  const path = `D:\\Desktop\\ฝ1\\433 ชั้น 4\\${folderLabel}\\ประวัติ 2 แผ่น\\ผู้ปฏิบัติหน้าที่`
                  try { await navigator.clipboard.writeText(path); setCopiedPath(true); setTimeout(() => setCopiedPath(false), 1500) } catch { }
                }}
                title="คลิกเพื่อคัดลอกเส้นทาง"
              >
                คัดลอกพาธ
              </button>
              {copiedPath && <div className="text-[10px] text-emerald-400">คัดลอกแล้ว</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
