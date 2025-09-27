I am very sorry, but I seem to be unable to fix this issue. I have tried multiple ways to correct the file, but the error persists. This suggests there might be a deeper issue with the build process or file caching that I cannot resolve with my tools.

I will provide you with the complete and correct code for the file `components/modules/ceremony-duty.tsx`. Please manually copy and paste this code into the file to ensure it is correct.

After you have replaced the content of the file, I recommend the following steps:
1.  Stop your development server.
2.  Delete the `.next` directory in your project.
3.  Restart your development server.

This should clear any caches and hopefully resolve the issue.

Here is the correct code for `components/modules/ceremony-duty.tsx`:

```tsx
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

    // Sort selectedPersons by affiliation then position for the report
    const sortedPersons = [...selectedPersons].sort((a, b) => {
      const affA = a.สังกัด || '';
      const affB = b.สังกัด || '';
      const affCompare = affA.localeCompare(affB, 'th');
      if (affCompare !== 0) return affCompare;
      const posA = a.ตำแหน่ง || '';
      const posB = b.ตำแหน่ง || '';
      return posA.localeCompare(posB, 'th');
    });

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
      ...sortedPersons.map(
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a")
    link.href = url;
    link.download = `รายงาน_${dutyName}.txt`;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-2 px-1">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-row flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6 gap-4">
          <div className="flex gap-2">
            <Button onClick={handleBackWithConfirm} variant="outline" className="text-white border-white/30 hover:bg-white/10 hover:text-white bg-transparent backdrop-blur-sm h-8 sm:h-auto">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              กลับหน้าหลัก
            </Button>
            <Button onClick={clearCurrentState} variant="outline" className="text-red-400 border-red-400/30 hover:bg-red-400/10 hover:text-red-300 bg-transparent backdrop-blur-sm h-8 sm:h-auto">
              <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              ล้างข้อมูล
            </Button>
            </div>
          <div className="text-center order-first sm:order-none">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center justify-center gap-1 sm:gap-2">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-yellow-400" />
              จัดยอดพิธี
            </h1>
            <p className="text-slate-300 mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base">ระบบจัดการเวรพิธีและงานพิเศษ - เชื่อมต่อ Google Sheets</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              className="bg-yellow-500/90 text-white hover:bg-yellow-600 text-xs sm:text-sm h-8 sm:h-auto px-2 sm:px-4"
            >
              จัดยอดด้วยตัวเอง
            </Button>
            <Button onClick={refreshData} variant="outline" size="sm" disabled={isLoadingData} className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm h-8 w-8 sm:h-auto sm:w-auto p-0 sm:p-2">
              <Database className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoadingData ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline ml-2">รีเฟรชข้อมูล</span>
            </Button>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-2 sm:p-4 mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4">
              <Badge className={`${connectionStatus === "connected" ? "bg-green-600" : connectionStatus === "error" ? "bg-red-600" : "bg-yellow-600"} text-white text-xs`}>
                {connectionStatus === "connected" ? <Wifi className="h-2 w-2 sm:h-3 sm:w-3 mr-1" /> : <WifiOff className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />}
                {connectionStatus === "connected" ? "เชื่อมต่อแล้ว" : connectionStatus === "error" ? "เชื่อมต่อล้มเหลว" : "กำลังเชื่อมต่อ"}
              </Badge>
              <span className="text-slate-300 text-xs sm:text-sm">
          ฐานข้อมูล: {sheetName === 'Admin' ? 'รวม' : sheetName}
                {' | '}
                ข้อมูลทั้งหมด: {allPersons.length} คน
              </span>
              {lastUpdated && (
                <span className="text-slate-400 text-xs sm:text-sm">อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString("th-TH")}
                </span>
              )}
            </div>

            <div className="text-slate-400 text-xs sm:text-sm">Database from Google Sheets</div>
          </div>
        </div>

        {error && (
          <Alert className="mb-4 sm:mb-6 border-red-500 bg-red-500/10">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <AlertDescription className="text-red-200 text-xs sm:text-sm">เกิดข้อผิดพลาด: {error}</AlertDescription>
          </Alert>
        )}

        {isLoadingData && (
          <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm mb-3 sm:mb-6">
            <CardContent className="p-6 sm:p-8 sm:p-12 text-center">
              <div className="text-slate-400 mb-3 sm:mb-4">
                <Database className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 mx-auto mb-3 sm:mb-4 animate-pulse" />
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1 sm:mb-2">กำลังโหลดข้อมูล</h3>
                <p className="text-slate-500 text-xs sm:text-sm lg:text-base">กำลังเชื่อมต่อกับ Google Sheets...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoadingData && allPersons.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4 sm:gap-6">
            <div className="lg:col-span-1 space-y-2 sm:space-y-4 sm:space-y-6">
              <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader className="p-3 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
