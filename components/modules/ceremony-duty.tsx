"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Download,
  FileText,
  Users,
  Settings,
  CheckSquare,
  Square,
  Database,
  Shuffle,
  Award,
  AlertCircle,
  Wifi,
  WifiOff,
  ArrowLeft,
  FileCheck,
  BarChart3,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ExcelJS from "exceljs"
import * as XLSX from "xlsx"
import type { BorderStyle } from "exceljs"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"

interface CeremonyDutyProps {
  onBack: () => void
  sheetName: string
}

interface PersonData {
  ลำดับ: string
  ยศ: string
  ชื่อ: string
  สกุล: string
  ชั้นปีที่: string
  ตอน: string
  ตำแหน่ง: string
  สังกัด: string
  เบอร์โทรศัพท์: string
  หน้าที่?: string
  ชมรม?: string
  สถิติโดนยอด: string
}

interface ApiResponse {
  success: boolean
  data?: PersonData[]
  error?: string
  details?: string
  timestamp?: string
}

export function CeremonyDuty({ onBack, sheetName }: CeremonyDutyProps) {
  const [dutyName, setDutyName] = useState("")
  const [personCount, setPersonCount] = useState(1)
  const [selectedPersons, setSelectedPersons] = useState<PersonData[]>([])
  const [allPersons, setAllPersons] = useState<PersonData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // --- State for Excel Exclusion ---
  const [exclusionFile, setExclusionFile] = useState<File | null>(null)
  const [exclusionSheetNames, setExclusionSheetNames] = useState<string[]>([])
  const [checkAllSheets, setCheckAllSheets] = useState(true)
  const [selectedExclusionSheets, setSelectedExclusionSheets] = useState<string[]>([])
  const [namesToExclude, setNamesToExclude] = useState<Set<string>>(new Set())
  // ------------------------------------

  // สร้าง options จากฐานข้อมูลจริง (อิงคอลัมน์หน้าที่(M) และ ชมรม(K))
  const positions = useMemo(() => {
    const set = new Set<string>()
    allPersons.forEach(p => {
      if (p.หน้าที่ && p.หน้าที่.trim()) set.add(p.หน้าที่.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [allPersons])

  const clubs = useMemo(() => {
    const set = new Set<string>()
    allPersons.forEach(p => {
      if (p.ชมรม && p.ชมรม.trim()) set.add(p.ชมรม.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [allPersons])

  const [excludedPositions, setExcludedPositions] = useState<string[]>([])
  const [excludedClubs, setExcludedClubs] = useState<string[]>([])
  const [statDomain, setStatDomain] = useState<[number, number]>([0, 10]);
  const [statMax, setStatMax] = useState(10);

  const normalizeName = (firstName?: string, lastName?: string): string => {
    const first = (firstName || "").toString().trim()
    const last = (lastName || "").toString().trim()
    return `${first} ${last}`.trim()
  }

  const toThaiNumber = (num: number): string => {
    const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"]
    return num.toString().split("").map((digit) => thaiDigits[parseInt(digit, 10)]).join("")
  }

  const loadSheetData = async () => {
    setIsLoadingData(true)
    setError(null)
    try {
      const response = await fetch(`/api/sheets/ceremony?sheetName=${encodeURIComponent(sheetName)}`)
      const result: ApiResponse = await response.json()
      if (result.success && result.data) {
        setAllPersons(result.data)
        setConnectionStatus("connected")
        setLastUpdated(new Date())
        toast({ title: "เชื่อมต่อสำเร็จ", description: `โหลดข้อมูล ${result.data.length} คน จาก ${sheetName}` })
      } else {
        throw new Error(result.error || "Failed to load data")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)
      setConnectionStatus("error")
      toast({ title: "เกิดข้อผิดพลาดในการเชื่อมต่อ", description: errorMessage, variant: "destructive" })
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    loadSheetData()
  }, [sheetName])

  // เมื่อโหลดข้อมูล allPersons ให้คำนวณ min/max ของสถิติโดนยอด
  useEffect(() => {
    if (allPersons.length > 0) {
      const stats = allPersons.map(p => parseInt(p.สถิติโดนยอด, 10) || 0);
      const min = Math.min(...stats);
      const max = Math.max(...stats);
      setStatDomain([min, max]);
      setStatMax(max);
    }
  }, [allPersons]);

  const handleExclusionFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith(".xlsx")) {
      setExclusionFile(file)
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      setExclusionSheetNames(workbook.SheetNames)
      setSelectedExclusionSheets([]) // Reset selection
      setNamesToExclude(new Set()) // Reset excluded names
    } else if (file) {
      toast({ title: "ไฟล์ไม่ถูกต้อง", description: "กรุณาเลือกไฟล์ .xlsx เท่านั้น", variant: "destructive" })
      setExclusionFile(null)
      setExclusionSheetNames([])
    } else {
       setExclusionFile(null)
       setExclusionSheetNames([])
       setNamesToExclude(new Set())
    }
  }

  useEffect(() => {
    const processExclusionFile = async () => {
      if (!exclusionFile) return

      const arrayBuffer = await exclusionFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const names = new Set<string>()
      
      const sheetsToProcess = checkAllSheets ? exclusionSheetNames : selectedExclusionSheets

      for (const sheetName of sheetsToProcess) {
        const ws = workbook.Sheets[sheetName]
        if (!ws) continue

        const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 3 }) as any[][]
        const filteredData = data.filter(row => row && row.length >= 4 && (row[0] || row[2] || row[3]))
        
        filteredData.forEach(row => {
          const fullName = normalizeName(row[2], row[3]) // คอลัมน์ C, D
          if (fullName) {
            names.add(fullName)
          }
        })
      }
      setNamesToExclude(names)
    }
    processExclusionFile()
  }, [exclusionFile, checkAllSheets, selectedExclusionSheets, exclusionSheetNames])


  const handlePositionChange = (position: string, checked: boolean) => {
    setExcludedPositions(prev => checked ? [...prev, position] : prev.filter(p => p !== position))
  }

  const handleClubChange = (club: string, checked: boolean) => {
    setExcludedClubs(prev => checked ? [...prev, club] : prev.filter(c => c !== club))
    }
  
  const handleExclusionSheetChange = (sheetName: string, checked: boolean) => {
    setSelectedExclusionSheets(prev => checked ? [...prev, sheetName] : prev.filter(s => s !== sheetName))
  }

  const handleSelectAllPositions = () => {
    setExcludedPositions(prev => prev.length === positions.length ? [] : [...positions])
  }

  const handleSelectAllClubs = () => {
    setExcludedClubs(prev => prev.length === clubs.length ? [] : [...clubs])
    }

  const generateDutyAssignment = async () => {
    if (!dutyName.trim()) {
      toast({ title: "กรุณากรอกชื่อยอด", variant: "destructive" })
      return
    }
    if (allPersons.length === 0) {
      toast({ title: "ไม่มีข้อมูลในระบบ", description: "กรุณาโหลดข้อมูลจาก Google Sheets ก่อน", variant: "destructive" })
      return
    }
    setIsLoading(true)

    try {
      let filteredData = [...allPersons]

      // --- NEW: Filter based on Excel file ---
      if (namesToExclude.size > 0) {
        filteredData = filteredData.filter(person => {
          const personName = normalizeName(person.ชื่อ, person.สกุล)
          return !namesToExclude.has(personName)
        })
      }
      // -----------------------------------------

      // NEW: filter by statRange
      filteredData = filteredData.filter(person => {
        const stat = parseInt(person.สถิติโดนยอด, 10) || 0;
        return stat >= statDomain[0] && stat <= statMax;
      });

      const normalize = (str?: string) => (str ? str.trim().toLowerCase() : "")

      if (excludedPositions.length > 0) {
        const normPositions = excludedPositions.map(normalize)
        filteredData = filteredData.filter(person => !normPositions.includes(normalize(person.หน้าที่)))
      }

      if (excludedClubs.length > 0) {
        const normClubs = excludedClubs.map(normalize)
        filteredData = filteredData.filter(person => !normClubs.includes(normalize(person.ชมรม)))
      }

      if (filteredData.length < personCount) {
        toast({
          title: "บุคลากรไม่เพียงพอ",
          description: `ต้องการ ${personCount} คน แต่มีเพียง ${filteredData.length} คนหลังจากการกรอง`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      
      if (filteredData.length === 0) {
        toast({ title: "ไม่มีข้อมูลที่ตรงตามเงื่อนไข", description: "กรุณาปรับเงื่อนไขการกรอง", variant: "destructive" })
        setIsLoading(false)
        return
      }

      // Shuffle filteredData (Fisher-Yates)
      for (let i = filteredData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredData[i], filteredData[j]] = [filteredData[j], filteredData[i]]
      }

      // Sort by stats (ascending - least duty assignments first) - like Python code
      filteredData.sort((a, b) => parseInt(a.สถิติโดนยอด, 10) - parseInt(b.สถิติโดนยอด, 10))

      // Group by affiliation for fair distribution (like Python code)
      const groupedByAffiliation: { [key: string]: PersonData[] } = {}
      filteredData.forEach((person) => {
        if (!groupedByAffiliation[person.สังกัด]) {
          groupedByAffiliation[person.สังกัด] = []
        }
        groupedByAffiliation[person.สังกัด].push(person)
      })

      // Select people fairly from each affiliation (Python algorithm)
      const selected: PersonData[] = []
      const affiliations = Object.keys(groupedByAffiliation)
      const usedIndices = new Set<string>()

      while (selected.length < personCount && selected.length < filteredData.length) {
        for (const affiliation of affiliations) {
          if (selected.length >= personCount) break

          const availablePeople = groupedByAffiliation[affiliation].filter((person) => !usedIndices.has(person.ลำดับ))

          if (availablePeople.length > 0) {
            // Pick the person with lowest stats from this affiliation
            const selectedPerson = availablePeople[0]
            selected.push(selectedPerson)
            usedIndices.add(selectedPerson.ลำดับ)
          }
        }
      }

      // Sort final selection by affiliation then position (as requested)
      selected.sort((a, b) => {
        if (a.สังกัด !== b.สังกัด) {
          return a.สังกัด.localeCompare(b.สังกัด, "th")
        }
        return a.ตำแหน่ง.localeCompare(b.ตำแหน่ง, "th")
      })

      setSelectedPersons(selected)

      toast({
        title: "จัดยอดสำเร็จ",
        description: `เลือกบุคลากร ${selected.length} คน สำหรับ ${dutyName}`,
      })
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถจัดยอดได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Export to real .xlsx with exceljs (merge cell, font, layout)
  // Export to real .xlsx with exceljs (merge cell, font, layout)
  // Export to real .xlsx with exceljs (merge cell, font, layout)
const exportToExcelXlsx = async () => {
  if (selectedPersons.length === 0) {
    toast({ title: "ไม่มีข้อมูลให้ส่งออก", variant: "destructive" });
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("ยอดพิธี");

  // ฟอนต์หลัก
  const mainFont = { name: "TH Sarabun New", size: 14 };

  // กำหนด border style - ใช้เส้นบางทั้งหมด
  const thin: { style: BorderStyle } = { style: 'thin' };

  // แถว 1: ชื่อยอด (merge A1:J1)
  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = dutyName;
  ws.getCell("A1").font = mainFont;
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  // เพิ่มเส้นขอบให้แถว 1
  ws.getCell("A1").border = {
    top: thin,
    left: thin,
    right: thin,
    bottom: thin,
  };

  // แถว 2: เว้นว่าง (merge A2:J2)
  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = "";
  // เพิ่มเส้นขอบให้แถว 2
  ws.getCell("A2").border = {
    top: thin,
    left: thin,
    right: thin,
    bottom: thin,
  };

  // แถว 3: หัวตาราง (merge B3:D3)
  ws.mergeCells("B3:D3");
  ws.getCell("B3").value = "ยศ ชื่อ-สกุล";
  ws.getCell("B3").font = mainFont;
  ws.getCell("B3").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("A3").value = "ลำดับ";
  ws.getCell("A3").font = mainFont;
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("E3").value = "ชั้นปีที่";
  ws.getCell("E3").font = mainFont;
  ws.getCell("E3").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("F3").value = "ตอน";
  ws.getCell("F3").font = mainFont;
  ws.getCell("F3").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("G3").value = "ตำแหน่ง";
  ws.getCell("G3").font = mainFont;
  ws.getCell("G3").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("H3").value = "สังกัด";
  ws.getCell("H3").font = mainFont;
  ws.getCell("H3").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("I3").value = "เบอร์โทรศัพท์";
  ws.getCell("I3").font = mainFont;
  ws.getCell("I3").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("J3").value = "หมายเหตุ";
  ws.getCell("J3").font = mainFont;
  ws.getCell("J3").alignment = { horizontal: "center", vertical: "middle" };

  // หัวตาราง (row 3) - ใช้เส้นบางทั้งหมด
  for (let col = 1; col <= 10; col++) {
    const cell = ws.getCell(3, col);
    cell.border = {
      top: thin,
      left: thin,
      right: thin,
      bottom: thin,
    };
  }

  // ข้อมูล
  selectedPersons.forEach((person, idx) => {
    const rowIdx = idx + 4;
    // คอลัมน์ A: เลขไทย
    ws.getCell(`A${rowIdx}`).value = toThaiNumber(idx + 1);
    ws.getCell(`A${rowIdx}`).font = mainFont;
    ws.getCell(`A${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    // คอลัมน์ B: ยศ
    ws.getCell(`B${rowIdx}`).value = person.ยศ;
    ws.getCell(`B${rowIdx}`).font = mainFont;
    ws.getCell(`B${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    // คอลัมน์ C: ชื่อ
    ws.getCell(`C${rowIdx}`).value = person.ชื่อ;
    ws.getCell(`C${rowIdx}`).font = mainFont;
    ws.getCell(`C${rowIdx}`).alignment = { horizontal: "left", vertical: "middle" };
    // คอลัมน์ D: สกุล
    ws.getCell(`D${rowIdx}`).value = person.สกุล;
    ws.getCell(`D${rowIdx}`).font = mainFont;
    ws.getCell(`D${rowIdx}`).alignment = { horizontal: "left", vertical: "middle" };
    // คอลัมน์ E: ชั้นปีที่ (กึ่งกลาง)
    ws.getCell(`E${rowIdx}`).value = person.ชั้นปีที่;
    ws.getCell(`E${rowIdx}`).font = mainFont;
    ws.getCell(`E${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    // คอลัมน์ F: ตอน (กึ่งกลาง)
    ws.getCell(`F${rowIdx}`).value = person.ตอน;
    ws.getCell(`F${rowIdx}`).font = mainFont;
    ws.getCell(`F${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    // คอลัมน์ G: ตำแหน่ง (กึ่งกลาง)
    ws.getCell(`G${rowIdx}`).value = person.ตำแหน่ง;
    ws.getCell(`G${rowIdx}`).font = mainFont;
    ws.getCell(`G${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    // คอลัมน์ H: สังกัด (กึ่งกลาง)
    ws.getCell(`H${rowIdx}`).value = person.สังกัด;
    ws.getCell(`H${rowIdx}`).font = mainFont;
    ws.getCell(`H${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    // คอลัมน์ I: เบอร์โทรศัพท์ (กึ่งกลาง)
    ws.getCell(`I${rowIdx}`).value = person.เบอร์โทรศัพท์;
    ws.getCell(`I${rowIdx}`).font = mainFont;
    ws.getCell(`I${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    // คอลัมน์ J: หมายเหตุ (กึ่งกลาง)
    ws.getCell(`J${rowIdx}`).value = "";
    ws.getCell(`J${rowIdx}`).font = mainFont;
    ws.getCell(`J${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    
    // ใส่ border รอบ cell ทุก cellที่มีข้อมูล (A-J)
    for (let col = 1; col <= 10; col++) {
      ws.getCell(rowIdx, col).border = {
        top: thin,
        left: thin,
        right: thin,
        bottom: thin,
      };
    }
  });

  // ปรับความกว้างคอลัมน์
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 5;
  ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 15;
  ws.getColumn(5).width = 8;
  ws.getColumn(6).width = 8;
  ws.getColumn(7).width = 20;
  ws.getColumn(8).width = 15;
  ws.getColumn(9).width = 15;
  ws.getColumn(10).width = 15;

  // สร้างไฟล์และดาวน์โหลด
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${dutyName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({ title: "ส่งออกไฟล์ .xlsx สำเร็จ", description: `ไฟล์ ${dutyName}.xlsx ถูกดาวน์โหลดแล้ว` });
};

  const createReport = () => {
    if (selectedPersons.length === 0) {
      toast({ title: "ไม่มีข้อมูลให้สร้างรายงาน", variant: "destructive" })
      return
    }

    const reportLines = [
      `รายงานยอด${dutyName}`,
      `วันที่: ${new Date().toLocaleDateString("th-TH")}`,
      `จำนวนคนที่เลือก: ${selectedPersons.length} คน`,
      `ฐานข้อมูล: ${sheetName}`,
      "",
      "เงื่อนไขการกรอง:",
      `- ยกเว้นหน้าที่: ${excludedPositions.length > 0 ? excludedPositions.join(", ") : "ไม่มี"}`,
      `- ยกเว้นชมรม: ${excludedClubs.length > 0 ? excludedClubs.join(", ") : "ไม่มี"}`,
      `- ยกเว้นจากไฟล์: ${exclusionFile ? `${exclusionFile.name} (${namesToExclude.size} คน)` : 'ไม่มี'}`,
      "",
      "รายชื่อ:",
      ...selectedPersons.map(
        (person, index) =>
          `${index + 1}. ${person.ยศ} ${person.ชื่อ} ${person.สกุล} (${person.สังกัด}) - สถิติ: ${person.สถิติโดนยอด}`,
      ),
      "",
      "หมายเหตุ: รายชื่อนี้จัดโดยระบบอัตโนมัติตามสถิติการได้รับมอบหมายงาน",
      "เรียงลำดับตามสังกัดและตำแหน่ง",
    ]

    const textContent = reportLines.join("\n")
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + textContent], { type: "text/plain;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `รายงาน_${dutyName}.txt`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({ title: "สร้างรายงานสำเร็จ", description: `รายงาน ${dutyName} ถูกดาวน์โหลดแล้ว` })
  }

  const refreshData = () => {
    loadSheetData()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
          <Button onClick={onBack} variant="outline" className="text-white border-white/30 hover:bg-white/10 hover:text-white bg-transparent backdrop-blur-sm w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับหน้าหลัก
          </Button>
          <div className="text-center order-first sm:order-none">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              จัดยอดพิธี
            </h1>
            <p className="text-slate-300 mt-2 text-sm sm:text-base">ระบบจัดการเวรพิธีและงานพิเศษ - เชื่อมต่อ Google Sheets</p>
          </div>
          <Button onClick={refreshData} variant="outline" size="sm" disabled={isLoadingData} className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm w-full sm:w-auto">
            <Database className={`h-4 w-4 mr-2 ${isLoadingData ? "animate-spin" : ""}`} />
            รีเฟรชข้อมูล
          </Button>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Badge className={`${connectionStatus === "connected" ? "bg-green-600" : connectionStatus === "error" ? "bg-red-600" : "bg-yellow-600"} text-white text-xs`}>
                {connectionStatus === "connected" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {connectionStatus === "connected" ? "เชื่อมต่อแล้ว" : connectionStatus === "error" ? "เชื่อมต่อล้มเหลว" : "กำลังเชื่อมต่อ"}
              </Badge>
              <span className="text-slate-300 text-xs sm:text-sm">
                ฐานข้อมูล: {sheetName} | ข้อมูลทั้งหมด: {allPersons.length} คน
              </span>
              {lastUpdated && (
                <span className="text-slate-400 text-xs sm:text-sm">อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString("th-TH")}</span>
              )}
            </div>
            <div className="text-slate-400 text-xs sm:text-sm">Google Sheets Integration</div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">เกิดข้อผิดพลาด: {error}</AlertDescription>
          </Alert>
        )}

        {isLoadingData && (
          <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm mb-4 sm:mb-6">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="text-slate-400 mb-4">
                <Database className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">กำลังโหลดข้อมูล</h3>
                <p className="text-slate-500 text-sm sm:text-base">กำลังเชื่อมต่อกับ Google Sheets...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoadingData && allPersons.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="h-5 w-5 text-blue-400" />
                    ข้อมูลพื้นฐาน
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="duty-name" className="text-white font-medium text-sm sm:text-base">ชื่อยอด</Label>
                    <Input id="duty-name" value={dutyName} onChange={(e) => setDutyName(e.target.value)} placeholder="กรอกชื่อยอด" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400 mt-2 text-sm sm:text-base"/>
                  </div>
                  <div>
                    <Label htmlFor="person-count" className="text-white font-medium text-sm sm:text-base">จำนวนคน</Label>
                    <Input id="person-count" type="number" min="1" value={personCount === 0 ? "" : personCount} onChange={(e) => setPersonCount(Math.max(0, parseInt(e.target.value, 10) || 0))} onBlur={(e) => { if (parseInt(e.target.value, 10) < 1) setPersonCount(1) }} className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400 mt-2 text-sm sm:text-base"/>
                  </div>
                </CardContent>
              </Card>

              {/* Excel Exclusion Card */}
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileCheck className="h-5 w-5 text-green-400" />
                    ไม่เลือกจากไฟล์ Excel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="exclusion-file" className="text-white font-medium text-sm sm:text-base">อัปโหลดไฟล์ (.xlsx)</Label>
                    <Input id="exclusion-file" type="file" accept=".xlsx" onChange={handleExclusionFileChange} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400 mt-2 file:bg-slate-600 file:text-white file:border-0"/>
                  </div>
                  {exclusionFile && (
                    <>
                      <div className="flex items-center justify-between pt-2">
                        <Label htmlFor="check-all-sheets" className="text-white font-medium text-sm sm:text-base">ตรวจสอบทุกชีทในไฟล์</Label>
                        <Switch id="check-all-sheets" checked={checkAllSheets} onCheckedChange={setCheckAllSheets} />
                      </div>
                      {!checkAllSheets && (
                        <div className="space-y-2 pt-2 border-t border-slate-600">
                          <p className="text-white text-sm">เลือกชีทที่ต้องการใช้:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {exclusionSheetNames.map(sheet => (
                              <div key={sheet} className="flex items-center space-x-2">
                                <Checkbox id={`sheet-${sheet}`} checked={selectedExclusionSheets.includes(sheet)} onCheckedChange={(checked) => handleExclusionSheetChange(sheet, checked as boolean)} className="border-slate-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"/>
                                <Label htmlFor={`sheet-${sheet}`} className="text-white text-xs sm:text-sm cursor-pointer truncate">{sheet}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <Badge className="bg-green-600 text-xs">พบ {namesToExclude.size} ชื่อที่จะถูกยกเว้น</Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-red-400" />ไม่เลือกคนที่มีหน้าที่</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleSelectAllPositions} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      {excludedPositions.length === positions.length ? (<><Square className="h-4 w-4 mr-1" />ยกเลิกทั้งหมด</>) : (<><CheckSquare className="h-4 w-4 mr-1" />เลือกทั้งหมด</>)}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {positions.map((position) => (
                      <div key={position} className="flex items-center space-x-2">
                        <Checkbox id={`position-${position}`} checked={excludedPositions.includes(position)} onCheckedChange={(checked) => handlePositionChange(position, checked as boolean)} className="border-slate-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"/>
                        <Label htmlFor={`position-${position}`} className="text-white text-xs sm:text-sm cursor-pointer">{position}</Label>
                      </div>
                    ))}
                  </div>
                  {excludedPositions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600"><Badge variant="destructive" className="text-xs">ยกเว้น {excludedPositions.length} หน้าที่</Badge></div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-orange-400" />ไม่เลือกชมรม</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleSelectAllClubs} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      {excludedClubs.length === clubs.length ? (<><Square className="h-4 w-4 mr-1" />ยกเลิกทั้งหมด</>) : (<><CheckSquare className="h-4 w-4 mr-1" />เลือกทั้งหมด</>)}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {clubs.map((club) => (
                      <div key={club} className="flex items-center space-x-2">
                        <Checkbox id={`club-${club}`} checked={excludedClubs.includes(club)} onCheckedChange={(checked) => handleClubChange(club, checked as boolean)} className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"/>
                        <Label htmlFor={`club-${club}`} className="text-white text-xs sm:text-sm cursor-pointer">{club}</Label>
                      </div>
                    ))}
                  </div>
                  {excludedClubs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600"><Badge className="bg-orange-500 text-xs">ยกเว้น {excludedClubs.length} ชมรม</Badge></div>
                  )}
                </CardContent>
              </Card>

              {/* NEW: Card เลือกช่วงสถิติโดนยอด */}
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    เลือกค่าสูงสุดของสถิติโดนยอด
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Slider
                      min={statDomain[0]}
                      max={statDomain[1]}
                      value={[statMax]}
                      onValueChange={([val]) => setStatMax(val)}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>ต่ำสุด: {statDomain[0]}</span>
                      <span>สูงสุด: {statMax}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center">
                    <Button onClick={generateDutyAssignment} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium shadow-lg text-sm sm:text-base w-full sm:w-auto" disabled={!dutyName.trim() || isLoading || connectionStatus !== "connected"}>
                      {isLoading ? (<><Shuffle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />กำลังจัดยอด...</>) : (<><Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />จัดยอดและสร้างรายชื่อ</>)}
                    </Button>

                    {selectedPersons.length > 0 && (
                      <>
                        <Button onClick={createReport} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium shadow-lg text-sm sm:text-base w-full sm:w-auto">
                          <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />สร้างรายงาน
                        </Button>
                        <Button onClick={exportToExcelXlsx} className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium shadow-lg text-sm sm:text-base w-full sm:w-auto">
                          <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />ดาวน์โหลด Excel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedPersons.length > 0 && (
                <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <CardTitle className="text-white text-lg sm:text-xl">รายชื่อที่ถูกสุ่ม - {dutyName}</CardTitle>
                      <Badge className="bg-blue-600 text-white px-2 sm:px-3 py-1 text-xs sm:text-sm">{selectedPersons.length} คน</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-700/30 rounded-lg overflow-x-auto border border-slate-600">
                      <Table className="min-w-full border-separate border-spacing-0">
                        <TableHeader>
                          <TableRow className="bg-slate-700/80">
                            <TableHead className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ลำดับ</TableHead>
                            <TableHead className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ยศ ชื่อ-สกุล</TableHead>
                            <TableHead className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ชั้นปีที่</TableHead>
                            <TableHead className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ตอน</TableHead>
                            <TableHead className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ตำแหน่ง</TableHead>
                            <TableHead className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">สังกัด</TableHead>
                            <TableHead className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">เบอร์โทรศัพท์</TableHead>
                            <TableHead className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">สถิติโดนยอด</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPersons.map((person, index) => (
                            <TableRow key={person.ลำดับ} className={index % 2 === 0 ? "bg-slate-800/60" : "bg-slate-900/60"}>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{toThaiNumber(index + 1)}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-left text-white border-b border-slate-700">{person.ยศ} {person.ชื่อ} {person.สกุล}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.ชั้นปีที่}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.ตอน}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.ตำแหน่ง}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.สังกัด}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.เบอร์โทรศัพท์}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700"><Badge className="bg-blue-600 text-white text-xs">{(person.สถิติโดนยอด || "").replace(/^'/, "")}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedPersons.length === 0 && !isLoading && (
                <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                  <CardContent className="p-8 sm:p-12 text-center">
                    <div className="text-slate-400 mb-4">
                      <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg sm:text-xl font-semibold mb-2">ยังไม่มีรายชื่อ</h3>
                      <p className="text-slate-500 text-sm sm:text-base">กรอกข้อมูลและกดปุ่ม "จัดยอดและสร้างรายชื่อ" เพื่อเริ่มต้น</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
