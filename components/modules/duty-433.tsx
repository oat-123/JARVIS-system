"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PieChart, List, Users, X, FileText, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { ProfileDetail } from "@/components/profile-detail"
import { useToast } from "@/components/ui/use-toast"

interface PersonData {
  [key: string]: any
  ลำดับ?: string
  ยศ?: string
  ชื่อ?: string
  สกุล?: string
  ชั้นปีที่?: string
  ตอน?: string
  ตำแหน่ง?: string
  สังกัด?: string
  เบอร์โทรศัพท์?: string
  หน้าที่?: string
  ชมรม?: string
  สถิติโดนยอด?: string

  "ธุรการ ฝอ."?: string
  "ธุรการ"?: string
  "คัดเกรด"?: string
}

interface Duty433Props {
  onBack: () => void;
  onActivateModule?: (module: string) => void;
  user: {
    displayName: string;
    role: string;
    group: string;
    sheetname: string;
  } | null;
}

// Small, dependency-free pie chart using SVG
function Pie({ data, onSliceClick, selectedLabel }: { data: { label: string; value: number; color: string }[]; onSliceClick?: (label: string) => void; selectedLabel?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  let acc = 0
  return (
    <svg viewBox="0 0 32 32" className="w-36 h-36" role="img" aria-label="pie chart">
      {data.map((d, i) => {
        const value = d.value
        const start = (acc / total) * Math.PI * 2
        acc += value
        const end = (acc / total) * Math.PI * 2
        const x1 = 16 + 16 * Math.cos(start)
        const y1 = 16 + 16 * Math.sin(start)
        const x2 = 16 + 16 * Math.cos(end)
        const y2 = 16 + 16 * Math.sin(end)
        const large = value / total > 0.5 ? 1 : 0
        const path = `M16 16 L ${x1} ${y1} A 16 16 0 ${large} 1 ${x2} ${y2} Z`
        const isSelected = selectedLabel && selectedLabel === d.label
        const mid = (start + end) / 2
        const explode = isSelected ? 1.5 : 0
        const dx = explode * Math.cos(mid)
        const dy = explode * Math.sin(mid)
        return (
          <path
            key={i}
            d={path}
            fill={d.color}
            stroke="#0f172a"
            strokeWidth={isSelected ? 0.6 : 0.2}
            transform={`translate(${dx}, ${dy})`}
            style={{ cursor: onSliceClick ? 'pointer' : 'default', filter: isSelected ? 'drop-shadow(0 0 2px rgba(255,255,255,0.6))' : undefined }}
            onClick={() => onSliceClick && onSliceClick(d.label)}
          >
            <title>{`${d.label}: ${d.value}`}</title>
          </path>
        )
      })}
      <circle cx="16" cy="16" r="6" fill="#0b1220" />
    </svg>
  )
}

export function Duty433({ onBack, onActivateModule, user }: Duty433Props) {
  const { toast } = useToast()
  const [people, setPeople] = useState<PersonData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterDuties, setFilterDuties] = useState<string[]>([])
  const [filterGrades, setFilterGrades] = useState<string[]>([])
  const [filterDuty, setFilterDuty] = useState<string | "">("")
  const [filterGrade, setFilterGrade] = useState<string | "">("") // เพิ่ม state สำหรับ filter คัดเกรด
  const [filterAffiliations, setFilterAffiliations] = useState<string[]>([]) // เพิ่ม state สำหรับกรองสังกัดหลายค่า
  const [minCount, setMinCount] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [debouncedQuery, setDebouncedQuery] = useState<string>("")


  // debounce the search input for a smoother typing/search experience
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 150)
    return () => clearTimeout(t)
  }, [searchQuery])
  // debounced value to make search feel smooth and avoid filtering on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchQuery)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 150)
    return () => clearTimeout(t)
  }, [searchQuery])
  const [selectedGid, setSelectedGid] = useState<string>('0')
  const [view, setView] = useState<"dashboard" | "list" | "detail" | "calendar-popup">("dashboard")
  const [listSheet, setListSheet] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonData | null>(null)
  const [prevView, setPrevView] = useState<"dashboard" | "list" | null>(null)
  const [showAffPanel, setShowAffPanel] = useState<boolean>(false)
  const [showDutyPanel, setShowDutyPanel] = useState<boolean>(false)
  const [showGradePanel, setShowGradePanel] = useState<boolean>(false)

  // Enforce visibility: only allow admin/oat roles to use this module
  if (user?.role?.toLowerCase() !== 'admin' && user?.role?.toLowerCase() !== 'oat') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-slate-400 mb-6">ฟีเจอร์นี้สำหรับผู้ดูแลระบบเท่านั้น</p>
          <Button onClick={onBack} className="bg-blue-600">กลับไปหน้าหลัก</Button>
        </div>
      </div>
    )
  }

  useEffect(() => {
    // Only fetch when in dashboard view
    if (view !== "dashboard") return
    setIsLoading(true)
      ; (async () => {
        try {
          // cache key
          const cacheKey = 'duty433_cache_v1'
          const ttl = 1000 * 60 * 5 // 5 minutes
          const cachedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null
          if (cachedRaw) {
            try {
              const parsed = JSON.parse(cachedRaw)
              if (parsed && parsed.ts && (Date.now() - parsed.ts) < ttl && parsed.aggData) {
                // use cache
                setAggData(parsed.aggData)
                setPeople(normalizePeopleArray(parsed.aggData.people || []))
                setIsLoading(false)
                return
              }
            } catch (e) {
              // fallthrough to fetch
            }
          }

          const res = await fetch(`/api/sheets/433`)
          const text = await res.text();
          console.log("Raw response text:", text);
          const json = JSON.parse(text);
          if (json.success && json.data) {
            const normalizedPeople = normalizePeopleArray(json.data.people || [])
            const toStore = { ...json.data, people: normalizedPeople }
            setPeople(normalizedPeople)
            setAggData(toStore)

            // แสดง log ข้อมูลที่ได้รับจาก API
            console.log('📊 Duty 433 - ข้อมูลที่ได้รับจาก API:', {
              timestamp: new Date().toISOString(),
              metadata: json.data.metadata,
              totals: json.data.totals,
              peopleCount: normalizedPeople.length,
              samplePerson: normalizedPeople[0] || null,
              detectedColumns: {
                '433_columns': json.data.metadata?.detected_433_columns || [],
                'admin_columns': json.data.metadata?.detected_admin_columns || [],
                'total_433': json.data.metadata?.total_433_columns || 0,
                'total_admin': json.data.metadata?.total_admin_columns || 0,
              }
            })

            try {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), aggData: toStore }))
              }
            } catch (e) {
              // ignore storage errors
            }
          } else {
            setPeople([])
            console.error('❌ Failed to fetch data from API:', json)
          }
        } catch (e) {
          console.error('❌ Error caught in fetch block:', e);
          setPeople([])
        } finally {
          setIsLoading(false)
        }
      })()
  }, [user, view])

  // Aggregated data from API
  const [aggData, setAggData] = useState<any>(null)
  const [topMetric, setTopMetric] = useState<string>('report')
  const [topCardMetric, setTopCardMetric] = useState<string>('report')
  const [showPieDetail, setShowPieDetail] = useState<boolean>(false)
  const [pieDetailLabel, setPieDetailLabel] = useState<string>('')
  const [selectedPie, setSelectedPie] = useState<string | null>(null)
  const [selectedOverviewItem, setSelectedOverviewItem] = useState<string | null>(null)
  const router = useRouter()

  // Calendar state (bottom section)
  const [calDate, setCalDate] = useState<Date | undefined>(new Date())
  const [calMonth, setCalMonth] = useState<Date>(new Date())
  // Enhanced calendar popup state
  const [showCalendarPopup, setShowCalendarPopup] = useState<boolean>(false)
  const [selectedCalendarData, setSelectedCalendarData] = useState<any | null>(null)
  const [monthWeekendMap, setMonthWeekendMap] = useState<Record<string, any[]>>({})
  const [isMonthMapLoading, setIsMonthMapLoading] = useState<boolean>(false)

  // Week helpers for calendar selection
  const startOfWeek = (d: Date) => {
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const day = out.getDay() // 0=Sun .. 6=Sat
    out.setDate(out.getDate() - day)
    out.setHours(0, 0, 0, 0)
    return out
  }
  const endOfWeek = (d: Date) => {
    const s = startOfWeek(d)
    const e = new Date(s)
    e.setDate(e.getDate() + 6)
    e.setHours(23, 59, 59, 999)
    return e
  }
  const isInSelectedWeek = (dateText: string | undefined) => {
    if (!dateText || !calDate) return false
    try {
      const iso = parseDateFromText(String(dateText))
      if (!iso) return false
      const d = new Date(iso)
      const s = startOfWeek(calDate)
      const e = endOfWeek(calDate)
      return d.getTime() >= s.getTime() && d.getTime() <= e.getTime()
    } catch { return false }
  }

  // Next weekend helper (Sat-Sun strictly after today)
  function nextWeekendRange(now: Date = new Date()) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const day = base.getDay() // 0=Sun..6=Sat
    let delta = (6 - day + 7) % 7
    if (delta === 0) delta = 7
    const start = new Date(base)
    start.setDate(base.getDate() + delta)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    return [start, end] as const
  }

  // Compute weekly duty list from normalized enter433 entries
  const weeklyDutyList = useMemo(() => {
    if (!Array.isArray(people) || !calDate) return [] as any[]
    const list = people.filter(p => Array.isArray((p as any).enter433) && (p as any).enter433.some((en: any) => isInSelectedWeek(en.date)))
    // sort by position/name for stable UI
    return list.sort((a: any, b: any) => String(getPositionFrom(a) || '').localeCompare(String(getPositionFrom(b) || '')) || String(a.ชื่อ || '').localeCompare(String(b.ชื่อ || '')))
  }, [people, calDate])

  // Weekly list from external spreadsheet tabs named by weekend text
  const [weeklyExternal, setWeeklyExternal] = useState<any[] | null>(null)
  useEffect(() => {
    if (!calDate) { setWeeklyExternal(null); return }
    // Build sheet name like "14-15 ก.ย. 68" based on the weekend that includes the selected date
    const day = calDate.getDay() // 0=Sun..6=Sat
    const sat = new Date(calDate)
    // If Sunday, go back 1 day; otherwise move forward to Saturday in the same week
    sat.setDate(calDate.getDate() + (day === 0 ? -1 : (6 - day)))
    const sun = new Date(sat)
    sun.setDate(sat.getDate() + 1)
    // If selected day is Sat/Sun, ensure the span covers that weekend
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const thaiNum = (val: number | string) => String(val).split('').map(ch => {
      const d = parseInt(ch as string, 10)
      return Number.isNaN(d) ? ch : '๐๑๒๓๔๕๖๗๘๙'[d]
    }).join('')
    const yearBE = (d: Date) => d.getFullYear() + 543
    const sheetLabel = `${sat.getDate()}-${sun.getDate()} ${monthNames[sat.getMonth()]} ${String(yearBE(sat)).slice(-2)}`
      ; (async () => {
        try {
          const res = await fetch(`/api/sheets/weekly-433?sheetName=${encodeURIComponent(sheetLabel)}`)
          const json = await res.json()
          if (json && json.success) setWeeklyExternal(json.people || [])
          else setWeeklyExternal([])
        } catch {
          setWeeklyExternal([])
        }
      })()
  }, [calDate])

  // Build a map of date (YYYY-MM-DD) -> people[] from Weekly Sheet tabs for the visible month
  useEffect(() => {
    const buildMonthWeekendMap = async () => {
      try {
        setIsMonthMapLoading(true)
        const year = calMonth.getFullYear()
        const month = calMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const startDate = new Date(firstDay)
        startDate.setDate(startDate.getDate() - firstDay.getDay())
        const weekends: { sat: Date; sun: Date; label: string }[] = []
        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
        const yearBE = (d: Date) => d.getFullYear() + 543
        for (let i = 0; i < 42; i++) {
          const d = new Date(startDate)
          d.setDate(startDate.getDate() + i)
          if (d.getDay() === 6) { // Saturday
            const sat = new Date(d)
            const sun = new Date(d)
            sun.setDate(sat.getDate() + 1)
            const label = `${sat.getDate()}-${sun.getDate()} ${monthNames[sat.getMonth()]} ${String(yearBE(sat)).slice(-2)}`
            weekends.push({ sat, sun, label })
          }
        }
        // dedupe by label
        const uniq = Array.from(new Map(weekends.map(w => [w.label, w])).values())
        const results = await Promise.all(uniq.map(async (w) => {
          try {
            const res = await fetch(`/api/sheets/weekly-433?sheetName=${encodeURIComponent(w.label)}`)
            const json = await res.json()
            if (json && json.success && Array.isArray(json.people)) {
              return { key: w, people: json.people }
            }
          } catch { }
          return { key: w, people: [] as any[] }
        }))
        const map: Record<string, any[]> = {}
        results.forEach(r => {
          const satKey = r.key.sat.toISOString().slice(0, 10)
          const sunKey = r.key.sun.toISOString().slice(0, 10)
          map[satKey] = r.people || []
          map[sunKey] = r.people || []
        })
        setMonthWeekendMap(map)
      } finally {
        setIsMonthMapLoading(false)
      }
    }
    buildMonthWeekendMap()
  }, [calMonth])

  // Format Thai weekend range like "30-31 ส.ค. ๖๘" or "31 ส.ค. - 1 ก.ย. ๖๘"
  function formatThaiRange(start: Date, end: Date) {
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const thaiNum = (val: number | string) => String(val).split('').map(ch => {
      const d = parseInt(ch, 10)
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

  // helper: read position from common column names (prefer 'ตำแหน่ง')
  const getPositionFrom = (obj: any) => {
    if (!obj) return ''
    const tryKeys = ['ตำแหน่ง', 'ตำแหน่ง ทกท', 'ตำแหน่งทกท', 'ตำแหน่ง', 'position', 'pos', 'ทกท.']
    for (const k of tryKeys) {
      if (obj[k]) return obj[k]
    }
    // some aggregated entries may store position in `position` or `title` fields
    if (obj.position) return obj.position
    if (obj.title) return obj.title
    return ''
  }

  // Simplified normalization function
  const normalizePerson = (row: any) => {
    if (!row || typeof row !== 'object') return row;
    const pick = (keys: string[]) => {
      for (const k of keys) if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
      return undefined;
    };
    const normalized: any = { ...row };
    normalized.ลำดับ = pick(['ลำดับ', 'No', 'no', 'index']) || row.ลำดับ || '';
    normalized.ยศ = pick(['ยศ', 'rank']) || row.ยศ || '';
    normalized.ชื่อ = pick(['ชื่อ', 'firstName', 'firstname', 'name']) || row.ชื่อ || '';
    normalized.สกุล = pick(['สกุล', 'lastName', 'lastname', 'surname']) || row.สกุล || '';
    normalized.ตำแหน่ง = pick(['ตำแหน่ง', 'ตำแหน่ง', 'position', 'pos']) || row.ตำแหน่ง || '';
    normalized.สังกัด = pick(['สังกัด', 'affiliation']) || row.สังกัด || '';
    normalized.หน้าที่ = pick(['หน้าที่', 'role']) || row.หน้าที่ || '';
    normalized.นักกีฬา = pick(['นักกีฬา', 'กีฬา', 'เป็นนักกีฬา', 'sport', 'sports', 'เล่นกีฬา', 'athlete', 'athletics']) || row.นักกีฬา || row.กีฬา || '';
    normalized.คัดเกรด = pick(['คัดเกรด', 'grade', 'grading']) || row.คัดเกรด || row['คัดเกรด'] || '';
    normalized.ตัวชน = pick(['ตัวชน', 'ตัว ชน']) || row.ตัวชน || '';
    normalized.ส่วนสูง = pick(['ส่วนสูง', 'สูง', 'ส่วนสูง(ซม.)', 'สูง(ซม.)', 'ส่วนสูง ซม.', 'height', 'สูง cm', 'ส่วนสูง cm', 'ส่วนสูง (ซม.)', 'สูง cm.']) || row.ส่วนสูง || row['ส่วนสูง(ซม.)'] || row['สูง(ซม.)'] || '';
    normalized.เบอร์โทรศัพท์ = pick(['เบอร์โทรศัพท์', 'phone', 'โทร']) || row.เบอร์โทรศัพท์ || '';
    normalized['ธุรการ ฝอ.'] = pick(['ธุรการ ฝอ.', 'ธุรการ', 'admin']) || row['ธุรการ ฝอ.'] || row['ธุรการ'] || '';

    // Count dynamic 433 columns: flexible header detection (e.g., "เข้า 433 ครั้งที่ 1", "433ครั้งที่1")
    const keys = Object.keys(row || {})
    let count433 = 0
    for (const k of keys) {
      if (is433Header(k)) {
        const val = row[k]
        if (isPresent433Value(val)) count433++
      }
    }
    // fallback: if API provided _433_dates, count non-empty entries as well
    if (count433 === 0 && Array.isArray(row._433_dates)) {
      count433 = row._433_dates.filter((v: any) => isPresent433Value(v)).length
    }
    // extra fallback: use enter433/_433_dates if header-based count is zero
    if (count433 === 0) {
      if (Array.isArray(row.enter433)) count433 = row.enter433.length
      else if (Array.isArray(row._433_dates)) count433 = row._433_dates.filter((v: any) => isPresent433Value(v)).length
    }
    normalized._enter433Count = count433

    // The backend now provides clean _433_dates and _admin_dates arrays.
    // We will use these as the single source of truth.
    const enter433: any[] = [];
    if (Array.isArray(row._433_dates)) {
      row._433_dates.forEach((d: any, idx: number) => {
        if (d == null) return;
        const ds0 = (typeof d === 'string' ? d.trim() : String(d));
        const ds = cleanParenTimestamp(ds0);
        if (ds) enter433.push({ idx: idx + 1, date: ds, note: '' });
      });
    }

    const enterChp: any[] = [];
    if (Array.isArray(row._admin_dates)) {
      row._admin_dates.forEach((d: any, idx: number) => {
        if (d == null) return;
        const ds0 = (typeof d === 'string' ? d.trim() : String(d));
        const ds = cleanParenTimestamp(ds0);
        if (ds) enterChp.push({ idx: idx + 1, date: ds, note: '' });
      });
    }

    // Use reportHistory from API if available (it includes columnHeader info)
    // Otherwise, rebuild from 'ถวายรายงานครั้งที่ n' fields as fallback
    let reportHistory: any[] = [];
    if (Array.isArray(row.reportHistory) && row.reportHistory.length > 0) {
      reportHistory = row.reportHistory;
    } else {
      // Fallback: build from column keys if API didn't provide reportHistory
      const reportRegex = /^\s*ถวาย\s*รายงาน\s*ครั้งที่\s*([\d๐-๙]+)\s*$/i;
      Object.keys(row).forEach((colName: string) => {
        const match = colName.match(reportRegex);
        if (!match) return;

        const cellValue = row[colName];
        if (!cellValue) return;

        const cellStr = String(cellValue).trim();
        if (!cellStr) return;

        const parts = cellStr.split(' เมื่อ ');
        if (parts.length !== 2) {
          reportHistory.push({
            columnHeader: colName,
            code: '',
            position: '',
            fullName: cellStr,
            date: '',
            _raw: cellStr
          });
          return;
        }

        const namePart = parts[0].trim();
        const datePart = cleanParenTimestamp(parts[1].trim());
        const nameTokens = namePart.split(/\s+/);
        let code = '';
        let position = '';
        let fullName = '';

        if (nameTokens.length >= 3) {
          code = nameTokens[0];
          position = nameTokens[1];
          fullName = nameTokens.slice(2).join(' ');
        } else if (nameTokens.length === 2) {
          code = nameTokens[0];
          fullName = nameTokens[1];
        } else if (nameTokens.length === 1) {
          fullName = nameTokens[0];
        }

        reportHistory.push({
          columnHeader: colName,
          code,
          position,
          fullName,
          date: datePart,
          _raw: cellStr
        });
      });
    }

    // Use reportInfo from API if available, otherwise build an empty object
    const reportInfo = (row && typeof row === 'object' && row.reportInfo && typeof row.reportInfo === 'object') ? row.reportInfo : {};

    normalized.reportHistory = reportHistory;
    normalized.reportInfo = reportInfo;
    normalized.enter433 = enter433;
    normalized.enterChp = enterChp;

    return normalized;
  }

  const normalizePeopleArray = (arr: any[]) => Array.isArray(arr) ? arr.map((x: any) => postProcessPerson(normalizePerson(x))) : []

  // --- Name formatting helpers to avoid duplicated prefixes like "นนร." and extra spaces ---
  const normalizeSpaces = (s: string) => (s || '').replace(/\s+/g, ' ').trim()
  const stripDuplicateNnr = (s: string) => {
    if (!s) return ''
    let out = s
      .replace(/(นนร\.?\s*){2,}/gi, 'นนร. ') // collapse repeated นนร.
    out = out.replace(/^นนร\.?\s*นนร\.?/i, 'นนร. ')
    return normalizeSpaces(out)
  }
  const formatDisplayName = (rank?: string, first?: string, last?: string) => {
    const raw = `${rank || ''} ${first || ''} ${last || ''}`
    return stripDuplicateNnr(normalizeSpaces(raw))
  }

  // Strip only parenthesized ISO-like timestamp suffix e.g. "(T17:00:00.000Z)" => removed
  const cleanParenTimestamp = (s: any) => {
    if (typeof s !== 'string') return s
    return s.replace(/\s*\(T[0-9:.+\-]*Z\)\s*$/i, '').trim()
  }

  // Header normalization for flexible 433 detection
  const normHeader = (s: string) => {
    const toArabic = (txt: string) => txt.replace(/[๐-๙]/g, ch => '0123456789'["๐๑๒๓๔๕๖๗๘๙".indexOf(ch)])
    return toArabic(String(s || ''))
      .toLowerCase()
      .replace(/[()\[\]_,.:;\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const is433Header = (name: string) => {
    const h = normHeader(name)
    if (!/\b433\b/.test(h)) return false
    // Flexible acceptance:
    // 1) with ครั้ง/ครั้งที่ + number
    // 2) or any trailing/separated number token after 433 (e.g., "433 1", "433 ครั้ง 1", "433#1")
    if (/ครั้��\s*ที่\s*\d+/.test(h) || /ครั้ง\s*\d+/.test(h)) return true
    // accept patterns like "433 1", "433-1", "433 ครั้ง1", etc.
    return /433\s*[#\-\._ ]?\s*\d+/.test(h)
  }
  const isPresent433Value = (val: any) => {
    const s = String(val ?? '').trim()
    if (!s) return false
    const lowered = s.toLowerCase()
    // treat common placeholders as empty
    if (lowered === '-' || lowered === '—' || lowered === '–' || lowered === '0' || lowered === 'na' || lowered === 'n/a' || lowered === 'ไม่มี') return false
    if (/^[-—–]+$/.test(s)) return false
    return true
  }

  // helper: format Thai short date using Thai numerals and short month names (e.g., ๒๓ ส.ค. ๖๘)
  const toThaiShortDate = (input: string) => {
    if (!input) return ''
    try {
      const d = new Date(input)
      if (isNaN(d.getTime())) return input
      const day = d.getDate()
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
      const year = d.getFullYear() + 543
      const shortYear = String(year).slice(-2)
      const thaiNum = (n: number) => String(n).split('').map(ch => '๐๑๒๓๔๕๖๗๘๙'[parseInt(ch)]).join('')
      return `${thaiNum(day)} ${monthNames[d.getMonth()]} ${thaiNum(parseInt(shortYear))}`
    } catch (e) { return input }
  }

  // Lightweight, forgiving date parser that returns an ISO date string (YYYY-MM-DD)
  // Accepts ISO, dd/mm/yyyy, dd-mm-yy, yyyy-mm-dd and Thai BE years (>=2500)
  const parseDateFromText = (raw: string) => {
    if (!raw || typeof raw !== 'string') return ''
    // Clean any trailing timestamp-like strings in parentheses (e.g., "(T17:00:00.000Z)")
    const s = raw.trim().replace(/\s*\([^)]*\)$/, '');
    // Normalize Thai digits and prepare month mapping
    const toArabic = (txt: string) => txt.replace(/[๐-๙]/g, ch => '0123456789'["๐๑๒๓๔๕๖๗๘๙".indexOf(ch)])
    const thMonths: Record<string, number> = { 'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6, 'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12 }
    const sNorm = toArabic(s)
    // quick ISO parse
    const tryDate = (v: string) => {
      const d = new Date(v)
      if (!isNaN(d.getTime())) return d.toISOString()
      return ''
    }
    let iso = tryDate(sNorm)
    if (iso) return iso

    // Try Thai-style short month format e.g., "23 ส.ค. 68" (after digit normalization)
    const m = sNorm.match(/(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(\d{2,4})/)
    if (m) {
      const day = parseInt(m[1], 10)
      const mm = thMonths[m[2]]
      let year = parseInt(m[3], 10)
      if (year < 100) {
        const yy = year
        const current = new Date().getFullYear()
        const beToAd = 1957 + yy
        const ad2000 = 2000 + yy
        year = (beToAd >= 1970 && beToAd <= current + 1) ? beToAd : ad2000
      }
      if (year > 2500) year = year - 543
      const d = new Date(year, mm - 1, day)
      if (!isNaN(d.getTime())) return d.toISOString()
    }

    // common numeric patterns: dd/mm/yyyy or dd-mm-yyyy or dd/mm/yy
    const parts = sNorm.match(/(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
    if (parts) {
      let a = parseInt(parts[1], 10)
      let b = parseInt(parts[2], 10)
      let c = parseInt(parts[3], 10)
      // determine order: if first > 31, assume YYYY-MM-DD
      if (a > 31) {
        const y = a
        const m = b
        const day = c
        const d = new Date(y, m - 1, day)
        if (!isNaN(d.getTime())) return d.toISOString()
      } else {
        // assume DD-MM-YYYY or DD-MM-YY
        let day = a
        let month = b
        let year = c
        if (year < 100) {
          // two-digit year -> assume 2000+
          year = 2000 + year
        }
        // handle Thai BE years
        if (year > 2500) year = year - 543
        const d = new Date(year, month - 1, day)
        if (!isNaN(d.getTime())) return d.toISOString()
      }
    }

    // try to find an ISO-like token inside the string
    const isoToken = (sNorm.match(/\d{4}-\d{2}-\d{2}/) || [])[0]
    if (isoToken) return tryDate(isoToken)

    return ''
  }

  // Post-process a normalized person to ensure history arrays are simple, deduped and dates are ISO strings
  const postProcessPerson = (p: any) => {
    if (!p) return p

    const normalizeStr = (v: any) => v == null ? '' : (Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v))).trim()

    // reportHistory: process new format { code, position, fullName, date, _raw }
    if (Array.isArray(p.reportHistory)) {
      const out: any[] = []
      p.reportHistory.forEach((r: any) => {
        // If already in new format with code/position/fullName
        if (r.code !== undefined || r.position !== undefined || r.fullName !== undefined) {
          let parsedDate = ''
          if (r.date) {
            parsedDate = parseDateFromText(normalizeStr(r.date)) || normalizeStr(r.date)
          }
          const entry = {
            code: normalizeStr(r.code || ''),
            position: normalizeStr(r.position || ''),
            fullName: normalizeStr(r.fullName || ''),
            date: parsedDate,
            _raw: r._raw || ''
          }
          out.push(entry)
        } else {
          // Fallback for old format { to, date, partner }
          const toRaw = normalizeStr(r.to || r)
          let dateCandidate = normalizeStr(r.date || '')
          if (!dateCandidate) {
            const dtMatch = (toRaw.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}-\d{2}-\d{2})/) || [])[0]
            if (dtMatch) dateCandidate = dtMatch
          }
          const parsed = parseDateFromText(dateCandidate) || ''
          const entry = {
            code: '',
            position: '',
            fullName: toRaw,
            date: parsed || (dateCandidate || ''),
            _raw: toRaw
          }
          out.push(entry)
        }
      })
      // dedupe by code+fullName+date
      const uniq: any[] = []
      out.forEach(e => {
        const key = `${e.code}|${e.fullName}|${e.date}`
        if (!uniq.find(u => `${u.code}|${u.fullName}|${u.date}` === key)) {
          uniq.push(e)
        }
      })
      p.reportHistory = uniq
    }

    // enter433 and enterChp: normalize dates and notes
    const normEnter = (arr: any[]) => {
      if (!Array.isArray(arr)) return []
      const out: any[] = []
      arr.forEach((it: any) => {
        // prefer explicit note; if absent, use date text as source to extract leftover note (e.g., location)
        const noteSourceRaw = normalizeStr(it.note)
        const dateRaw0 = normalizeStr(it.date || '')
        const dateRaw = /\[object Object\]/i.test(dateRaw0) ? '' : dateRaw0
        const noteSource = noteSourceRaw || dateRaw
        // parse date from either date field or note source
        const parsed = parseDateFromText(dateRaw) || parseDateFromText(noteSource)
        const stripDates = (txt: string) => {
          let out = txt || ''
          // remove ISO and numeric date patterns
          out = out.replace(/(\d{1,4}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2,4}|\d{4}-\d{2}-\d{2})/g, '')
          // remove Thai day-month-year forms (with Thai months and Thai/Arabic digits)
          out = out.replace(/[๐-๙0-9]+\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*[๐-๙0-9]+/g, '')
          // remove phrases like "ครั้งที่ 1"
          out = out.replace(/ครั้งที่\s*[๐-๙0-9]+/g, '')
          // remove left-over [object Object]
          out = out.replace(/\[object Object\]/g, '')
          return out.replace(/\s{2,}/g, ' ').trim()
        }
        const noteClean = stripDates(noteSource)
        out.push({ idx: it.idx || undefined, note: noteClean, date: parsed || dateRaw })
      })
      // dedupe
      const uniq: any[] = []
      out.forEach(e => { const key = `${e.note}|${e.date}`; if (!uniq.find(u => `${u.note}|${u.date}` === key)) uniq.push(e) })
      return uniq
    }

    p.enter433 = normEnter(p.enter433 || [])
    p.enterChp = normEnter(p.enterChp || [])

    return p
  }

  const duties = useMemo(() => {
    const s = new Set<string>()
    people.forEach(p => {
      if (p.หน้าที่) s.add(p.หน้าที่)
      if (p['ธุรการ ฝอ.']) s.add(p['ธุรการ ฝอ.'])
      if (p.ธุรการ) s.add(p.ธุรการ)
    })
    return Array.from(s).filter(Boolean)
  }, [people])

  const grades = useMemo(() => {
    const s = new Set<string>()
    people.forEach(p => {
      if (p.คัดเกรด) s.add(p.คัดเกรด)
    })
    return Array.from(s).filter(Boolean)
  }, [people])

  const affiliations = useMemo(() => {
    const s = new Set<string>()
    people.forEach(p => {
      if (p.สังกัด) s.add(p.สังกัด)
    })
    return Array.from(s).filter(Boolean)
  }, [people])

  // compute top people by จำนวนครั้งที่เข้า 433
  const ranked = useMemo(() => {
    return [...people]
      .map(p => {
        // คำนวณจำนวนครั้งที่เข้า 433 จาก enter433
        let count = 0
        if (Array.isArray(p.enter433)) {
          count = p.enter433.length
        }

        return { ...p, stat: count }
      })
      .sort((a, b) => b.stat - a.stat)
  }, [people])

  const pieData = useMemo(() => {
    if (!aggData) {
      return [{ label: 'ไม่มีข้อมูล', value: 1, color: '#334155' }]
    }
    const totals = aggData.totals || { report: 0, duty433: 0, admin: 0, never: 0 }
    const arr = [
      { label: 'ถวายรายงาน', value: totals.report || 0, color: '#f97316' },
      { label: 'เข้าเวร433', value: totals.duty433 || 0, color: '#60a5fa' },
      { label: 'ธุรการ', value: totals.admin || 0, color: '#34d399' },
      { label: 'ยังไม่เคย', value: totals.never || 0, color: '#64748b' },
    ]
    // ensure non-zero for rendering
    if (arr.every(a => a.value === 0)) return [{ label: 'ไม่มีข้อมูล', value: 1, color: '#334155' }]
    return arr
  }, [aggData])

  const filtered = useMemo(() => {
    const q = (debouncedSearch || '').toString().trim().toLowerCase()
    // ใช้ลำดับเดิมจาก people และคำนวณจำนวนครั้ง 433 แบบได���ามิก
    const get433Count = (pp: any) => {
      if (typeof pp._enter433Count === 'number') return pp._enter433Count
      if (Array.isArray(pp.enter433)) return pp.enter433.length
      if (Array.isArray(pp._433_dates)) return pp._433_dates.filter((v: any) => isPresent433Value(v)).length
      return 0
    }
    return people.filter(p => {
      // กรองตามหน้าที่ (หลายค่า)
      if (Array.isArray(filterDuties) && filterDuties.length > 0) {
        const dutyVals = [p.หน้าที่, p['ธุรการ ฝอ.'], p.ธุรการ].map(v => (v || '').toString())
        if (!dutyVals.some(v => filterDuties.includes(v))) return false
      }
      // กรองตามคัดเกรด (หลายค่า)
      if (Array.isArray(filterGrades) && filterGrades.length > 0) {
        if (!filterGrades.includes((p.คัดเกรด || '').toString())) return false
      }
      // กรองตามสังกัด (หลายค่า)
      if (Array.isArray(filterAffiliations) && filterAffiliations.length > 0) {
        const aff = (p.สังกัด || '').toString()
        if (!filterAffiliations.includes(aff)) return false
      }
      const stat = get433Count(p)
      if (stat < minCount) return false
      if (q) {
        const name = ((p.ชื่อ || '') + ' ' + (p.สกุล || '')).toLowerCase()
        const pos = (p['ตำแหน่ง'] || p.ตำแหน่ง || '').toString().toLowerCase()
        if (!name.includes(q) && !pos.includes(q)) return false
      }
      return true
    })
  }, [people, filterDuty, filterGrade, filterDuties, filterGrades, filterAffiliations, minCount, debouncedSearch])

  // List view - fetch specific sheet tabs and display names
  const openSheetList = async (_sheetTabName: string) => {
    // Force to use the provided spreadsheet (gid=0)
    const spreadsheetId = '1E0cu1J33gpRA-OHyNYL7tND30OoHBX4YpeoQ7JFUOaQ'
    const gid = '0'
    setIsLoading(true)
    setListSheet('fixed:g0')
    try {
      const res = await fetch(`/api/sheets?spreadsheetId=${encodeURIComponent(spreadsheetId)}&gid=${gid}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        // normalize rows from the fixed spreadsheet tab
        setPeople(normalizePeopleArray(json.data as PersonData[]))
        setView("list")
      } else {
        setPeople([])
        setView("list")
      }
    } catch (e) {
      setPeople([])
      setView("list")
    } finally {
      setIsLoading(false)
    }
  }

  const openPersonDetail = (p: PersonData) => {
    // remember where we came from so the back button returns there
    const previous = view === 'detail' ? 'dashboard' : view
    setPrevView(previous as any)
    setSelectedPerson(postProcessPerson(p))
    setView("detail")
  }

  const handleDetailBack = () => {
    if (prevView) {
      setView(prevView)
      setPrevView(null)
    } else {
      setView('dashboard')
    }
    setSelectedPerson(null)
  }



  // Mobile-friendly layout: use stacked sections under 420px wide
  if (view === "list") {
    return (
      <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button onClick={() => setView("dashboard")} className="bg-white text-slate-900">← ย้อนกลับ</Button>
            </div>
          </div>

          {/* Pie detail modal (mobile-friendly drawer) */}

          <div className="overflow-x-auto w-full max-w-full rounded-lg bg-slate-800/60 border border-slate-700 p-4">
            {/* Minimal filter bar */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDutyPanel((v: boolean) => !v)}
                  className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                >หน้าที่ {filterDuties.length > 0 ? `(${filterDuties.length})` : ''}</button>

                <button
                  type="button"
                  onClick={() => setShowGradePanel((v: boolean) => !v)}
                  className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                >คัดเกรด {filterGrades.length > 0 ? `(${filterGrades.length})` : ''}</button>

                <button
                  type="button"
                  onClick={() => setShowAffPanel(v => !v)}
                  className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                >
                  สังกัด {filterAffiliations.length > 0 ? `(${filterAffiliations.length})` : ''}
                </button>

                <input
                  type="number"
                  min={0}
                  value={minCount}
                  onChange={e => setMinCount(parseInt(e.target.value || '0', 10))}
                  className="w-24 bg-slate-800 border border-slate-600 text-slate-100 px-2 py-1 rounded text-xs placeholder:text-slate-400"
                  aria-label="ขั้นต่ำ (สถิติ)"
                  placeholder={minCount === 0 ? 'สถิติเ��้า 433' : 'สถิติ'}
                  title="กรองจำนวนสถิติ 433 ขั้นต่ำ"
                />

                <div className="relative w-full sm:w-64">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  <input
                    aria-label="ค้นหา"
                    placeholder="ค้นหา"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-slate-800 border border-slate-600 text-slate-100 pl-7 pr-2 py-1 rounded text-xs w-full"
                  />
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="text-[10px] text-sky-300 underline"
                    title="อัปเดตข้อมูล"
                    onClick={() => {
                      // refresh only the fixed list sheet, do not switch to dashboard to avoid aggregated data
                      openSheetList('นนร.')
                    }}
                  >รีเฟรช</button>
                  {(filterDuties.length > 0 || filterGrades.length > 0 || filterAffiliations.length > 0 || minCount > 0 || searchQuery) && (
                    <button
                      type="button"
                      className="text-[10px] text-emerald-300 underline"
                      onClick={() => { setFilterDuties([]); setFilterGrades([]); setFilterAffiliations([]); setMinCount(0); setSearchQuery('') }}
                    >ล้างทั้งหมด</button>
                  )}
                </div>
              </div>

              {showDutyPanel && (
                <div className="bg-slate-900/50 border border-slate-700 rounded p-2 flex items-center gap-2 flex-wrap">
                  {duties.map((d, i) => (
                    <label key={i} className="inline-flex items-center gap-1 text-xs bg-slate-800/80 border border-slate-600 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        className="accent-emerald-500 h-3 w-3"
                        checked={filterDuties.includes(d)}
                        onChange={(e) => {
                          setFilterDuties(prev => e.target.checked ? Array.from(new Set([...prev, d])) : prev.filter(x => x !== d))
                        }}
                      />
                      <span className="truncate max-w-[160px]">{d}</span>
                    </label>
                  ))}
                  {duties.length > 0 && (
                    <button type="button" className="text-[10px] text-emerald-300 underline ml-1" onClick={() => setFilterDuties([])}>ล้าง</button>
                  )}
                </div>
              )}

              {showGradePanel && (
                <div className="bg-slate-900/50 border border-slate-700 rounded p-2 flex items-center gap-2 flex-wrap">
                  {grades.map((g, i) => (
                    <label key={i} className="inline-flex items-center gap-1 text-xs bg-slate-800/80 border border-slate-600 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        className="accent-emerald-500 h-3 w-3"
                        checked={filterGrades.includes(g)}
                        onChange={(e) => {
                          setFilterGrades(prev => e.target.checked ? Array.from(new Set([...prev, g])) : prev.filter(x => x !== g))
                        }}
                      />
                      <span className="truncate max-w-[160px]">{g}</span>
                    </label>
                  ))}
                  {grades.length > 0 && (
                    <button type="button" className="text-[10px] text-emerald-300 underline ml-1" onClick={() => setFilterGrades([])}>ล้าง</button>
                  )}
                </div>
              )}

              {showAffPanel && (
                <div className="bg-slate-900/50 border border-slate-700 rounded p-2 flex items-center gap-2 flex-wrap">
                  {affiliations.map((af, i) => (
                    <label key={i} className="inline-flex items-center gap-1 text-xs bg-slate-800/80 border border-slate-600 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        className="accent-emerald-500 h-3 w-3"
                        checked={filterAffiliations.includes(af)}
                        onChange={(e) => {
                          setFilterAffiliations(prev => {
                            if (e.target.checked) return Array.from(new Set([...prev, af]))
                            return prev.filter(x => x !== af)
                          })
                        }}
                      />
                      <span className="truncate max-w-[160px]">{af}</span>
                    </label>
                  ))}
                  {affiliations.length > 0 && (
                    <button
                      type="button"
                      className="text-[10px] text-emerald-300 underline ml-1"
                      onClick={() => setFilterAffiliations([])}
                    >ล้าง</button>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto w-full max-w-full mb-4">
              <table className="w-full table-auto text-[6px] sm:text-xs min-w-[800px]">
                <thead>
                  <tr>
                    <th className="px-1 py-1 text-center font-semibold border-b border-slate-700 whitespace-nowrap w-12">No.</th>
                    <th className="px-1 py-1 text-center font-semibold border-b border-slate-700 whitespace-nowrap min-w-[60px]">ชื่อ</th>
                    <th className="px-1 py-1 text-center font-semibold border-b border-slate-700 whitespace-nowrap min-w-[60px]">สกุล</th>
                    <th className="px-1 py-1 text-center font-semibold border-b border-slate-700 whitespace-nowrap min-w-[80px]">ตำแหน่ง</th>
                    <th className="px-1 py-1 text-center font-semibold border-b border-slate-700 whitespace-nowrap min-w-[60px]">สังกัด</th>
                    <th className="px-1 py-1 text-center font-semibold border-b border-slate-700 whitespace-nowrap w-12">เกรด</th>
                    <th className="px-1 py-1 text-center font-semibold border-b border-slate-700 whitespace-nowrap min-w-[50px]">ธุรการ</th>
                    <th className="px-1 py-1 text-center font-semibold border-b border-slate-700 whitespace-nowrap min-w-[50px]">ส่วนสูง</th>
                    <th className="px-1 py-1 text-center font-semibold border-b border-slate-700 whitespace-nowrap min-w-[50px]">นักกีฬา</th>
                    <th className="px-1 py-1 text-center font-bold border-b border-slate-700 whitespace-nowrap w-12">สถิติ433</th>

                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr
                      key={i}
                      className="cursor-pointer hover:bg-slate-700/50 odd:bg-slate-900/30 even:bg-slate-800/50"
                      onClick={() => openPersonDetail(p)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPersonDetail(p) } }}
                    >
                      <td className="px-1 py-1 text-center border-b border-slate-700 whitespace-nowrap">{p.ลำดับ || i + 1}</td>
                      <td className="px-1 py-1 text-center border-b border-slate-700 whitespace-nowrap">{p.ชื่อ && p.ชื่อ !== "นนร." ? p.ชื่อ : <span className="text-red-400">ไม่พบชื่อ</span>}</td>
                      <td className="px-1 py-1 text-center border-b border-slate-700 whitespace-nowrap">{p.สกุล && p.สกุล !== "นนร." ? p.สกุล : <span className="text-red-400">ไม่พบสกุล</span>}</td>
                      <td className="px-1 py-1 text-center border-b border-slate-700 whitespace-nowrap">{p['ตำแหน่ง'] || getPositionFrom(p) || '-'}</td>
                      <td className="px-1 py-1 text-center border-b border-slate-700 whitespace-nowrap">{p.สังกัด}</td>
                      <td className="px-1 py-1 text-center border-b border-slate-700 whitespace-nowrap">{p.คัดเกรด || '-'}</td>
                      <td className="px-1 py-1 text-center border-b border-slate-700 whitespace-nowrap">{p['ธุรการ ฝอ.'] || p.ธุรการ || '-'}</td>
                      <td className="px-1 py-1 text-center border-b border-slate-700 whitespace-nowrap">{p.ส่วนสูง || '-'}</td>
                      <td className="px-1 py-1 text-center border-b border-slate-700 whitespace-nowrap">{p.นักกีฬา || '-'}</td>
                      <td className="px-1 py-1 text-center font-bold border-b border-slate-700 whitespace-nowrap">{p._enter433Count ?? (Array.isArray(p.enter433) ? p.enter433.length : 0)}</td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* แสดงจำนวนแถวที่เหลือ */}
            <div className="flex justify-end mt-2">
              <div className="text-xs text-slate-400">
                แสดง {filtered.length} จาก {people.length} รายการ
              </div>
            </div>

            {/* Top-5 removed from list view; available on overview */}
          </div>
        </div>
      </div>
    )
  }

  if (view === "detail" && selectedPerson) {
    return (
      <ProfileDetail
        person={selectedPerson}
        onBack={handleDetailBack}
      />
    )
  }


  // helper: find person by name (exact or partial)
  const findPersonByName = (name: string) => {
    if (!name) return null;
    const norm = (s: string) => s.toString().trim().toLowerCase();
    const target = norm(name);
    const lists: any[] = [];
    if (Array.isArray(people)) lists.push(...people);
    if (aggData && Array.isArray(aggData.people)) lists.push(...aggData.people);

    // 1. Exact match on full name (most reliable)
    for (const p of lists) {
      const fullName = norm(`${p.ชื่อ || ''} ${p.สกุล || ''}`);
      if (fullName === target) {
        return p;
      }
    }

    // 2. Prefix-based matching for first and last name (handles abbreviations)
    const searchTerms = target.split(/\s+/).filter(Boolean);
    if (searchTerms.length > 1) {
      for (const p of lists) {
        const firstName = norm(p.ชื่อ || '');
        const lastName = norm(p.สกุล || '');
        if (firstName.startsWith(searchTerms[0]) && lastName.startsWith(searchTerms[1])) {
          return p;
        }
      }
    }

    // 3. Fallback to the original logic with a small improvement (startsWith instead of includes)
    for (const p of lists) {
      const maybe = norm(p.fullName || p.name || '');
      if (maybe && maybe.startsWith(target)) {
        return p;
      }
    }

    return null;
  }

  // open profile by raw full name from popup; back will return to this view (dashboard)
  const openPersonByName = (rawName: string) => {
    const p = findPersonByName(rawName)
    if (p) {
      openPersonDetail(p as PersonData)
    } else {
      toast({ title: 'ไม่พบโปรไฟล์', description: rawName || '', variant: 'destructive' as any })
    }
  }

  // สร้างข้อความข้อมูลย่อ: ตำแหน่ง | สูง X | คู่ Y
  const buildInfo = (person: any) => {
    const base = getPositionFrom(person) || ''
    const height = person?.ส่วนสูง || person?.height || person?.สูง || ''
    const partner = person?.partner || person?.คู่ || person?.['คู่พี่นายทหาร'] || person?.['คู่พี่'] || ''
    const parts: string[] = []
    if (base) parts.push(base)
    if (height) parts.push(`สูง ${height}`)
    if (partner) parts.push(`คู่ ${partner}`)
    return parts.length ? parts.join(' | ') : '-'
  }

  // เติมข้อมูลจากฐานข้อมูลรวมให้รายการ Weekly Sheet (เช่น ส่วนสูง/คู่) ด้วยการ match ชื่อ
  const enrichPerson = (p: any) => {
    if (!p) return p
    const nameKey = `${p?.ชื่อ || ''}${p?.สกุล || ''}`
    const internal = findPersonByName(nameKey)
    if (!internal) return p
    return {
      ...p,
      ส่วนสูง: p?.ส่วนสูง || internal?.ส่วนสูง || internal?.height || '',
      partner: p?.partner || internal?.partner || internal?.['คู่พี่นายทหาร'] || internal?.['คู่พี่'] || ''
    }
  }

  const handleOverviewItemSelect = (label: string | null) => {
    if (!label) {
      setSelectedOverviewItem(null);
      return;
    }

    const newSelected = selectedOverviewItem === label ? null : label;
    setSelectedOverviewItem(newSelected);

    if (newSelected) {
      switch (newSelected) {
        case 'ถวายรายงาน':
          setTopCardMetric('report');
          break;
        case 'เข้าเวร433':
          setTopCardMetric('_433');
          break;
        case 'ธุรการ':
          setTopCardMetric('admin');
          break;
        default:
          // For 'ยังไม่เคย', do not change the Top 6 metric
          break;
      }
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto relative">
        {/* Top left corner: logo and badge */}
        <div className="absolute top-0 left-0 flex flex-col items-start gap-1">
          <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">J.A.R.V.I.S</div>
          <Badge className="bg-green-600 text-white text-xs">ระบบเวร 433</Badge>
        </div>

        {/* Top right corner: date/time and icon buttons */}
        <div className="absolute top-0 right-0 flex flex-col items-end gap-1">
          <div className="text-xs text-slate-400">{new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</div>

          {/* Minimal refresh/cache buttons */}
          <div className="flex items-center gap-1 bg-slate-800/40 border border-slate-700 rounded-lg px-2 py-1.5">
            <button
              onClick={() => {
                try { window.localStorage.removeItem('duty433_cache_v1') } catch (e) { }
                setView('dashboard')
                setIsLoading(true)
                setTimeout(() => { setIsLoading(false); }, 300)
              }}
              className="p-1.5 rounded hover:bg-slate-700/50 transition-colors"
              title="รีเฟรช"
            >
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <div className="w-px h-4 bg-slate-700"></div>

            <button
              onClick={() => {
                try {
                  window.localStorage.removeItem('duty433_cache_v1')
                  toast({
                    title: "ล้าง Cache สำเร็จ",
                    description: "ระบบจะดึงข้อมูลใหม่จาก Google Sheets",
                  })
                } catch (e) { }
                setView('dashboard')
                setIsLoading(true)
                setTimeout(() => { setIsLoading(false); }, 300)
              }}
              className="p-1.5 rounded hover:bg-slate-700/50 transition-colors"
              title="ล้าง Cache"
            >
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Next weekend info below buttons */}
          <div className="text-xs text-slate-300 text-right mt-1">
            <div>เข้าเวรครั้งถัดไป</div>
            <div>{nextWeekendText}</div>
          </div>
        </div>

        {/* Top: next weekend info (centered, desktop only) - now moved to right side */}
        <header className="mb-12 pt-16">
        </header>

        {/* Middle: left pie chart, right top list */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-1 bg-slate-800/60 border border-slate-700 rounded-lg p-4 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="h-5 w-5 text-yellow-400" />
              <h3 className="font-semibold">อัตราส่วนนนร.ที่ปฏิบัติหน้าที่</h3>
            </div>
            {isLoading ? (
              <div className="text-slate-400">กำลังโหลด...</div>
            ) : (
              <div className="flex flex-col items-center">
                <Pie
                  data={pieData}
                  selectedLabel={selectedOverviewItem || undefined}
                  onSliceClick={(label) => handleOverviewItemSelect(label)}
                />
                {selectedPie && (
                  <div className="mt-3 bg-slate-700/60 border border-slate-500 rounded-lg p-3 shadow-lg transform -translate-y-2">
                    <div className="text-sm font-semibold">{selectedPie}</div>
                    <div className="text-xs text-slate-300">รายละเอียด: {pieData.find(d => d.label === selectedPie)?.value || ''}</div>
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 text-xs text-slate-300 text-center">
              <span
                className={`cursor-pointer px-2 py-1 rounded transition-all duration-200 ${selectedOverviewItem === 'ถวายรายงาน'
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'hover:bg-slate-700/50'
                  }`}
                onClick={() => handleOverviewItemSelect('ถวายรายงาน')}
              >
                ถวายรายงาน
              </span>
              {' : '}
              <span
                className={`cursor-pointer px-2 py-1 rounded transition-all duration-200 ${selectedOverviewItem === 'เข้าเวร433'
                  ? 'bg-green-600 text-white shadow-lg transform scale-105'
                  : 'hover:bg-slate-700/50'
                  }`}
                onClick={() => handleOverviewItemSelect('เข้าเวร433')}
              >
                เข้าเวร433
              </span>
              {' : '}
              <span
                className={`cursor-pointer px-2 py-1 rounded transition-all duration-200 ${selectedOverviewItem === 'ธุรการ'
                  ? 'bg-yellow-600 text-white shadow-lg transform scale-105'
                  : 'hover:bg-slate-700/50'
                  }`}
                onClick={() => handleOverviewItemSelect('ธุรการ')}
              >
                ธุรการ
              </span>
              {' : '}
              <span
                className={`cursor-pointer px-2 py-1 rounded transition-all duration-200 ${selectedOverviewItem === 'ยังไม่เคย'
                  ? 'bg-red-600 text-white shadow-lg transform scale-105'
                  : 'hover:bg-slate-700/50'
                  }`}
                onClick={() => handleOverviewItemSelect('ยังไม่เคย')}
              >
                ยังไม่เคย
              </span>
            </div>
            {selectedOverviewItem && (
              <div className="mt-3 bg-slate-700/60 border border-slate-500 rounded-lg p-3 shadow-lg transform -translate-y-2">
                <div className="text-sm font-semibold text-center mb-2">{selectedOverviewItem}</div>
                <div className="text-xs text-slate-300 text-center">
                  {/* compute count and percentage from people 
                      ratio shows percentage of people with activity in selected category:
                      - ถวายรายงาน: reportHistory.length > 0 (multi-column "ถวายรายงานครั้งที่ n") or reportInfo (backward compat)
                      - เข้าเวร433: enter433.length > 0
                      - ธุรการ: has "ธุรการ ฝอ." or "ธุรการ" field
                      - ยังไม่เคย: has none of the above
                  */}
                  {
                    (() => {
                      const total = people.length || 0
                      let count = 0
                      // Helper: checks if person has report entries from new multi-column structure or legacy field
                      const hasReport = (p: any) => {
                        return (p && p.reportInfo && Object.keys(p.reportInfo || {}).length > 0) || (Array.isArray(p.reportHistory) && p.reportHistory.length > 0) || Boolean(p.ถวายรายงาน)
                      }

                      switch (selectedOverviewItem) {
                        case 'ถวายรายงาน':
                          count = people.filter(p => hasReport(p)).length
                          break
                        case 'เข้าเวร433':
                          count = people.filter(p => Array.isArray(p.enter433) && p.enter433.length > 0).length
                          break
                        case 'ธุรการ':
                          count = people.filter(p => (p as any)['ธุรการ ฝอ.'] || (p as any)['ธุรการ']).length
                          break
                        case 'ยังไม่เคย':
                          count = people.filter(p => {
                            const has433 = Array.isArray(p.enter433) && p.enter433.length > 0
                            const hReport = hasReport(p)
                            const hasAdmin = Array.isArray(p.enterChp) && p.enterChp.length > 0
                            return !has433 && !hReport && !hasAdmin
                          }).length
                          break
                      }
                      const pct = total > 0 ? ((count / total) * 100) : 0
                      const pctText = pct.toFixed(2)
                      return <span>จำนวน: {count} คน ({pctText}%)</span>
                    })()
                  }
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-2 bg-slate-800/60 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Users className="h-5 w-5 text-orange-400" /><h3 className="font-semibold">อันดับ Top 6</h3></div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-300">เลือกประเภท</label>
                <select
                  value={topCardMetric}
                  onChange={e => {
                    const v = e.target.value
                    setTopCardMetric(v)
                    // sync highlight on pie
                    if (v === 'report') setSelectedOverviewItem('ถวายรายงาน')
                    else if (v === '_433') setSelectedOverviewItem('เข้าเวร433')
                    else setSelectedOverviewItem('ธุรการ')
                  }}
                  className="bg-slate-700 text-white px-2 py-1 rounded"
                >
                  <option value="report">ถวายรายงาน</option>
                  <option value="_433">เข้าเวร433</option>
                  <option value="admin">ชป.ธุรการ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(() => {
                // Display top 6 ranked by selected metric.
                // For report metric: uses reportHistory.length (new multi-column structure)
                // for 433/admin: uses enter433.length / enterChp.length respectively
                // Empty entries (count = 0) are filtered out automatically
                const rankedByMetric = (() => {
                  const list = (Array.isArray(people) ? people : []) as any[]
                  const rows = list.map(pp => {
                    let count = 0
                    if (topCardMetric === 'report') {
                      // Count from reportHistory which is built from multi-column "ถวายรายงานครั้งที่ n" headers
                      if (Array.isArray(pp.reportHistory)) {
                        count = pp.reportHistory.length
                      }
                    } else if (topCardMetric === '_433') {
                      if (Array.isArray(pp.enter433)) {
                        count = pp.enter433.length
                      }
                    } else { // admin
                      if (Array.isArray(pp.enterChp)) {
                        count = pp.enterChp.length
                      }
                    }
                    const fullName = `${pp.ยศ || ''} ${pp.ชื่อ || ''} ${pp.สกุล || ''}`.trim()
                    return { fullName, personRef: pp, count }
                  })
                  return rows
                    .filter(r => r.count > 0)
                    .sort((a, b) => b.count - a.count)
                })()

                return rankedByMetric.slice(0, 6).map((p: any, i: number) => {
                  const rawName = p.fullName || p.name || ''
                  const person = p.personRef || findPersonByName(rawName)
                  const displayName = person ? formatDisplayName(person?.ยศ, person?.ชื่อ, person?.สกุล) : rawName
                  const pos = getPositionFrom(p) || (person ? getPositionFrom(person) : '')
                  const count = p.count != null ? p.count : 0
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-900/40 border border-slate-700 rounded px-3 py-2 cursor-pointer hover:bg-slate-800/60 transition-colors"
                      onClick={() => { if (person) openPersonDetail(person) }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (person) openPersonDetail(person) } }}
                    >
                      <div>
                        <div className="font-medium">{displayName || 'ไม่ระบุ'}</div>
                        <div className="text-xs text-slate-400">{pos ? `ตำแหน่ง: ${pos}` : ''}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-300">{count}</div>
                        <div className="text-xs text-slate-400">ครั้ง</div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>

        {/* Enhanced Calendar with Detailed Daily Information */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-bold text-center flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-400" />
              ปฏิทินเวร 433
            </h4>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-700 rounded-full px-1.5 py-1 shadow-sm">
                <Button
                  onClick={() => {
                    const d = new Date(calMonth)
                    d.setMonth(d.getMonth() - 1)
                    setCalMonth(new Date(d))
                  }}
                  className="h-8 w-8 p-0 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700"
                  aria-label="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-200" />
                </Button>
                <div className="px-3 py-1 text-sm sm:text-base font-semibold text-slate-200 whitespace-nowrap">
                  {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][calMonth.getMonth()]} {calMonth.getFullYear() + 543}
                </div>
                <Button
                  onClick={() => {
                    const d = new Date(calMonth)
                    d.setMonth(d.getMonth() + 1)
                    setCalMonth(new Date(d))
                  }}
                  className="h-8 w-8 p-0 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700"
                  aria-label="เดือนถัดไป"
                >
                  <ChevronRight className="h-4 w-4 text-slate-200" />
                </Button>
              </div>
              <Button
                onClick={() => { const now = new Date(); setCalMonth(now); setCalDate(now) }}
                className="hidden sm:inline-flex h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs border border-emerald-500/50"
              >
                วันนี้
              </Button>
            </div>
          </div>

          {/* Enhanced Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {/* Day headers */}
            {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((day) => (
              <div key={day} className="text-center font-semibold text-slate-400 p-1 text-[9px] sm:text-sm">
                {day}
              </div>
            ))}

            {/* Calendar days with enhanced information */}
            {(() => {
              const year = calMonth.getFullYear()
              const month = calMonth.getMonth()
              const firstDay = new Date(year, month, 1)
              const lastDay = new Date(year, month + 1, 0)
              const startDate = new Date(firstDay)
              startDate.setDate(startDate.getDate() - firstDay.getDay())

              const days = []
              const today = new Date()

              // ใช้ข้อมูลจริงจาก Weekly Sheet ผ่าน monthWeekendMap ที่โหลดล่วงหน้าสำหรับเดือนนี้

              for (let i = 0; i < 42; i++) {
                const date = new Date(startDate)
                date.setDate(startDate.getDate() + i)

                const dateStr = date.toISOString().split('T')[0]
                const externalPeople = monthWeekendMap[dateStr] || []
                const hasDutyExternal = externalPeople.length > 0

                // Collect internal duty people for this date
                const internalForDate = weeklyDutyList.filter(p =>
                  Array.isArray(p.enter433) && p.enter433.some((en: any) => {
                    const entryDate = new Date(parseDateFromText(en.date) || en.date)
                    return entryDate.toDateString() === date.toDateString()
                  })
                )
                const hasDutyFromData = internalForDate.length > 0

                // Build small display list: first from external sheet, then internal; dedupe and limit to 3
                const displayNames = [
                  ...externalPeople.map((p: any) => `${p.ชื่อ || ''} ${p.สกุล || ''}`.trim()),
                  ...internalForDate.map((p: any) => `${p.ชื่อ || ''} ${p.สกุล || ''}`.trim()),
                ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)

                const isCurrentMonth = date.getMonth() === month
                const isToday = date.toDateString() === today.toDateString()
                const isSelected = calDate?.toDateString() === date.toDateString()

                days.push(
                  <div
                    key={i}
                    className={`
                      min-h-[48px] sm:min-h-[88px] p-0.5 sm:p-2 border border-slate-700 rounded-lg cursor-pointer
                      transition-all duration-200 hover:bg-slate-700/50 relative
                      ${isCurrentMonth ? 'bg-slate-800/40' : 'bg-slate-950/70 opacity-60'}
                      ${isToday ? 'ring-2 ring-blue-400' : ''}
                      ${isSelected ? 'bg-blue-600/30 ring-1 ring-blue-500' : ''}
                    `}
                    onClick={() => {
                      setCalDate(date)
                      // Show popup with day details
                      const popupData = {
                        date,
                        weeklyExternal: externalPeople,
                        weeklyInternal: weeklyDutyList.filter(p =>
                          Array.isArray(p.enter433) && p.enter433.some((en: any) => {
                            const entryDate = new Date(parseDateFromText(en.date) || en.date)
                            return entryDate.toDateString() === date.toDateString()
                          })
                        )
                      }
                      setSelectedCalendarData(popupData)
                      setView("calendar-popup")
                    }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[9px] sm:text-sm font-medium ${isToday ? 'text-blue-400' : (isCurrentMonth ? 'text-slate-200' : 'text-slate-500')}`}>
                        {date.getDate()}
                      </span>
                      {(hasDutyExternal || hasDutyFromData) && (
                        <div className="flex gap-0.5 items-center">
                          {hasDutyExternal && (
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" title="Weekly Sheet"></div>
                          )}
                          {hasDutyFromData && (
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" title="ฐานข้อมูลรวม"></div>
                          )}
                        </div>
                      )}
                    </div>
                    {displayNames.length > 0 && (
                      <div className="mt-0.5 space-y-0 text-right">
                        {displayNames.map((nm, idx) => (
                          <div key={idx} className="text-[5.5px] sm:text-[9px] leading-tight text-slate-300 truncate">{nm}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return days
            })()}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 p-2 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
              <span className="text-[10px]">นนร.ปฏิบัติหน้าที่</span>
            </div>
            <div className="flex items-center gap-2">
            </div>
            {isMonthMapLoading && (
              <div className="text-[9px] text-slate-400">กำลังโหลดข้อมูล...</div>
            )}
          </div>
        </div>

        {/* Calendar Popup Modal */}
        {view === "calendar-popup" && selectedCalendarData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-[92vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Popup Header */}
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-700">
                <h3 className="text-lg sm:text-xl font-bold">
                  วันที่ {selectedCalendarData.date.getDate()} {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][selectedCalendarData.date.getMonth()]} {selectedCalendarData.date.getFullYear() + 543}
                </h3>
                <Button
                  onClick={() => setView("dashboard")}
                  className="bg-transparent hover:bg-slate-700 p-1 sm:p-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Popup Content */}
              <div className="p-3 sm:p-4 space-y-6">
                {/* Weekly External Section */}
                <div>
                  <h4 className="text-sm sm:text-lg font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                    ผู้ปฏิบัติหน้าที่
                  </h4>
                  {selectedCalendarData.weeklyExternal && selectedCalendarData.weeklyExternal.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCalendarData.weeklyExternal.map((person: any, index: number) => (
                        <button
                          key={index}
                          className="w-full flex items-center justify-between bg-slate-900/40 border border-slate-700 rounded px-2 py-1 sm:px-3 sm:py-2 hover:bg-slate-800/70 transition-colors"
                          onClick={() => openPersonByName(`${person.ชื่อ || ''} ${person.สกุล || ''}`.trim())}
                        >
                          <div className="min-w-0 text-left">
                            <div className="font-medium truncate text-[11px] sm:text-base">{`${person.ชื่อ || ''} ${person.สกุล || ''}`.trim()}</div>
                            <div className="text-[9px] sm:text-xs text-slate-400 truncate">{buildInfo(enrichPerson(person))}</div>
                          </div>
                          <span className="ml-2 shrink-0 bg-cyan-600 text-white px-2 py-0.5 rounded text-[9px] sm:text-xs">Check Profile </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400">
                      ไม่มีข้อมูล
                      <div className="flex justify-center gap-2 mt-4">

                        <a href="https://docs.google.com/spreadsheets/d/1TwqqgEhug2_oe2iIPlR9q-1pGuGIqMGswtPEnLzzcSk/edit?gid=1911292113#gid=1911292113" target="_blank" rel="noopener noreferrer">
                          <Button>ตรวจสอบชีท</Button>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Weekly Internal Section */}
                {selectedCalendarData.weeklyInternal && selectedCalendarData.weeklyInternal.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-lg font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                      ผู้ปฏิบัติหน้าที่จากฐานข้อมูลรวม
                    </h4>
                    <div className="space-y-2">
                      {selectedCalendarData.weeklyInternal.map((person: any, index: number) => (
                        <button
                          key={index}
                          className="w-full flex items-center justify-between bg-slate-900/40 border border-slate-700 rounded px-2 py-1 sm:px-3 sm:py-2 hover:bg-slate-800/70 transition-colors"
                          onClick={() => openPersonByName(`${person.ชื่อ || ''} ${person.สกุล || ''}`.trim())}
                        >
                          <div className="min-w-0 text-left">
                            <div className="font-medium truncate text-[11px] sm:text-base">{formatDisplayName(person.ยศ, person.ชื่อ, person.สกุล)}</div>
                            <div className="text-[9px] sm:text-xs text-slate-400 truncate">{buildInfo(person)}</div>
                          </div>
                          <span className="ml-2 shrink-0 bg-green-600 text-white px-2 py-0.5 rounded text-[9px] sm:text-xs">Internal</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Popup Footer */}
              <div className="flex justify-end gap-3 p-3 sm:p-4 border-t border-slate-700">
                <Button onClick={() => setView("dashboard")} className="bg-slate-600 hover:bg-slate-500 px-2 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-base">
                  ปิด
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} className="bg-yellow-400 text-black px-4 py-2 rounded-md shadow-sm w-full sm:w-auto mb-2 sm:mb-0"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" /></svg>กลับไป Dashboard</Button>
            <Button onClick={() => openSheetList('นนร.')} className="bg-indigo-600 w-full sm:w-auto mb-2 sm:mb-0"><List className="mr-2" />ไปหน้ารายชื่อทั้งหมด</Button>
            <Button onClick={() => onActivateModule ? onActivateModule('create-files') : router.push('/create-files')} className="bg-emerald-600 w-full sm:w-auto mb-2 sm:mb-0"><FileText className="mr-2" />สร้างไฟล์จาก Drive (for PC)</Button>
          </div>
        </div>
      </div>
    </div>
  )
}