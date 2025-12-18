"use client"

import { useState, useRef } from "react"
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
    Trash2
} from "lucide-react"
import ExcelJS from "exceljs"
import { useToast } from "@/hooks/use-toast"

interface ExcelManagerProps {
    onBack: () => void
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
    const [matchedColumns, setMatchedColumns] = useState<string[]>([])
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

            for (const sheetName of selectedSheets) {
                const ws = wb.getWorksheet(sheetName)
                if (!ws) continue

                // 3. Find headers in row 3 with fuzzy matching
                const headers: Record<string, number> = {}
                const headerRow = ws.getRow(3)
                headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const val = cell.text.trim().replace(/\s+/g, '')
                    if (val) headers[val] = colNumber
                })

                // Helper to find column index by multiple possible names
                const findCol = (variants: string[]) => {
                    for (const v of variants) {
                        const normV = v.replace(/\s+/g, '')
                        // Exact match first
                        if (headers[normV]) return headers[normV]
                        // Partial match
                        const key = Object.keys(headers).find(k => k.includes(normV) || normV.includes(k))
                        if (key) return headers[key]
                    }
                    return undefined
                }

                const idxFirstName = findCol(["ชื่อ", "รายชื่อ", "ชื่อตัว", "ชื่อ-สกุล"])
                const idxLastName = findCol(["สกุล", "นามสกุล", "ชื่อสกุล"])

                if (!idxFirstName) {
                    toast({
                        title: `ไม่พบคอลัมน์ 'ชื่อ' ในชีท ${sheetName}`,
                        description: "กรุณาตรวจสอบว่าหัวตารางอยู่ที่แถวที่ 3",
                        variant: "destructive",
                    })
                    continue
                }

                // 4. Match and Fill
                ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    if (rowNumber < 4) return

                    const getVal = (colIdx: number | undefined) => {
                        if (!colIdx) return ""
                        const cell = row.getCell(colIdx)
                        const v = cell.isMerged ? cell.master.value : cell.value
                        if (v === null || v === undefined) return ""
                        if (typeof v === 'object') {
                            if ('result' in v) return String(v.result || "").trim()
                            if ('richText' in v) return v.richText.map(t => t.text).join("").trim()
                            if ('text' in v) return String(v.text || "").trim()
                            return ""
                        }
                        return String(v).trim()
                    }

                    let firstNameOrig = getVal(idxFirstName)
                    let lastNameOrig = getVal(idxLastName)

                    // If they are in the same column (e.g. "ชื่อ-นามสกุล") and lastName is empty
                    if (firstNameOrig.includes(" ") && !lastNameOrig) {
                        const parts = firstNameOrig.split(/\s+/)
                        firstNameOrig = parts[0]
                        lastNameOrig = parts.slice(1).join(" ")
                    }

                    const firstName = firstNameOrig.replace(/\s+/g, '')
                    const lastName = lastNameOrig.replace(/\s+/g, '')

                    if (firstName) {
                        // Find match in DB with normalized name matching
                        const match = dbPeople.find(p => {
                            const dbFirst = p._std_first_name || ""
                            const dbLast = p._std_last_name || ""

                            // Check if first name matches (allowing for titles/ranks)
                            const firstMatch = dbFirst.includes(firstName) || firstName.includes(dbFirst)
                            if (!firstMatch) return false

                            // If we have a last name in both, it must match
                            if (lastName && dbLast) {
                                return dbLast.includes(lastName) || lastName.includes(dbLast)
                            }

                            // If one side has no last name, we trust the first name match
                            return true
                        })

                        if (match) {
                            totalMatchedPeople++
                            // Iterate through all columns in the header to fill missing data
                            Object.entries(headers).forEach(([colName, colIdx]) => {
                                const normColName = colName.replace(/\s+/g, '')
                                if (normColName === "ชื่อ" || normColName === "สกุล" || normColName === "นามสกุล") return

                                const cell = row.getCell(colIdx)
                                const masterCell = cell.isMerged ? cell.master : cell

                                const currentStringVal = getVal(colIdx)
                                const isEmpty = currentStringVal === ""

                                if (isEmpty) {
                                    // Try to find the value in match object by matching normalized keys
                                    let dbValue = match[colName]

                                    if (dbValue === undefined || dbValue === null || String(dbValue).trim() === "") {
                                        const dbKey = Object.keys(match).find(k => k.trim().replace(/\s+/g, '') === normColName || normColName.includes(k.trim().replace(/\s+/g, '')))
                                        if (dbKey) dbValue = match[dbKey]
                                    }

                                    if (dbValue !== undefined && dbValue !== null && String(dbValue).trim() !== "") {
                                        masterCell.value = dbValue
                                        totalUpdated++
                                    }
                                }
                            })
                        }
                    }
                })
            }

            // 5. Export
            const outBuffer = await wb.xlsx.writeBuffer()
            const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `autofilled_${file.name}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast({
                title: "ดำเนินการเสร็จสิ้น",
                description: `พบข้อมูลในฐานข้อมูล ${totalMatchedPeople} คน และเติมข้อมูลที่ว่างไปทั้งหมด ${totalUpdated} ช่อง`,
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
            toast({
                title: "กรุณาเลือกชีท",
                description: "เลือกอย่างน้อย 1 ชีทเพื่อตรวจสอบ",
                variant: "destructive",
            })
            return
        }

        setProcessing(true)
        try {
            // Create a fresh copy to not mutate the state directly if we want to redo
            const wb = new ExcelJS.Workbook()
            const arrayBuffer = await file.arrayBuffer()
            await wb.xlsx.load(arrayBuffer)

            let totalHighlighted = 0

            for (const sheetName of selectedSheets) {
                const ws = wb.getWorksheet(sheetName)
                if (!ws) continue

                // Map to store values and their corresponding row master cells
                const valueMap: Record<string, ExcelJS.Cell[]> = {}

                // Find duplicates from row 4 onwards
                ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    if (rowNumber < 4) return

                    const cell = row.getCell(selectedColumn)
                    // If the cell is part of a merge, we MUST work with the master cell
                    const masterCell = cell.isMerged ? cell.master : cell

                    let val = ""
                    if (masterCell.value !== null && masterCell.value !== undefined) {
                        // Handle different value types safely
                        const v = masterCell.value
                        if (typeof v === 'object') {
                            if ('richText' in v) {
                                val = v.richText.map(t => t.text).join("").trim()
                            } else if ('result' in v) {
                                val = v.result?.toString().trim() || ""
                            } else if ('text' in v) {
                                val = v.text?.toString().trim() || ""
                            } else {
                                val = v.toString().trim()
                            }
                        } else {
                            val = v.toString().trim()
                        }
                    }

                    if (val !== "") {
                        if (!valueMap[val]) {
                            valueMap[val] = []
                        }
                        // Add the specific cell to our map
                        valueMap[val].push(cell)
                    }
                })

                // Highlight duplicates
                Object.entries(valueMap).forEach(([val, cells]) => {
                    if (cells.length > 1) {
                        cells.forEach(cell => {
                            // Apply highlight to the specific cell (or master if merged)
                            // Setting only the fill property to minimize XML changes
                            const master = cell.isMerged ? cell.master : cell;
                            master.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFFFCC' } // Light Yellow
                            }
                            totalHighlighted++
                        })
                    }
                })
            }

            // Generate and download
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
        } catch (error) {
            console.error("Error processing file:", error)
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถจัดการไฟล์ได้",
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
                                <Button
                                    size="lg"
                                    className="w-full sm:w-80 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/40"
                                    onClick={processFile}
                                    disabled={processing || selectedSheets.length === 0}
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                            กำลังประมวลผล...
                                        </>
                                    ) : (
                                        <>
                                            {activeTool === "duplicates" ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <TableIcon className="h-5 w-5 mr-2" />}
                                            {activeTool === "duplicates" ? "ตรวจสอบและเริ่มไฮไลท์" : "เริ่มค้นหาและเติมข้อมูล"}
                                        </>
                                    )}
                                </Button>

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
