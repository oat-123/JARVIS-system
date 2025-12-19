"use client"

import React, { useState, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    FileSpreadsheet,
    ArrowLeft,
    Download,
    Table as TableIcon,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Trash2,
    Search
} from "lucide-react"
import ExcelJS from "exceljs"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface ExcelManagerProps {
    onBack: () => void
}

const NamePicker = ({ currentName, dbPeople, onSelect }: { currentName: string, dbPeople: any[], onSelect: (person: any) => void }) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState(currentName)

    // Sync internal query when currentName changes (from other rows/parent)
    React.useEffect(() => {
        setQuery(currentName)
    }, [currentName])

    const suggestions = useMemo(() => {
        if (!query || query.length < 1) return []

        const cleanQuery = query.trim().toLowerCase()
        const queryParts = cleanQuery.split(/\s+/).map(p => p.replace(/\.$/, '')) // Split words and remove trailing dots

        const normalize = (s: any) => String(s || "").normalize('NFC').replace(/[\s\u200B\uFEFF\u00A0\u180E\u2000-\u200B\u202F\u205F\u3000]/g, '').toLowerCase()

        return dbPeople.map(p => {
            const dbFirst = normalize(p._std_first_name || p.ชื่อ || p["ชื่อ-สกุล"])
            const dbLast = normalize(p._std_last_name || p.สกุล || "")
            const dbFull = dbFirst + dbLast
            const display = p.name || `${p.ยศ || ''}${p.ชื่อ || ''} ${p.สกุล || ''}`.trim()

            if (!display) return { person: p, score: 0, display: "Unknown Person" }

            let score = 0

            // Logic for Multiple Parts (First Name + Surname Abbreviation)
            if (queryParts.length >= 1) {
                const qFirst = normalize(queryParts[0])
                if (dbFirst === qFirst) score += 90
                else if (dbFirst.startsWith(qFirst)) score += 50
                else if (dbFirst.includes(qFirst)) score += 20

                if (queryParts.length >= 2) {
                    const qLast = normalize(queryParts[1])
                    if (dbLast === qLast) score += 80
                    else if (dbLast.startsWith(qLast)) score += 60
                    else if (dbLast.includes(qLast)) score += 30
                    // Special Thai vowel prefix handling (e.g., "ศ" in "เศวตรักต")
                    else if (dbLast.length > 1 && dbLast.substring(1).startsWith(qLast)) score += 40
                }
            }

            // Full match fallback (for when users type without spaces)
            const qCombined = normalize(cleanQuery)
            if (dbFull === qCombined) score += 110
            else if (dbFull.startsWith(qCombined)) score += 70
            else if (dbFull.includes(qCombined)) score += 40

            // Character intersection check for minor typos
            const qChars = qCombined.split('')
            const fChars = dbFull.split('')
            const intersection = qChars.filter(c => fChars.includes(c)).length
            score += (intersection / Math.max(qCombined.length, dbFull.length || 1)) * 30

            return { person: p, score, display }
        })
            .filter(s => s.score > 25)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
    }, [query, dbPeople])

    return (
        <div className="flex items-center gap-2 w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="bg-slate-800 border-slate-700 text-xs px-2 py-1 h-8 rounded w-full justify-between hover:bg-slate-700 text-slate-200"
                    >
                        <span className="truncate">{currentName || "เลือกรายชื่อ..."}</span>
                        <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-slate-900 border-slate-700 shadow-2xl" align="start">
                    <Command className="bg-slate-900" shouldFilter={false}>
                        <CommandInput
                            placeholder="พิมพ์เพื่อค้นหา (รองรับตัวย่อ/พิมพ์ผิด)..."
                            value={query}
                            onValueChange={setQuery}
                            className="text-xs h-9 bg-transparent"
                        />
                        <CommandList className="max-h-[250px] min-h-[50px]">
                            {suggestions.length === 0 && query && (
                                <CommandEmpty className="text-[10px] py-4 text-slate-500">ไม่พบรายชื่อที่ใกล้เคียง</CommandEmpty>
                            )}
                            <CommandGroup heading="รายชื่อที่แนะนำ">
                                {suggestions.map((s, i) => (
                                    <CommandItem
                                        key={i}
                                        value={s.display}
                                        onSelect={() => {
                                            onSelect(s.person)
                                            setOpen(false)
                                        }}
                                        className="text-xs cursor-pointer hover:bg-white/5 data-[selected='true']:bg-cyan-500/20 py-2"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-cyan-400">{s.display}</span>
                                            <span className="text-[9px] text-slate-500 group-data-[selected=true]:text-slate-300">
                                                {s.person.สังกัด || s.person.หน่วย || s.person.ตอน || '-'}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export function ExcelManager({ onBack }: ExcelManagerProps) {
    const [activeTool, setActiveTool] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null)
    const [sheetNames, setSheetNames] = useState<string[]>([])
    const [selectedSheets, setSelectedSheets] = useState<string[]>([])
    const [selectedColumn, setSelectedColumn] = useState<string>("C") // Default to C as it's common for names
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [matchedColumns, setMatchedColumns] = useState<string[]>([])
    const [previewRows, setPreviewRows] = useState<any[]>([])
    const [dbPeople, setDbPeople] = useState<any[]>([])
    const { toast } = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        if (!selectedFile.name.endsWith(".xlsx")) {
            toast({
                title: "ไฟล์ไม่ถูกต้อง",
                description: "กรุณาเลือกไฟล์ .xlsx เท่านั้น",
                variant: "destructive",
            })
            return
        }

        setLoading(true)
        try {
            const wb = new ExcelJS.Workbook()
            const arrayBuffer = await selectedFile.arrayBuffer()
            await wb.xlsx.load(arrayBuffer)

            const names = wb.worksheets.map(ws => ws.name)
            setFile(selectedFile)
            setWorkbook(wb)
            setSheetNames(names)
            setSelectedSheets(names) // Default select all

            // Check for matched columns if there are worksheets
            if (activeTool === "autofill" && wb.worksheets.length > 0) {
                const firstSheet = wb.worksheets[0]
                const excelHeaders: string[] = []
                const headerRow = firstSheet.getRow(3)
                headerRow.eachCell({ includeEmpty: true }, (cell) => {
                    const val = cell.text.trim()
                    if (val) excelHeaders.push(val)
                })

                try {
                    const res = await fetch("/api/sheets/433")
                    const data = await res.json()
                    if (data.success && data.data.metadata && data.data.metadata.all_headers) {
                        const dbHeaders = data.data.metadata.all_headers as string[]
                        const matched = excelHeaders.filter(h => dbHeaders.includes(h))
                        setMatchedColumns(matched)
                    }
                } catch (e) {
                    console.error("Error fetching DB headers:", e)
                }
            }

            setLoading(false)
        } catch (error) {
            console.error("Error loading workbook:", error)
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถอ่านไฟล์ Excel ได้",
                variant: "destructive",
            })
            setLoading(false)
        }
    }

    const toggleSheet = (sheetName: string) => {
        setSelectedSheets(prev =>
            prev.includes(sheetName)
                ? prev.filter(s => s !== sheetName)
                : [...prev, sheetName]
        )
    }

    const selectAllSheets = () => {
        setSelectedSheets(sheetNames)
    }

    const deselectAllSheets = () => {
        setSelectedSheets([])
    }

    const scanMissingData = async () => {
        if (!workbook || !file) return
        if (selectedSheets.length === 0) {
            toast({ title: "กรุณาเลือกชีท", variant: "destructive" })
            return
        }

        setScanning(true)
        setPreviewRows([])
        try {
            const res = await fetch("/api/sheets/433")
            const data = await res.json()
            if (!data.success) throw new Error("โหลดฐานข้อมูลไม่สำเร็จ")
            const people = data.data.people as any[]
            setDbPeople(people)
            const dbPeopleLocal = people

            const normalize = (val: any): string => {
                if (val === null || val === undefined) return ""
                try {
                    let str = ""
                    if (typeof val === 'object') {
                        if (val.text !== undefined && val.text !== null) str = String(val.text)
                        else if (val.richText && Array.isArray(val.richText)) str = val.richText.map((t: any) => (t && t.text ? String(t.text) : "")).join("")
                        else if (val.result !== undefined && val.result !== null) str = String(val.result)
                        else str = String(val)
                    } else {
                        str = String(val)
                    }
                    if (!str || str === "null" || str === "undefined") return ""
                    return str.normalize('NFC').replace(/[\s\u200B\uFEFF\u00A0\u180E\u2000-\u200B\u202F\u205F\u3000]/g, '').trim()
                } catch (e) { return "" }
            }

            const results: any[] = []

            for (const sheetName of selectedSheets) {
                const ws = workbook.getWorksheet(sheetName)
                if (!ws) continue

                // Strict Header Row Selection (As requested: Row 3)
                const bestHeaderRow = 3
                const headers: Record<string, number | undefined> = {}

                ws.getRow(bestHeaderRow).eachCell({ includeEmpty: true }, (c) => {
                    const t = normalize(c.value)
                    if (t) headers[t] = Number(c.col)
                })

                const idxFirst = 3
                const idxLast = 4

                ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    // Start from row 4 strictly
                    if (rowNumber < 4) return
                    if (results.length > 50) return

                    const getVal = (col: number) => {
                        if (!col) return ""
                        const cell = row.getCell(col)
                        const v = cell.isMerged ? cell.master.value : cell.value
                        return normalize(v)
                    }

                    const nameVal = idxFirst ? getVal(idxFirst) : "Unknown"
                    const lastVal = idxLast ? getVal(idxLast) : ""

                    const match = dbPeopleLocal.find(p => {
                        const dbFirst = normalize(p._std_first_name || p.ชื่อ || p["ชื่อ-นามสกุล"] || "")
                        const dbLast = normalize(p._std_last_name || p.สกุล || "")

                        // Try matching with input names
                        if (dbFirst === nameVal && (lastVal === "" || dbLast.startsWith(lastVal))) return true
                        if (dbFirst.includes(nameVal) && nameVal.length > 2) return true

                        // Try matching with the combined original name
                        const dbFull = normalize(p.name || "")
                        const inputFull = normalize(nameVal + lastVal)
                        if (dbFull.includes(inputFull) || inputFull.includes(dbFirst)) return true

                        return false
                    })

                    const missing: string[] = []
                    const debug: Record<string, string> = {}
                    Object.entries(headers).forEach(([h, col]) => {
                        if (col && !h.includes("ชื่อ") && !h.includes("สกุล") && h !== "ลำดับ") {
                            const v = getVal(col)
                            debug[h] = v || "(ว่าง)"
                            if (!v) missing.push(h)
                        }
                    })

                    if (missing.length > 0) {
                        const combinedInputName = idxLast ? `${getVal(idxFirst)} ${getVal(idxLast)}`.trim() : getVal(idxFirst)

                        // If auto-matched, use the full name from database instead of the potentially abbreviated Excel name
                        let finalDisplayName = combinedInputName
                        if (match) {
                            finalDisplayName = match.name || `${match.ยศ || ''}${match.ชื่อ || ''} ${match.สกุล || ''}`.trim()
                        }

                        results.push({
                            sheet: sheetName,
                            row: rowNumber,
                            name: finalDisplayName,
                            isMatched: !!match,
                            matchedPerson: match || null,
                            missing: missing,
                            debugData: debug,
                            isHeader: false
                        })
                    }
                })
            }
            setPreviewRows(results)
            if (results.length === 0) toast({ title: "ไม่พบข้อมูลในชีทที่เลือก" })
        } catch (e: any) {
            toast({ title: "Scan Error", description: e.message, variant: "destructive" })
        } finally {
            setScanning(false)
        }
    }

    // Helper for processAutofill to avoid repetition
    const getRawVal = (cell: any) => {
        if (!cell) return ""
        const v = cell.value
        if (v === null || v === undefined) return ""
        if (typeof v === 'object') {
            if ('text' in (v as any)) return String((v as any).text)
            if ('richText' in (v as any)) return (v as any).richText.map((t: any) => t.text).join("")
            return ""
        }
        return String(v)
    }

    const processAutofill = async () => {
        if (!workbook || !file) return
        if (selectedSheets.length === 0) {
            toast({
                title: "กรุณาเลือกชีท",
                description: "เลือกอย่างน้อย 1 ชีทเพื่อดำเนินการ",
                variant: "destructive",
            })
            return
        }

        setProcessing(true)
        try {
            // 1. Fetch data from 433 database
            const res = await fetch("/api/sheets/433")
            const data = await res.json()
            if (!data.success || !data.data.people) {
                throw new Error("ไม่สามารถโหลดข้อมูลจากฐานข้อมูลได้")
            }
            const dbPeople = data.data.people as any[]

            // 2. Load workbook
            const wb = new ExcelJS.Workbook()
            const arrayBuffer = await file.arrayBuffer()
            await wb.xlsx.load(arrayBuffer)

            let totalUpdated = 0
            let totalMatchedPeople = 0

            // 1. Enhanced Normalizer for Thai/Unicode
            const normalize = (val: any): string => {
                if (val === null || val === undefined) return ""
                try {
                    let str = ""
                    if (typeof val === 'object') {
                        if (val.text !== undefined && val.text !== null) str = String(val.text)
                        else if (val.richText && Array.isArray(val.richText)) str = val.richText.map((t: any) => (t && t.text ? String(t.text) : "")).join("")
                        else if (val.result !== undefined && val.result !== null) str = String(val.result)
                        else str = String(val)
                    } else {
                        str = String(val)
                    }

                    if (!str || str === "null" || str === "undefined" || str === "[object Object]") return ""

                    // Comprehensive whitespace removal including Thai zero-width spaces
                    return str
                        .normalize('NFC')
                        .replace(/[\s\u200B\uFEFF\u00A0\u180E\u2000-\u200B\u202F\u205F\u3000]/g, '')
                        .trim()
                } catch (e) {
                    return ""
                }
            }

            const toThaiNumeral = (n: number) => {
                const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
                return n.toString().split('').map(d => thaiDigits[parseInt(d)]).join('');
            };

            for (const sheetName of selectedSheets) {
                const ws = wb.getWorksheet(sheetName)
                if (!ws) continue

                // 3. Identification (Hardcoded C=3, D=4 as per request)
                const bestHeaderRow = 3
                const headers: Record<string, number | undefined> = {}

                ws.getRow(bestHeaderRow).eachCell({ includeEmpty: true }, (cell) => {
                    const txt = normalize(cell.value)
                    if (txt) headers[txt] = Number(cell.col)
                })

                let idxOrder = 1 // Column A
                let idxFirstName = 3
                let idxLastName = 4

                let dataRowCounter = 1

                // 4. Processing Rows (Starting from 4)
                ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    if (rowNumber < 4) return

                    const getRawVal = (col: number) => {
                        const cell = row.getCell(col)
                        const v = cell.isMerged ? cell.master.value : cell.value
                        if (v === null || v === undefined) return ""
                        if (typeof v === 'object') {
                            if ('result' in (v as any)) return String((v as any).result || "")
                            if ('richText' in (v as any)) return (v as any).richText.map((t: any) => t.text).join("")
                            return ""
                        }
                        return String(v)
                    }

                    const inputFirst = normalize(getRawVal(idxFirstName!))
                    const inputLast = idxLastName ? normalize(getRawVal(idxLastName)) : ""

                    // 4.1 Check for manual override from previewRows
                    const manualMatchRow = previewRows.find(r => r.sheet === sheetName && r.row === rowNumber && r.isMatched && r.matchedPerson)

                    let match = null
                    if (manualMatchRow) {
                        match = manualMatchRow.matchedPerson
                    } else if (inputFirst) {
                        match = dbPeople.find(p => {
                            const dbFirst = normalize(p._std_first_name || p.ชื่อ || p["ชื่อ-สกุล"])
                            const dbLast = normalize(p._std_last_name || p.สกุล || "")

                            if (dbFirst === inputFirst && (inputLast === "" || dbLast === inputLast)) return true
                            if (dbFirst.includes(inputFirst) || inputFirst.includes(dbFirst)) {
                                if (!inputLast || !dbLast) return true
                                return dbLast.includes(inputLast) || inputLast.includes(dbLast)
                            }
                            return false
                        })
                    }

                    // Handle Column A (ลำดับ) - Only if empty
                    const currentOrderRaw = getRawVal(idxOrder);
                    if (normalize(currentOrderRaw) === "") {
                        const cell = row.getCell(idxOrder);
                        const thaiNum = toThaiNumeral(dataRowCounter);
                        cell.value = thaiNum;
                        cell.font = { name: 'TH Sarabun New', size: 14 };
                        cell.alignment = { horizontal: 'center' };
                    }
                    dataRowCounter++;

                    if (match) {
                        totalMatchedPeople++

                        // Force Column D to be the full surname from DB
                        const dbSurname = match.สกุล || match._std_last_name || "";
                        if (dbSurname) {
                            const dCell = row.getCell(idxLastName);
                            dCell.value = String(dbSurname).trim();
                            dCell.font = { name: 'TH Sarabun New', size: 14 };
                        }

                        // Create a lookup map of normalized DB keys for THIS person
                        const normMatch: Record<string, any> = {}
                        Object.keys(match).forEach(k => { normMatch[normalize(k)] = match[k] })

                        Object.entries(headers).forEach(([headerName, colIdx]) => {
                            if (colIdx === undefined) return
                            const normHeader = normalize(headerName)

                            // SKIP these columns from DB filling to preserve Excel layout or logic
                            if (normHeader.includes("ชื่อ") || normHeader.includes("สกุล") || normHeader.includes("ยศ") || normHeader === "ลำดับ") return

                            // Check if destination is empty in row
                            const cellValue = normalize(getRawVal(colIdx))
                            if (cellValue === "") {
                                // 1. Direct match 2. Fuzzy match
                                let dbVal = normMatch[normHeader]
                                if (dbVal === undefined || dbVal === null || String(dbVal).trim() === "") {
                                    const fuzzyKey = Object.keys(normMatch).find(k => k.includes(normHeader) || normHeader.includes(k))
                                    if (fuzzyKey) dbVal = normMatch[fuzzyKey]
                                }

                                if (dbVal !== undefined && dbVal !== null && String(dbVal).trim() !== "") {
                                    const finalStr = String(dbVal).trim()
                                    const targetCell = row.getCell(colIdx)
                                    if (targetCell.isMerged) {
                                        targetCell.master.value = finalStr
                                    } else {
                                        targetCell.value = finalStr
                                    }
                                    targetCell.font = { name: 'TH Sarabun New', size: 14 };
                                    totalUpdated++
                                }
                            }
                        })
                    }
                })
            }

            // 5. Export
            const outBuffer = await wb.xlsx.writeBuffer()
            const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `filled_${file.name}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast({
                title: "ดำเนินการเสร็จสิ้น",
                description: `พบข้อมูล ${totalMatchedPeople} คน, เติมข้อมูลสำเร็จ ${totalUpdated} ช่อง`,
            })
        } catch (error: any) {
            console.error("Error in autofill:", error)
            toast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถเติมข้อมูลได้",
                variant: "destructive",
            })
        } finally {
            setProcessing(false)
        }
    }

    const processFile = async () => {
        if (activeTool === "autofill") {
            await processAutofill()
            return
        }

        if (!workbook || !file) return
        if (selectedSheets.length === 0) {
            toast({ title: "กรุณาเลือกชีท", variant: "destructive" })
            return
        }

        setProcessing(true)
        try {
            const wb = new ExcelJS.Workbook()
            const arrayBuffer = await file.arrayBuffer()
            await wb.xlsx.load(arrayBuffer)

            const normalize = (val: any): string => {
                if (val === null || val === undefined) return ""
                try {
                    let str = ""
                    if (typeof val === 'object') {
                        if (val.text !== undefined && val.text !== null) str = String(val.text)
                        else if (val.richText && Array.isArray(val.richText)) str = val.richText.map((t: any) => (t && t.text ? String(t.text) : "")).join("")
                        else if (val.result !== undefined && val.result !== null) str = String(val.result)
                        else str = String(val)
                    } else {
                        str = String(val)
                    }
                    return str.normalize('NFC').replace(/[\s\u200B\uFEFF\u00A0\u180E\u2000-\u200B\u202F\u205F\u3000]/g, '').trim()
                } catch (e) { return "" }
            }

            let totalHighlighted = 0

            for (const sheetName of selectedSheets) {
                const ws = wb.getWorksheet(sheetName)
                if (!ws) continue

                const valueMap: Record<string, ExcelJS.Cell[]> = {}

                ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    // Data starts from row 4 as per request
                    if (rowNumber < 4) return

                    const cell = row.getCell(selectedColumn)
                    const masterCell = cell.isMerged ? cell.master : cell

                    const val = normalize(masterCell.value)
                    if (val !== "") {
                        if (!valueMap[val]) valueMap[val] = []
                        valueMap[val].push(cell)
                    }
                })

                Object.entries(valueMap).forEach(([val, cells]) => {
                    if (cells.length > 1) {
                        cells.forEach(cell => {
                            const master = cell.isMerged ? cell.master : cell
                            // Only apply if not already highlighted to save XML space
                            master.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFFFCC' }
                            }
                            totalHighlighted++
                        })
                    }
                })
            }

            const outBuffer = await wb.xlsx.writeBuffer()
            const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `highlighted_${file.name}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast({
                title: "ดำเนินการเสร็จสิ้น",
                description: `ไฮไลท์ค่าซ้ำทั้งหมด ${totalHighlighted} เซลล์`,
            })
        } catch (error: any) {
            console.error("Error processing file:", error)
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถจัดการไฟล์ได้: " + error.message,
                variant: "destructive",
            })
        } finally {
            setProcessing(false)
        }
    }

    const clearFile = () => {
        setFile(null)
        setWorkbook(null)
        setSheetNames([])
        setSelectedSheets([])
        setMatchedColumns([])
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    // Generate column options A-Z, AA-AZ
    const columns = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
        .concat(Array.from({ length: 26 }, (_, i) => "A" + String.fromCharCode(65 + i)))

    if (!activeTool) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <Button onClick={onBack} variant="outline" className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm">
                            <ArrowLeft className="h-4 w-4 mr-2" /> กลับหน้าหลัก
                        </Button>
                        <div className="text-right">
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2 justify-end">
                                <FileSpreadsheet className="h-6 w-6 text-cyan-400" /> Excel Tool
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">กรุณาเลือกฟังก์ชันที่ต้องการ</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Card
                            className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer group backdrop-blur-sm ${activeTool === "duplicates" ? "border-blue-500 bg-blue-500/5" : ""}`}
                            onClick={() => setActiveTool("duplicates")}
                        >
                            <CardHeader>
                                <CardTitle className={`flex items-center gap-3 transition-colors ${activeTool === "duplicates" ? "text-blue-400" : "text-white group-hover:text-blue-400"}`}>
                                    <div className="bg-blue-500/20 p-2 rounded-lg">
                                        <AlertCircle className="h-6 w-6 text-blue-400" />
                                    </div>
                                    <span>1. จัดการไฮไลท์ค่าเซลล์ที่ซ้ำ</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-400 text-sm">ตรวจสอบและไฮไลท์สีเหลืองในช่องที่ข้อมูลซ้ำกัน โดยเริ่มจากแถวที่ 4 เป็นต้นไป</p>
                            </CardContent>
                        </Card>

                        <Card
                            className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer group backdrop-blur-sm ${activeTool === "autofill" ? "border-cyan-500 bg-cyan-500/5" : ""}`}
                            onClick={() => setActiveTool("autofill")}
                        >
                            <CardHeader>
                                <CardTitle className={`flex items-center gap-3 transition-colors ${activeTool === "autofill" ? "text-cyan-400" : "text-white group-hover:text-cyan-400"}`}>
                                    <div className="bg-cyan-500/20 p-2 rounded-lg">
                                        <TableIcon className="h-6 w-6 text-cyan-400" />
                                    </div>
                                    <span>2. เติมข้อมูลที่ขาดหายอัตโนมัติ</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-400 text-sm">ค้นหาและเติมข้อมูลที่ว่างอยู่โดยอ้างอิงจาก "ฐานข้อมูล 433 & เกรด" โดยใช้ชื่อคอลัมน์ในแถวที่ 3 เป็นหลัก</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <Button onClick={() => setActiveTool(null)} variant="outline" className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm">
                        <ArrowLeft className="h-4 w-4 mr-2" /> กลับไปเลือกฟังก์ชัน
                    </Button>
                    <div className="text-right">
                        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2 justify-end">
                            <FileSpreadsheet className="h-6 w-6 text-cyan-400" /> {activeTool === "duplicates" ? "Duplicate Highlighter" : "Autofill Missing Data"}
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">{activeTool === "duplicates" ? "ไฮไลท์ค่าซ้ำในคอลัมน์" : "เติมข้อมูลอัตโนมัติจากฐานข้อมูล"}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Tool specific description */}
                    {activeTool === "autofill" && (
                        <div className="space-y-4">
                            <div className="bg-cyan-600/10 border border-cyan-500/20 p-4 rounded-xl flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                                <div className="text-xs text-slate-300 leading-relaxed">
                                    <p className="font-bold text-cyan-400 mb-1 underline">เงื่อนไขการทำงาน:</p>
                                    <ul className="list-disc ml-4 space-y-1">
                                        <li>ระบบจะยึดชื่อคอลัมน์ใน <b>แถวที่ 3</b> ของไฟล์ Excel เป็นหลัก</li>
                                        <li>ต้องมีคอลัมน์ชื่อ <b>"ชื่อ"</b> และ <b>"สกุล"</b> เพื่อใช้ในการค้นหาบุคคลในฐานข้อมูล</li>
                                        <li>จะเติมเฉพาะช่องที่ <b>ว่าง (Empty)</b> เท่านั้น ช่องที่มีข้อมูลอยู่แล้วระบบจะไม่ไปแก้ไข</li>
                                        <li>ไฟล์จะรักษาฟอร์แมต ฟอนต์ และสีเดิมไว้ทั้งหมด</li>
                                    </ul>
                                </div>
                            </div>

                            {file && matchedColumns.length > 0 && (
                                <div className="bg-green-600/10 border border-green-500/20 p-4 rounded-xl">
                                    <p className="text-xs font-bold text-green-400 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> คอลัมน์ที่ตรวจพบข้อมูลในฐานข้อมูล ({matchedColumns.length}):
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {matchedColumns.map(col => (
                                            <Badge key={col} variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px]">
                                                {col}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic">* ระบบจะเติมข้อมูลเฉพาะคอลัมน์ด้านบนนี้ตามหัวข้อที่ตรงกัน</p>
                                </div>
                            )}

                            {file && matchedColumns.length === 0 && !loading && (
                                <div className="bg-red-600/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-red-300 leading-relaxed">
                                        ชื่อคอลัมน์ในแถวที่ 3 ไม่ตรงกับฐานข้อมูลเลย กรุณาตรวจสอบชื่อคอลัมน์
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* File Upload Section */}
                    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="border-b border-slate-700/50 bg-slate-800/30">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TableIcon className="h-5 w-5 text-blue-400" /> 1. อัปโหลดไฟล์ที่ต้องการตรวจสอบ
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {!file ? (
                                <div
                                    className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".xlsx"
                                        className="hidden"
                                    />
                                    <div className="bg-slate-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Download className="h-8 w-8 text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-medium mb-1">คลิกเพื่อเลือกไฟล์ Excel</h3>
                                    <p className="text-slate-400 text-sm">รองรับเฉพาะนามสกุล .xlsx เท่านั้น</p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-500/20 p-2 rounded-lg">
                                            <FileSpreadsheet className="h-6 w-6 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{file.name}</p>
                                            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-400/10" onClick={clearFile}>
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {file && (
                        <>
                            {/* Configuration Section */}
                            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                                <CardHeader className="border-b border-slate-700/50 bg-slate-800/30">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-400" /> 2. ตั้งค่าการตรวจสอบ
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    {/* Column Selection (Only for duplicates) */}
                                    {activeTool === "duplicates" && (
                                        <div>
                                            <Label className="text-white font-medium mb-3 block">เลือกคอลัมน์ที่จะตรวจสอบ (เช็คตั้งแต่แถวที่ 4)</Label>
                                            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                                                {columns.slice(0, 30).map(col => (
                                                    <Button
                                                        key={col}
                                                        variant={selectedColumn === col ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setSelectedColumn(col)}
                                                        className={selectedColumn === col ? "bg-blue-600" : "bg-transparent border-slate-600"}
                                                    >
                                                        {col}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sheet Selection */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <Label className="text-white font-medium">เลือกชีทที่จะตรวจสอบ ({selectedSheets.length}/{sheetNames.length})</Label>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" className="text-xs text-blue-400 p-0 h-auto" onClick={selectAllSheets}>เลือกทั้งหมด</Button>
                                                <span className="text-slate-600">|</span>
                                                <Button variant="ghost" size="sm" className="text-xs text-slate-400 p-0 h-auto" onClick={deselectAllSheets}>ล้างทั้งหมด</Button>
                                            </div>
                                        </div>
                                        {loading ? (
                                            <div className="flex items-center gap-2 text-slate-400 py-4">
                                                <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดชีท...
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {sheetNames.map(name => (
                                                    <div
                                                        key={name}
                                                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${selectedSheets.includes(name)
                                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-100'
                                                            : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:bg-slate-700/50'
                                                            }`}
                                                        onClick={() => toggleSheet(name)}
                                                    >
                                                        <Checkbox
                                                            id={`sheet-${name}`}
                                                            checked={selectedSheets.includes(name)}
                                                            onCheckedChange={() => toggleSheet(name)}
                                                            className="border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                        />
                                                        <label
                                                            htmlFor={`sheet-${name}`}
                                                            className="text-sm font-medium leading-none cursor-pointer truncate flex-1"
                                                        >
                                                            {name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action Section */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    {activeTool === "autofill" && (
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="flex-1 sm:w-48 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-bold"
                                            onClick={scanMissingData}
                                            disabled={scanning || processing || selectedSheets.length === 0}
                                        >
                                            {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TableIcon className="h-4 w-4 mr-2" />}
                                            สแกนค่าว่าง
                                        </Button>
                                    )}
                                    <Button
                                        size="lg"
                                        className={`flex-1 sm:w-60 font-bold py-6 rounded-xl shadow-lg ${activeTool === "duplicates" ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-600 hover:bg-cyan-700"}`}
                                        onClick={processFile}
                                        disabled={processing || scanning || selectedSheets.length === 0}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                กำลังประมวลผล...
                                            </>
                                        ) : (
                                            <>
                                                {activeTool === "duplicates" ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <Download className="h-5 w-5 mr-2" />}
                                                {activeTool === "duplicates" ? "ตรวจสอบและเริ่มไฮไลท์" : "ค้นหาและเติมข้อมูลทั้งหมด"}
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {previewRows.length > 0 && (
                                    <Card className="w-full bg-slate-900/80 border-slate-700 overflow-hidden mt-4">
                                        <CardHeader className="bg-slate-800/50 p-3">
                                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                                <span>ผลการสแกนช่องว่างที่พบ (แสดง {previewRows.length} รายการแรก)</span>
                                                <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
                                                    Matched {previewRows.filter(r => r.isMatched).length} / {previewRows.length}
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0 overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-800/30 text-slate-400 border-b border-slate-700">
                                                    <tr>
                                                        <th className="p-2 w-16">แถว</th>
                                                        <th className="p-2">ชื่อ-นามสกุล (Excel)</th>
                                                        <th className="p-2">คอลัมน์ที่ว่าง</th>
                                                        <th className="p-2">ข้อมูลที่อ่านได้ (Debug)</th>
                                                        <th className="p-2">สถานะ DB</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800">
                                                    {previewRows.map((row, i) => (
                                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-2 text-slate-500 font-mono">{row.row}</td>
                                                            <td className="p-2">
                                                                <NamePicker
                                                                    currentName={row.name}
                                                                    dbPeople={dbPeople}
                                                                    onSelect={(person) => {
                                                                        const next = [...previewRows]
                                                                        // Use full display name from database person record
                                                                        const fullName = person.name || `${person.ยศ || ''}${person.ชื่อ || ''} ${person.สกุล || ''}`.trim()
                                                                        next[i].name = fullName
                                                                        next[i].isMatched = true
                                                                        next[i].matchedPerson = person
                                                                        setPreviewRows(next)
                                                                        toast({ title: "เลือกรายชื่อแล้ว", description: fullName })
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {row.missing.length > 0 ? (
                                                                        row.missing.map((m: string) => (
                                                                            <span key={m} className="text-cyan-400/70 border border-cyan-400/20 px-1 rounded">{m}</span>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-slate-500 italic">ไม่พบช่องว่าง</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-2">
                                                                <div className="text-[10px] text-slate-400 space-y-1">
                                                                    {Object.entries(row.debugData || {}).slice(0, 3).map(([k, v]) => (
                                                                        <div key={k}>{k}: {String(v)}</div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="p-2">
                                                                {row.isMatched ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <Badge className="bg-green-500/20 text-green-400 border-none text-[10px] w-fit">ตรงกับฐานข้อมูล</Badge>
                                                                        <div className="text-[9px] text-green-300 truncate max-w-[150px]">
                                                                            {row.matchedPerson?.name || `${row.matchedPerson?.ยศ || ''} ${row.matchedPerson?.ชื่อ || ''} ${row.matchedPerson?.สกุล || ''}`.trim()}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <Badge className="bg-red-500/20 text-red-400 border-none text-[10px]">ไม่พบข้อมูล</Badge>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>
                                )}

                                <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-800/40 px-4 py-2 rounded-full border border-slate-700">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>ระบบจะเก็บโครงสร้าง ฟอนต์ และการจัดหน้าเดิมไว้ทั้งหมด</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
        </div>
    )
}
