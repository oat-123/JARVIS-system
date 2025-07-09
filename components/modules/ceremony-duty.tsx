"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ExcelJS from "exceljs"
import type { BorderStyle } from "exceljs"

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

  const positions = ["ชั้นกรม", "ชั้นพัน", "ฝอ.1", "ฝอ.4", "ฝอ.5", "แซนเฮิร์ท", "อิสลาม", "คริสต์"]
  const clubs = [
    "กรีฑา",
    "จักรยาน",
    "ไซเบอร์",
    "ดนตรีไทย",
    "ดนตรีสากล",
    "ดาบสากล",
    "นิเทศ",
    "สตส",
    "บาส",
    "โปโลน้ำ",
    "ฟุตบอล",
    "ยูโด",
    "รักบี้",
    "แบตมินตัน",
  ]

  const [excludedPositions, setExcludedPositions] = useState<string[]>([])
  const [excludedClubs, setExcludedClubs] = useState<string[]>([])

  // Thai number conversion
  const toThaiNumber = (num: number): string => {
    const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"]
    return num
      .toString()
      .split("")
      .map((digit) => thaiDigits[Number.parseInt(digit)])
      .join("")
  }

  // Load data from Google Sheets API
  const loadSheetData = async () => {
    setIsLoadingData(true)
    setError(null)

    try {
      const response = await fetch(`/api/sheets/ceremony?sheetName=${encodeURIComponent(sheetName)}`)
      const result: ApiResponse = await response.json()

      if (result.success && result.data) {
        console.log('Raw data from backend:', result.data);
        const data = (result.data || []).map((row: any) => {
          if (Array.isArray(row)) {
            const arr = row as any[];
            console.log('Row before map (array):', arr, 'length:', arr.length);
            while (arr.length < 14) arr.push('');
            const mapped = {
              ลำดับ: arr[0] || '',
              ยศ: arr[1] || '',
              ชื่อ: arr[2] || '',
              สกุล: arr[3] || '',
              ชั้นปีที่: arr[4] || '',
              ตอน: arr[5] || '',
              ตำแหน่ง: arr[6] || '',
              สังกัด: arr[7] || '',
              เบอร์โทรศัพท์: arr[8] || '',
              หมายเหตุ: arr[9] || '',
              ชมรม: arr[10] || '',
              ห้องนอน: arr[11] || '',
              หน้าที่: arr[12] || '',
              สถิติโดนยอด: arr[13] || '0',
            };
            console.log('Mapped row (from array):', mapped);
            return mapped;
          } else {
            // ถ้า row เป็น object (backend ส่ง array of object)
            return row;
          }
        })
        setAllPersons(data)
        setConnectionStatus("connected")
        setLastUpdated(new Date())
        toast({
          title: "เชื่อมต่อสำเร็จ",
          description: `โหลดข้อมูล ${data.length} คน จาก ${sheetName}`,
        })
      } else {
        throw new Error(result.error || "Failed to load data")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)
      setConnectionStatus("error")
      toast({
        title: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadSheetData()
  }, [sheetName])

  const handlePositionChange = (position: string, checked: boolean) => {
    if (checked) {
      setExcludedPositions((prev) => [...prev, position])
    } else {
      setExcludedPositions((prev) => prev.filter((p) => p !== position))
    }
  }

  const handleClubChange = (club: string, checked: boolean) => {
    if (checked) {
      setExcludedClubs((prev) => [...prev, club])
    } else {
      setExcludedClubs((prev) => prev.filter((c) => c !== club))
    }
  }

  const handleSelectAllPositions = () => {
    if (excludedPositions.length === positions.length) {
      setExcludedPositions([])
    } else {
      setExcludedPositions([...positions])
    }
  }

  const handleSelectAllClubs = () => {
    if (excludedClubs.length === clubs.length) {
      setExcludedClubs([])
    } else {
      setExcludedClubs([...clubs])
    }
  }

  // Main duty assignment function (based on Python logic)
  const generateDutyAssignment = async () => {
    if (!dutyName.trim()) {
      toast({
        title: "กรุณากรอกชื่อยอด",
        variant: "destructive",
      })
      return
    }

    if (allPersons.length === 0) {
      toast({
        title: "ไม่มีข้อมูลในระบบ",
        description: "กรุณาโหลดข้อมูลจาก Google Sheets ก่อน",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Filter data based on exclusions (exactly like Python code)
      let filteredData = [...allPersons]

      // Helper: normalize string
      const normalize = (str?: string) => (str ? str.trim().toLowerCase() : "")

      // Filter out excluded positions
      if (excludedPositions.length > 0) {
        const normPositions = excludedPositions.map(normalize)
        filteredData = filteredData.filter(
          (person) => !normPositions.includes(normalize(person.หน้าที่))
        )
      }

      // Filter out excluded clubs
      if (excludedClubs.length > 0) {
        const normClubs = excludedClubs.map(normalize)
        filteredData = filteredData.filter(
          (person) => !normClubs.includes(normalize(person.ชมรม))
        )
      }

      if (filteredData.length === 0) {
        toast({
          title: "ไม่มีข้อมูลที่ตรงตามเงื่อนไข",
          description: "กรุณาปรับเงื่อนไขการกรอง",
          variant: "destructive",
        })
        return
      }

      // Shuffle filteredData (Fisher-Yates)
      for (let i = filteredData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[filteredData[i], filteredData[j]] = [filteredData[j], filteredData[i]]
      }

      // Sort by stats (ascending - least duty assignments first) - like Python code
      filteredData.sort((a, b) => Number.parseInt(a.สถิติโดนยอด) - Number.parseInt(b.สถิติโดนยอด))

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
  ws.getCell("A1").font = { ...mainFont, bold: true };
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
      toast({
        title: "ไม่มีข้อมูลให้สร้างรายงาน",
        variant: "destructive",
      })
      return
    }

    // Generate report text (similar to Python logic)
    const reportLines = [
      `รายงานยอด${dutyName}`,
      `วันที่: ${new Date().toLocaleDateString("th-TH")}`,
      `จำนวนคนที่เลือก: ${selectedPersons.length} คน`,
      `ฐานข้อมูล: ${sheetName}`,
      "",
      "รายชื่อ:",
      ...selectedPersons.map(
        (person, index) =>
          `${index + 1}. ${person.ยศ} ${person.ชื่อ} ${person.สกุล} (${person.สังกัด}) - สถิติ: ${person.สถิติโดนยอด}`,
      ),
      "",
      "เงื่อนไขการกรอง:",
      `- ยกเว้นหน้าที่: ${excludedPositions.length > 0 ? excludedPositions.join(", ") : "ไม่มี"}`,
      `- ยกเว้นชมรม: ${excludedClubs.length > 0 ? excludedClubs.join(", ") : "ไม่มี"}`,
      "",
      "หมายเหตุ: รายชื่อนี้จัดโดยระบบอัตโนมัติตามสถิติการได้รับมอบหมายงาน",
      "เรียงลำดับตามสังกัดและตำแหน่ง",
    ]

    // Create and download text file
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

    toast({
      title: "สร้างรายงานสำเร็จ",
      description: `รายงาน ${dutyName} ถูกดาวน์โหลดแล้ว`,
    })
  }

  const refreshData = () => {
    loadSheetData()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={onBack}
            variant="outline"
            className="text-white border-white/30 hover:bg-white/10 hover:text-white bg-transparent backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับหน้าหลัก
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Award className="h-8 w-8 text-yellow-400" />
              จัดยอดพิธี
            </h1>
            <p className="text-slate-300 mt-2">ระบบจัดการเวรพิธีและงานพิเศษ - เชื่อมต่อ Google Sheets</p>
          </div>
          <Button
            onClick={refreshData}
            variant="outline"
            size="sm"
            disabled={isLoadingData}
            className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm"
          >
            <Database className={`h-4 w-4 mr-2 ${isLoadingData ? "animate-spin" : ""}`} />
            รีเฟรชข้อมูล
          </Button>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge
                className={`${
                  connectionStatus === "connected"
                    ? "bg-green-600"
                    : connectionStatus === "error"
                      ? "bg-red-600"
                      : "bg-yellow-600"
                } text-white`}
              >
                {connectionStatus === "connected" ? (
                  <Wifi className="h-3 w-3 mr-1" />
                ) : (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {connectionStatus === "connected"
                  ? "เชื่อมต่อแล้ว"
                  : connectionStatus === "error"
                    ? "เชื่อมต่อล้มเหลว"
                    : "กำลังเชื่อมต่อ"}
              </Badge>
              <span className="text-slate-300 text-sm">
                ฐานข้อมูล: {sheetName} | ข้อมูลทั้งหมด: {allPersons.length} คน
              </span>
              {lastUpdated && (
                <span className="text-slate-400 text-sm">อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString("th-TH")}</span>
              )}
            </div>
            <div className="text-slate-400 text-sm">Google Sheets Integration</div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">เกิดข้อผิดพลาด: {error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoadingData && (
          <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm mb-6">
            <CardContent className="p-12 text-center">
              <div className="text-slate-400 mb-4">
                <Database className="h-16 w-16 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-semibold mb-2">กำลังโหลดข้อมูล</h3>
                <p className="text-slate-500">กำลังเชื่อมต่อกับ Google Sheets...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - only show when data is loaded */}
        {!isLoadingData && allPersons.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-1 space-y-6">
              {/* Basic Information */}
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="h-5 w-5 text-blue-400" />
                    ข้อมูลพื้นฐาน
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="duty-name" className="text-white font-medium">
                      ชื่อยอด
                    </Label>
                    <Input
                      id="duty-name"
                      value={dutyName}
                      onChange={(e) => setDutyName(e.target.value)}
                      placeholder="กรอกชื่อยอด"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400 mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="person-count" className="text-white font-medium">
                      จำนวนคน
                    </Label>
                    <Input
                      id="person-count"
                      type="number"
                      min="1"
                      value={personCount === 0 ? "" : personCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || isNaN(Number(val))) {
                          setPersonCount(0);
                        } else {
                          setPersonCount(Math.max(0, Number(val)));
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val === "" || isNaN(Number(val)) || Number(val) < 1) {
                          setPersonCount(1);
                        }
                      }}
                      className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400 mt-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Position Filter */}
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Users className="h-5 w-5 text-red-400" />
                      ไม่เลือกคนที่มีหน้าที่
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllPositions}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                    >
                      {excludedPositions.length === positions.length ? (
                        <>
                          <Square className="h-4 w-4 mr-1" />
                          ยกเลิกทั้งหมด
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-4 w-4 mr-1" />
                          เลือกทั้งหมด
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {positions.map((position) => (
                      <div key={position} className="flex items-center space-x-2">
                        <Checkbox
                          id={`position-${position}`}
                          checked={excludedPositions.includes(position)}
                          onCheckedChange={(checked) => handlePositionChange(position, checked as boolean)}
                          className="border-slate-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                        />
                        <Label htmlFor={`position-${position}`} className="text-white text-sm cursor-pointer">
                          {position}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {excludedPositions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <Badge variant="destructive" className="text-xs">
                        ยกเว้น {excludedPositions.length} หน้าที่
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Club Filter */}
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Users className="h-5 w-5 text-orange-400" />
                      ไม่เลือกชมรม
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllClubs}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                    >
                      {excludedClubs.length === clubs.length ? (
                        <>
                          <Square className="h-4 w-4 mr-1" />
                          ยกเลิกทั้งหมด
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-4 w-4 mr-1" />
                          เลือกทั้งหมด
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {clubs.map((club) => (
                      <div key={club} className="flex items-center space-x-2">
                        <Checkbox
                          id={`club-${club}`}
                          checked={excludedClubs.includes(club)}
                          onCheckedChange={(checked) => handleClubChange(club, checked as boolean)}
                          className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                        <Label htmlFor={`club-${club}`} className="text-white text-sm cursor-pointer">
                          {club}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {excludedClubs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <Badge className="bg-orange-500 text-xs">ยกเว้น {excludedClubs.length} ชมรม</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Action Buttons */}
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button
                      onClick={generateDutyAssignment}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg"
                      disabled={!dutyName.trim() || isLoading || connectionStatus !== "connected"}
                    >
                      {isLoading ? (
                        <>
                          <Shuffle className="mr-2 h-5 w-5 animate-spin" />
                          กำลังจัดยอด...
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-5 w-5" />
                          จัดยอดและสร้างรายชื่อ
                        </>
                      )}
                    </Button>

                    {selectedPersons.length > 0 && (
                      <>
                        <Button
                          onClick={createReport}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg"
                        >
                          <FileText className="mr-2 h-5 w-5" />
                          สร้างรายงาน
                        </Button>

                        <Button
                          onClick={exportToExcelXlsx}
                          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg"
                        >
                          <Download className="mr-2 h-5 w-5" />
                          ดาวน์โหลด Excel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Results Table */}
              {selectedPersons.length > 0 && (
                <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-xl">รายชื่อที่ถูกสุ่ม - {dutyName}</CardTitle>
                      <Badge className="bg-blue-600 text-white px-3 py-1">{selectedPersons.length} คน</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-700/30 rounded-lg overflow-hidden border border-slate-600">
                      <Table className="min-w-full border-separate border-spacing-0">
                        <TableHeader>
                          <TableRow className="bg-slate-700/80">
                            <TableHead className="px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ลำดับ</TableHead>
                            <TableHead className="px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ยศ ชื่อ-สกุล</TableHead>
                            <TableHead className="px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ชั้นปีที่</TableHead>
                            <TableHead className="px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ตอน</TableHead>
                            <TableHead className="px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">ตำแหน่ง</TableHead>
                            <TableHead className="px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">สังกัด</TableHead>
                            <TableHead className="px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">เบอร์โทรศัพท์</TableHead>
                            <TableHead className="px-2 py-1 text-xs whitespace-nowrap text-center text-white font-semibold border-b border-slate-600">สถิติโดนยอด</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPersons.map((person, index) => (
                            <TableRow
                              key={person.ลำดับ}
                              className={index % 2 === 0 ? "bg-slate-800/60" : "bg-slate-900/60"}
                            >
                              <TableCell className="px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">
                                {toThaiNumber(index + 1)}
                              </TableCell>
                              <TableCell className="px-2 py-1 text-xs whitespace-nowrap text-left text-white border-b border-slate-700">
                                {person.ยศ} {person.ชื่อ} {person.สกุล}
                              </TableCell>
                              <TableCell className="px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">
                                {person.ชั้นปีที่}
                              </TableCell>
                              <TableCell className="px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.ตอน}</TableCell>
                              <TableCell className="px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.ตำแหน่ง}</TableCell>
                              <TableCell className="px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.สังกัด}</TableCell>
                              <TableCell className="px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.เบอร์โทรศัพท์}</TableCell>
                              <TableCell className="px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">
                                <Badge className="bg-blue-600 text-white">{(person.สถิติโดนยอด || "").replace(/^'/, "")}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {selectedPersons.length === 0 && !isLoading && (
                <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <div className="text-slate-400 mb-4">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">ยังไม่มีรายชื่อ</h3>
                      <p className="text-slate-500">กรอกข้อมูลและกดปุ่ม "จัดยอดและสร้างรายชื่อ" เพื่อเริ่มต้น</p>
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
