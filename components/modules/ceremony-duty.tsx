"use client";
// Helper to convert Thai numerals to Arabic numerals
function toArabic(str: string) {
  return (str || '').replace(/[๐-๙]/g, (d: string) => "0123456789"["๐๑๒๓๔๕๖๗๘๙".indexOf(d)]);
}
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { saveModuleState, loadModuleState, clearModuleState } from "@/lib/state-persistence"
import { loadFromCache, saveToCache } from "@/lib/ccache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// Helper to show friendly sheet name
export function getFriendlySheetName(name: string) {
  if (!name) return "-";
  if (name === "รวม") return "รวม";
  if (name.startsWith("พัน")) return name;
  // Add more mapping logic if needed
  return name;
}
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
  X,
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
  user: {
    displayName: string
    role: string
    group: string
    sheetname: string
  } | null
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

export function CeremonyDuty({ onBack, sheetName, user }: CeremonyDutyProps) {
  const router = useRouter();
  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'oat';
  console.log("[CeremonyDuty] User prop:", user);
  console.log("[CeremonyDuty] isAdmin:", isAdmin);
  const [allPersons, setAllPersons] = useState<PersonData[]>([]);
  const [selectedPersons, setSelectedPersons] = useState<PersonData[]>([]);
  const [excludedPositions, setExcludedPositions] = useState<string[]>([])
  const [excludedClubs, setExcludedClubs] = useState<string[]>([])
  const [statDomain, setStatDomain] = useState<[number, number]>([0, 10]);
  const [statMax, setStatMax] = useState(10);
  const [dutyName, setDutyName] = useState("");
  const [requiredByYear, setRequiredByYear] = useState<{[key: string]: number}>({"1": 0, "2": 0, "3": 0, "4": 0, "5": 0});
  const [selectedAffiliations, setSelectedAffiliations] = useState<string[]>([]);
  const allAffiliations = useMemo(() => {
    if (!isAdmin) return [];
    const set = new Set<string>();
    allPersons.forEach((p: PersonData) => {
      if (
        p.สังกัด &&
        typeof p.สังกัด === "string" &&
        p.สังกัด.trim() &&
        !/^๐-๙$/.test(p.สังกัด.trim()) // ไม่เอาตัวเลขล้วน
      ) {
        set.add(p.สังกัด.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [allPersons, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setSelectedAffiliations(allAffiliations);
    }
  }, [allAffiliations, isAdmin]);

  const filteredPersons = useMemo(() => {
    if (isAdmin) {
      if (selectedAffiliations.length === 0) return [];
      return allPersons.filter((p: PersonData) => selectedAffiliations.includes(p.สังกัด));
    } else {
      return selectedPersons;
    }
  }, [selectedPersons, selectedAffiliations, isAdmin, allPersons]);
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const MODULE_NAME = 'ceremony-duty'
  const [isStateLoaded, setIsStateLoaded] = useState(false)

  const [exclusionFiles, setExclusionFiles] = useState<File[]>([])
  const [exclusionSheetNames, setExclusionSheetNames] = useState<{ [filename: string]: string[] }>({})
  const [checkAllSheets, setCheckAllSheets] = useState(true)
  const [selectedExclusionSheets, setSelectedExclusionSheets] = useState<{ [filename: string]: string[] }>({})
  const [namesToExclude, setNamesToExclude] = useState<Set<string>>(new Set())

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

  

  const saveCurrentState = () => {
    if (!isStateLoaded) return
    
    const state = {
      dutyName,
      requiredByYear,
      selectedPersons,
      excludedPositions,
      excludedClubs,
      statMax,
      checkAllSheets,
    }
    console.log('💾 Saving state:', state)
    saveModuleState(MODULE_NAME, state)
  }

  const loadSavedState = () => {
    const savedState = loadModuleState(MODULE_NAME)
    if (savedState) {
      console.log('🔄 Loading saved state:', savedState)
      if (savedState.dutyName) setDutyName(savedState.dutyName)
      if (savedState.requiredByYear) setRequiredByYear(savedState.requiredByYear)
      if (savedState.selectedPersons) setSelectedPersons(savedState.selectedPersons)
      if (savedState.excludedPositions) setExcludedPositions(savedState.excludedPositions)
      if (savedState.excludedClubs) setExcludedClubs(savedState.excludedClubs)
      if (savedState.statMax) setStatMax(savedState.statMax)
      if (typeof savedState.checkAllSheets === 'boolean') setCheckAllSheets(savedState.checkAllSheets)
      console.log('✅ State loaded successfully')
    } else {
      console.log('ℹ️ No saved state found')
    }
    setIsStateLoaded(true)
  }

  const normalizeName = (firstName?: string, lastName?: string): string => {
    const first = (firstName || "").toString().trim()
    const last = (lastName || "").toString().trim()
    return `${first} ${last}`.trim()
  }

  const toThaiNumber = (num: number): string => {
    const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"]
    return num.toString().split("").map((digit) => thaiDigits[parseInt(digit, 10)]).join("")
  }

  const loadSheetData = async (force: boolean = false) => {
    setIsLoadingData(true)
    setError(null)

    const cacheKey = `ceremony-data-${sheetName}`;
    if (!force) {
      const cachedData = loadFromCache<PersonData[]>(cacheKey);
      if (cachedData) {
        setAllPersons(cachedData);
        setConnectionStatus("connected");
        setLastUpdated(new Date());
        toast({ title: "โหลดข้อมูลสำเร็จ", description: `ใช้ข้อมูลจากแคช ${cachedData.length} คน` });
        setIsLoadingData(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/sheets/ceremony?sheetName=${encodeURIComponent(sheetName)}`)
      const result: ApiResponse = await response.json()
      if (result.success && result.data) {
        const dataRows = result.data.slice(1)
        setAllPersons(dataRows)
        setConnectionStatus("connected")
        setLastUpdated(new Date())
        saveToCache(cacheKey, dataRows);
        toast({ title: "เชื่อมต่อสำเร็จ", description: `โหลดข้อมูล ${dataRows.length} คน จาก ${sheetName}` })
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

  useEffect(() => {
    if (!isLoadingData && connectionStatus === "connected") {
      loadSavedState()
    }
  }, [isLoadingData, connectionStatus])

  useEffect(() => {
    if (isStateLoaded) {
      saveCurrentState()
    }
  }, [dutyName, requiredByYear, selectedPersons, excludedPositions, excludedClubs, statMax, checkAllSheets, isStateLoaded])

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
    const files = Array.from(event.target.files || []).filter(f => f.name.endsWith('.xlsx'))
    if (files.length === 0) {
      toast({ title: "ไฟล์ไม่ถูกต้อง", description: "กรุณาเลือกไฟล์ .xlsx เท่านั้น", variant: "destructive" })
      return
    }
    setExclusionFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name))
      return [...prev, ...files.filter(f => !existingNames.has(f.name))]
    })
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      setExclusionSheetNames(prev => ({ ...prev, [file.name]: workbook.SheetNames }))
      setSelectedExclusionSheets(prev => ({ ...prev, [file.name]: [] }))
    }
    setNamesToExclude(new Set())
  }

  useEffect(() => {
    const processExclusionFiles = async () => {
      if (!exclusionFiles.length) {
        setNamesToExclude(new Set())
        return
      }
      const names = new Set<string>()
      for (const file of exclusionFiles) {
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: "array" })
        const sheetsToProcess = checkAllSheets
          ? exclusionSheetNames[file.name] || []
          : selectedExclusionSheets[file.name] || []
        for (const sheetName of sheetsToProcess) {
          const ws = workbook.Sheets[sheetName]
          if (!ws) continue
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 3 }) as any[][]
          const filteredData = data.filter(row => row && row.length >= 4 && (row[0] || row[2] || row[3]))
          filteredData.forEach(row => {
            const fullName = normalizeName(row[2], row[3])
            if (fullName) names.add(fullName)
          })
        }
      }
      setNamesToExclude(names)
    }
    processExclusionFiles()
  }, [exclusionFiles, checkAllSheets, selectedExclusionSheets, exclusionSheetNames])


  const handlePositionChange = (position: string, checked: boolean) => {
    setExcludedPositions(prev => checked ? [...prev, position] : prev.filter(p => p !== position))
  }

  const handleClubChange = (club: string, checked: boolean) => {
    setExcludedClubs(prev => checked ? [...prev, club] : prev.filter(c => c !== club))
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
    setIsLoading(true);

    try {
        const namesToExcludeArray = Array.from(namesToExclude);

        const response = await fetch('/api/ceremony-duty/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                allPersons,
                requiredByYear,
                namesToExclude: namesToExcludeArray,
                statMax,
                statDomain,
                excludedPositions,
                excludedClubs,
            }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            setSelectedPersons(result.selectedPersons);
            
            if (result.message.includes("แต่จัดได้เพียง")) {
                 toast({
                    title: "ไม่สามารถหาคนได้ครบตามจำนวนที่ต้องการ",
                    description: result.message,
                    variant: "default",
                });
            } else {
                toast({
                    title: "จัดยอดสำเร็จ",
                    description: `เลือกบุคลากร ${result.selectedPersons.length} คน สำหรับ ${dutyName}`,
                });
            }
        } else {
            toast({
                title: result.error || "เกิดข้อผิดพลาดในการจัดยอด",
                description: result.description || "ไม่สามารถจัดยอดได้",
                variant: "destructive",
            });
        }

    } catch (error) {
        console.error('[จัดยอด] Client-side ERROR:', error);
        toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถสื่อสารกับเซิร์ฟเวอร์ได้",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }

  const [saveToHistory, setSaveToHistory] = useState(false);

  function saveExportHistory(type: 'excel' | 'report', fileName: string, content?: string) {
    if (!saveToHistory) return;
    const key = 'jarvis-duty-history';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    const newEntry = {
      type,
      fileName,
      dutyName,
      sheetName,
      date: new Date().toISOString(),
      count: selectedPersons.length,
      content: content || null,
    };
    const next = [newEntry, ...prev].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(next));
  }

  async function sendFileToGoogleSheets(fileName: string, fileData: string) {
    try {
      const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
      
      const payload = {
        action: 'addFile',
        fileName: fileName,
        date: new Date().toLocaleDateString('th-TH'),
        type: 'ceremony-duty',
        dutyName: dutyName,
        count: selectedPersons.length.toString(),
        fileData: fileData,
        sheetId: '1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw',
        sheetName: 'file'
      };

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.success) {
        return { success: true, message: 'ส่งไฟล์ไปยัง Google Sheets สำเร็จ' };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Failed to send file to Google Sheets:', error);
      
      console.log('ข้อมูลที่จะส่ง:', {
        fileName,
        date: new Date().toLocaleDateString('th-TH'),
        type: 'ceremony-duty',
        dutyName,
        count: selectedPersons.length,
        fileDataLength: fileData.length
      });
      
      return { success: false, message: 'ยังไม่ได้ตั้งค่า Google Apps Script - ดูข้อมูลใน Console' };
    }
  }

  const exportToExcelXlsx = async () => {
  if (selectedPersons.length === 0) {
    toast({ title: "ไม่มีข้อมูลให้ส่งออก", variant: "destructive" });
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("ยอดพิธี");

  const mainFont = { name: "TH Sarabun New", size: 14 };

  const thin: { style: BorderStyle } = { style: 'thin' };

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = dutyName;
  ws.getCell("A1").font = mainFont;
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("A1").border = {
    top: thin,
    left: thin,
    right: thin,
    bottom: thin,
  };

  ws.mergeCells("A2:J2");
  ws.getCell("A2").value = "";
  ws.getCell("A2").border = {
    top: thin,
    left: thin,
    right: thin,
    bottom: thin,
  };

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

  for (let col = 1; col <= 10; col++) {
    const cell = ws.getCell(3, col);
    cell.border = {
      top: thin,
      left: thin,
      right: thin,
      bottom: thin,
    };
  }

  selectedPersons.forEach((person, idx) => {
    const rowIdx = idx + 4;
    ws.getCell(`A${rowIdx}`).value = toThaiNumber(idx + 1);
    ws.getCell(`A${rowIdx}`).font = mainFont;
    ws.getCell(`A${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`B${rowIdx}`).value = person.ยศ;
    ws.getCell(`B${rowIdx}`).font = mainFont;
    ws.getCell(`B${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`C${rowIdx}`).value = person.ชื่อ;
    ws.getCell(`C${rowIdx}`).font = mainFont;
    ws.getCell(`C${rowIdx}`).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(`D${rowIdx}`).value = person.สกุล;
    ws.getCell(`D${rowIdx}`).font = mainFont;
    ws.getCell(`D${rowIdx}`).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(`E${rowIdx}`).value = person.ชั้นปีที่;
    ws.getCell(`E${rowIdx}`).font = mainFont;
    ws.getCell(`E${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`F${rowIdx}`).value = person.ตอน;
    ws.getCell(`F${rowIdx}`).font = mainFont;
    ws.getCell(`F${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`G${rowIdx}`).value = person.ตำแหน่ง;
    ws.getCell(`G${rowIdx}`).font = mainFont;
    ws.getCell(`G${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`H${rowIdx}`).value = person.สังกัด;
    ws.getCell(`H${rowIdx}`).font = mainFont;
    ws.getCell(`H${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`I${rowIdx}`).value = person.เบอร์โทรศัพท์;
    ws.getCell(`I${rowIdx}`).font = mainFont;
    ws.getCell(`I${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(`J${rowIdx}`).value = "";
    ws.getCell(`J${rowIdx}`).font = mainFont;
    ws.getCell(`J${rowIdx}`).alignment = { horizontal: "center", vertical: "middle" };
    
    for (let col = 1; col <= 10; col++) {
      ws.getCell(rowIdx, col).border = {
        top: thin,
        left: thin,
        right: thin,
        bottom: thin,
      };
    }
  });

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

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  
  const uint8Array = new Uint8Array(buffer);
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  const base64String = btoa(binaryString);
  const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64String}`;
  
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${dutyName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (saveToHistory) {
    const result = await sendFileToGoogleSheets(`${dutyName}.xlsx`, dataUrl);
    if (result.success) {
      toast({ title: "ส่งไฟล์สำเร็จ", description: result.message });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: result.message, variant: "destructive" });
    }
    
    saveExportHistory('excel', `${dutyName}.xlsx`, dataUrl);
  }

  toast({ title: "ส่งออกไฟล์ .xlsx สำเร็จ", description: `ไฟล์ ${dutyName}.xlsx ถูกดาวน์โหลดแล้ว` });
};

  const createReport = async () => {
    if (selectedPersons.length === 0) {
      toast({ title: "ไม่มีข้อมูลให้สร้างรายงาน", variant: "destructive" })
      return
    }

    let exclusionFilesSummary = 'ไม่มี';
    if (exclusionFiles.length > 0) {
      exclusionFilesSummary = exclusionFiles.map(f => `${f.name}`).join(', ') + ` (${namesToExclude.size} คน)`
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
      `- ยกเว้นจากไฟล์: ${exclusionFilesSummary}`,
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

    if (saveToHistory) {
      const result = await sendFileToGoogleSheets(`รายงาน_${dutyName}.txt`, textContent);
      if (result.success) {
        toast({ title: "ส่งรายงานสำเร็จ", description: result.message });
      } else {
        toast({ title: "เกิดข้อผิดพลาด", description: result.message, variant: "destructive" });
      }
      
      saveExportHistory('report', `รายงาน_${dutyName}.txt`, textContent);
    }

    toast({ title: "สร้างรายงานสำเร็จ", description: `รายงาน ${dutyName} ถูกดาวน์โหลดแล้ว` })
  }

  const refreshData = () => {
    loadSheetData(true)
  }

  const handleBackWithConfirm = () => {
    if (dutyName || selectedPersons.length > 0) {
      if (window.confirm('คุณมีข้อมูลการทำงานที่ยังไม่ได้บันทึก หากออกจากหน้านี้ข้อมูลจะหายไป\n\nต้องการออกจากหน้านี้ใช่หรือไม่?')) {
        clearModuleState(MODULE_NAME)
        onBack()
      }
    } else {
      clearModuleState(MODULE_NAME)
      onBack()
    }
  }

  const clearCurrentState = () => {
    if (window.confirm('ต้องการล้างข้อมูลการทำงานทั้งหมดใช่หรือไม่?')) {
      setDutyName("")
      setSelectedPersons([])
      setExcludedPositions([])
      setExcludedClubs([])
      setStatMax(10)
      setCheckAllSheets(true)
      setExclusionFiles([])
      setExclusionSheetNames({})
      setSelectedExclusionSheets({})
      setNamesToExclude(new Set())
      clearModuleState(MODULE_NAME)
      toast({ title: "ล้างข้อมูลเรียบร้อย", description: "ข้อมูลการทำงานทั้งหมดถูกล้างแล้ว" })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex gap-2">
            <Button onClick={handleBackWithConfirm} variant="outline" className="text-white border-white/30 hover:bg-white/10 hover:text-white bg-transparent backdrop-blur-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับหน้าหลัก
            </Button>
            <Button onClick={clearCurrentState} variant="outline" className="text-red-400 border-red-400/30 hover:bg-red-400/10 hover:text-red-300 bg-transparent backdrop-blur-sm">
              <X className="h-4 w-4 mr-2" />
              ล้างข้อมูล
            </Button>
            </div>
          <div className="text-center order-first sm:order-none">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              จัดยอดพิธี
            </h1>
            <p className="text-slate-300 mt-2 text-sm sm:text-base">ระบบจัดการเวรพิธีและงานพิเศษ - เชื่อมต่อ Google Sheets</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="bg-yellow-500/90 text-white hover:bg-yellow-600"
              onClick={() => router.push(isAdmin ? "/ceremony-duty/manual?sheetName=Admin" : "/ceremony-duty/manual")}
            >
              จัดยอดด้วยตัวเอง
            </Button>
            <Button onClick={refreshData} variant="outline" size="sm" disabled={isLoadingData} className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm w-full sm:w-auto">
              <Database className={`h-4 w-4 mr-2 ${isLoadingData ? "animate-spin" : ""}`} />
              รีเฟรชข้อมูล
            </Button>
          </div>
  </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Badge className={`${connectionStatus === "connected" ? "bg-green-600" : connectionStatus === "error" ? "bg-red-600" : "bg-yellow-600"} text-white text-xs`}>
                {connectionStatus === "connected" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {connectionStatus === "connected" ? "เชื่อมต่อแล้ว" : connectionStatus === "error" ? "เชื่อมต่อล้มเหลว" : "กำลังเชื่อมต่อ"}
              </Badge>
              <span className="text-slate-300 text-xs sm:text-sm">
          ฐานข้อมูล: {sheetName === 'Admin' ? 'รวม' : sheetName}
                {' | '}ข้อมูลทั้งหมด: {allPersons.length} คน
              </span>
              {lastUpdated && (
                <span className="text-slate-400 text-xs sm:text-sm">อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString("th-TH")}</span>
              )}
            </div>

            <div className="text-slate-400 text-xs sm:text-sm">Database from Google Sheets</div>
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
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Label className="text-white font-medium text-sm sm:text-base">จำนวนคนแต่ละชั้นปี</Label>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {["1", "2", "3", "4", "5"].map((year) => (
                    <div key={year} className="flex items-center gap-2">
                      <Label htmlFor={`year-${year}-count`} className="text-white text-sm sm:text-base w-20">
                        ชั้นปีที่ {year}:
                      </Label>
                      <Input
                        id={`year-${year}-count`}
                        type="number"
                        min="0"
                        value={requiredByYear[year] === 0 ? "" : requiredByYear[year]}
                        onChange={(e) => {
                          const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setRequiredByYear(prev => ({ ...prev, [year]: value }));
                        }}
                        className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400 text-sm sm:text-base"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
      {isAdmin && (
  <Card className="mb-4 bg-slate-800/50 border-slate-700 shadow-xl">
          <CardHeader className="pb-2 flex flex-row items-center gap-4">
            <span className="font-medium text-white text-sm">กรองสังกัด:</span>
            <Button
              size="sm"
              variant="ghost"
              className="text-blue-200 hover:text-white"
              onClick={() => setSelectedAffiliations(allAffiliations)}
            >เลือกทั้งหมด</Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-200 hover:text-white"
              onClick={() => setSelectedAffiliations([])}
            >ล้างทั้งหมด</Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allAffiliations.map(aff => (
              <label key={aff} className="flex items-center gap-1 cursor-pointer bg-blue-800/60 rounded px-2 py-1 text-white border border-blue-700 hover:bg-blue-700 transition">
                <Checkbox
                  id={`affiliation-${aff}`}
                  checked={selectedAffiliations.includes(aff)}
                  onCheckedChange={checked => {
                    setSelectedAffiliations(prev =>
                      checked ? [...prev, aff] : prev.filter(a => a !== aff)
                    );
                  }}
                  className="border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <span className="text-xs sm:text-sm truncate max-w-[80px]">{aff}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

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
                    <div className="mt-3 pt-3 border-t border-slate-600"><Badge className="bg-red-600 text-xs">ยกเว้น {excludedPositions.length} หน้าที่</Badge></div>
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
                        <div className="flex items-center gap-2 mt-2">
                          <input id="save-to-history" type="checkbox" checked={saveToHistory} onChange={e => setSaveToHistory(e.target.checked)} className="accent-blue-500 w-4 h-4" />
                          <label htmlFor="save-to-history" className="text-xs text-slate-300 cursor-pointer select-none">บันทึกไฟล์นี้ไว้ในประวัติยอด (แสดงใน Dashboard)</label>
                        </div>
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
                    <div className="overflow-x-auto w-full max-w-full rounded-lg border border-slate-700 p-2">
                      <Table className="min-w-full w-full max-w-full text-xs table-auto border-collapse break-words">
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
                          {selectedPersons.map((person: PersonData, index: number) => (
                            <TableRow key={person.ลำดับ || index} className={index % 2 === 0 ? "bg-slate-800/60" : "bg-slate-900/60"}>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-pre-line break-words text-center text-white border-b border-slate-700">{toThaiNumber(index + 1)}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-left text-white border-b border-slate-700">{person.ยศ || '-'} {person.ชื่อ || '-'} {person.สกุล || '-'}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.ชั้นปีที่ || '-'}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.ตอน || '-'}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.ตำแหน่ง || '-'}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.สังกัด || '-'}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700">{person.เบอร์โทรศัพท์ || '-'}</TableCell>
                              <TableCell className="px-1 sm:px-2 py-1 text-xs whitespace-nowrap text-center text-white border-b border-slate-700"><Badge className="bg-blue-600 text-white text-xs">{person.สถิติโดนยอด || '-'}</Badge></TableCell>
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
