'use client';
import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Users, Settings, CheckSquare, Square, FileCheck, FileText, BarChart3, X, Download, Shuffle, Database, Award, AlertCircle, Wifi, WifiOff, PlusCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import type { BorderStyle } from "exceljs";
import { saveModuleState, loadModuleState, clearModuleState, ModuleState } from "@/lib/state-persistence";
import { loadFromCache, saveToCache } from "@/lib/ccache";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserSession } from "@/hooks/useUserSession";
import { useIsMobile } from "@/hooks/use-mobile";
import { PersonAutocomplete } from "./person-autocomplete";


// Helper to convert Thai numerals to Arabic numerals
function toArabic(str: string) {
  return (str || '').replace(/[๐-๙]/g, (d: string) => "0123456789"["๐๑๒๓๔๕๖๗๘๙".indexOf(d)]);
}

// Define the types for the data
interface Person {
  ลำดับ: string;
  ยศ: string;
  ชื่อ: string;
  สกุล: string;
  ชั้นปีที่: string;
  ตอน: string;
  ตำแหน่ง: string;
  สังกัด: string;
  เบอร์โทรศัพท์: string;
  หน้าที่?: string;
  ชมรม?: string;
  สถิติโดนยอด: string;
}

interface ApiResponse {
  success: boolean;
  data?: Person[];
  error?: string;
  sheetName?: string; // Add this field
}

// Define the type for a row in the table
type RowData = Partial<Person> & { ลำดับ: string; ยศ?: string; };

// Define the state for persistence
interface CeremonyDutyManualState extends ModuleState {
  dutyName: string;
  requiredByYear: { [year: string]: number };
  rows: RowData[];
  saveToHistory: boolean;
  selectedAffiliations: string[];
  excludedPositions: string[];
  excludedClubs: string[];
  statMax: number;
  checkAllSheets: boolean;
}

const MODULE_NAME = 'ceremony-duty-manual';

function CeremonyDutyManualInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sheetName = searchParams.get('sheetName') || 'รวม';
  const [displayedSheetName, setDisplayedSheetName] = useState(sheetName === 'Admin' ? 'รวม' : sheetName);
  const { toast } = useToast();

  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [dutyName, setDutyName] = useState("");
  const [requiredByYear, setRequiredByYear] = useState<{ [year: string]: number }>({
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0
  });
  const [rows, setRows] = useState<RowData[]>([
    { ลำดับ: "1", ยศ: "นนร.", ชื่อ: "", สกุล: "" },
  ]);

  const [saveToHistory, setSaveToHistory] = useState(false);
  const [selectedAffiliations, setSelectedAffiliations] = useState<string[]>([]);
  const [exclusionFiles, setExclusionFiles] = useState<File[]>([]);
  const [exclusionSheetNames, setExclusionSheetNames] = useState<{ [filename: string]: string[] }>({});
  const [checkAllSheets, setCheckAllSheets] = useState(true);
  const [selectedExclusionSheets, setSelectedExclusionSheets] = useState<{ [filename: string]: string[] }>({});
  const [namesToExclude, setNamesToExclude] = useState<Set<string>>(new Set());
  const [excludedPositions, setExcludedPositions] = useState<string[]>([]);
  const [excludedClubs, setExcludedClubs] = useState<string[]>([])
  const [statDomain, setStatDomain] = useState<[number, number]>([0, 10]);
  const [statMax, setStatMax] = useState(10);

  const { user, isLoading: isLoadingUser, isError: isErrorUser } = useUserSession();
  console.log("[CeremonyDutyManual] User from session:", user);
  console.log("[CeremonyDutyManual] User role:", user?.role);
  console.log("[CeremonyDutyManual] User role (lowercase):", user?.role?.toLowerCase());
  const canAccessPage = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'oat' || user?.role?.toLowerCase() === 'user';
  const isSuperAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'oat';
  console.log("[CeremonyDutyManual] canAccessPage:", canAccessPage);
  console.log("[CeremonyDutyManual] isSuperAdmin:", isSuperAdmin);

  const [isStateLoaded, setIsStateLoaded] = useState(false);

  const allAffiliations = useMemo(() => {
    const set = new Set<string>();
    allPersons.forEach((p: Person) => {
      if (p.สังกัด && typeof p.สังกัด === "string" && p.สังกัด.trim() && !/^๐-๙$/.test(p.สังกัด.trim())) {
        set.add(p.สังกัด.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [allPersons]);

  useEffect(() => {
    setSelectedAffiliations(allAffiliations);
  }, [allAffiliations]);

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

  useEffect(() => {
    if (allPersons.length > 0) {
      const stats = allPersons.map(p => parseInt(p.สถิติโดนยอด, 10) || 0);
      const min = Math.min(...stats);
      const max = Math.max(...stats);
      setStatDomain([min, max]);
      setStatMax(max);
    }
  }, [allPersons]);

  const saveCurrentState = () => {
    if (!isStateLoaded) return;
    const state: CeremonyDutyManualState = {
      dutyName,
      requiredByYear,
      rows,
      saveToHistory,
      selectedAffiliations,
      excludedPositions,
      excludedClubs,
      statMax,
      checkAllSheets,
    };
    console.log('[CeremonyDutyManual] Saving state:', state);
    saveModuleState(MODULE_NAME, state);
  };

  const loadSavedState = () => {
    const savedState = loadModuleState(MODULE_NAME);
    if (savedState) {
      console.log('[CeremonyDutyManual] Loading saved state:', savedState);
      if (savedState.dutyName) setDutyName(savedState.dutyName);
      if (savedState.requiredByYear) setRequiredByYear(savedState.requiredByYear);
      if (savedState.rows && savedState.rows.length > 0) {
        setRows(savedState.rows);
      } else {
        setRows([{ ลำดับ: "1", ยศ: "นนร.", ชื่อ: "", สกุล: "" }]);
      }
      if (typeof savedState.saveToHistory === 'boolean') setSaveToHistory(savedState.saveToHistory);
      if (savedState.selectedAffiliations) setSelectedAffiliations(savedState.selectedAffiliations);
      if (savedState.excludedPositions) setExcludedPositions(savedState.excludedPositions);
      if (savedState.excludedClubs) setExcludedClubs(savedState.excludedClubs);
      if (savedState.statMax) setStatMax(savedState.statMax);
      if (typeof savedState.checkAllSheets === 'boolean') setCheckAllSheets(savedState.checkAllSheets);
      console.log('[CeremonyDutyManual] State loaded successfully');
    } else {
      console.log('[CeremonyDutyManual] No saved state found');
    }
    setIsStateLoaded(true);
  };

  const loadSheetData = async (force: boolean = false) => {
    setIsLoadingData(true);
    setError(null);
    const cacheKey = `ceremony-data-${sheetName}`;

    if (!force) {
      const cachedData = loadFromCache<Person[]>(cacheKey);
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
      const response = await fetch(`/api/sheets/ceremony?sheetName=${encodeURIComponent(sheetName)}`);
      const result: ApiResponse = await response.json();
      if (result.success && result.data) {
        const dataRows = result.data.slice(1);
        setAllPersons(dataRows);
        saveToCache(cacheKey, dataRows);
        setConnectionStatus("connected");
        setLastUpdated(new Date());
        // Update displayedSheetName from API response
        if (result.sheetName) {
          setDisplayedSheetName(result.sheetName === 'all_sheets' ? 'รวม' : result.sheetName);
        }
        toast({ title: "เชื่อมต่อสำเร็จ", description: `โหลดข้อมูล ${dataRows.length} คน จาก ${result.sheetName === 'all_sheets' ? 'รวม' : result.sheetName}` });
      } else {
        throw new Error(result.error || "Failed to load data");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setConnectionStatus("error");
      toast({ title: "เกิดข้อผิดพลาดในการเชื่อมต่อ", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadSheetData();
  }, [sheetName]);

  useEffect(() => {
    if (!isLoadingData && allPersons.length > 0) {
      loadSavedState();
    }
  }, [isLoadingData, allPersons]);

  useEffect(() => {
    if (isStateLoaded) {
      saveCurrentState();
    }
  }, [dutyName, requiredByYear, rows, saveToHistory, selectedAffiliations, excludedPositions, excludedClubs, statMax, checkAllSheets, isStateLoaded]);

  const normalizeName = (firstName?: string, lastName?: string): string => {
    const first = (firstName || "").toString().trim()
    const last = (lastName || "").toString().trim()
    return `${first} ${last}`.trim()
  }

  const handlePersonSelect = (idx: number, person: Person | null) => {
    setRows(prev => {
      const newRows = [...prev];
      if (person) {
        // A person was selected from autocomplete
        newRows[idx] = { ...newRows[idx], ...person };
      } else {
        // Selection was cleared
        const clearedRow: RowData = { ลำดับ: newRows[idx].ลำดับ, ยศ: newRows[idx].ยศ, ชื่อ: "", สกุล: "" };
        newRows[idx] = clearedRow;
      }
      return newRows;
    });
  };

  const handleNameChange = (idx: number, field: "ยศ", value: string) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[idx] = { ...newRows[idx], [field]: value };
      return newRows;
    });
  };

  const addRow = () => {
    setRows(prev => [...prev, { ลำดับ: (prev.length + 1).toString(), ยศ: "นนร.", ชื่อ: "", สกุล: "" }]);
  };

  const removeRow = (idx: number) => {
    setRows(prev => {
        const newRows = prev.filter((_, index) => index !== idx);
        return newRows.map((row, index) => ({ ...row, ลำดับ: (index + 1).toString() }));
    });
  };

  const handleAssignDuty = () => {
    setIsAssigning(true);
    if (isLoadingData) {
        toast({ title: "กรุณารอให้โหลดข้อมูลเสร็จสิ้น", variant: "destructive" });
        setIsAssigning(false);
        return;
    }

    let availablePersons = [...allPersons];
    
    const assignedNames = new Set(rows.filter(r => r.ชื่อ && r.สกุล).map(r => normalizeName(r.ชื่อ, r.สกุล)));
    availablePersons = availablePersons.filter(p => !assignedNames.has(normalizeName(p.ชื่อ, p.สกุล)));

    if (namesToExclude.size > 0) {
        availablePersons = availablePersons.filter(p => !namesToExclude.has(normalizeName(p.ชื่อ, p.สกุล)));
    }
    availablePersons = availablePersons.filter(p => {
        const stat = parseInt(p.สถิติโดนยอด, 10) || 0;
        return stat >= statDomain[0] && stat <= statMax;
    });
    const normalize = (str?: string) => (str ? str.trim().toLowerCase() : "");
    if (excludedPositions.length > 0) {
        const normPositions = excludedPositions.map(normalize);
        availablePersons = availablePersons.filter(p => !normPositions.includes(normalize(p.หน้าที่)));
    }
    if (excludedClubs.length > 0) {
        const normClubs = excludedClubs.map(normalize);
        availablePersons = availablePersons.filter(p => !normClubs.includes(normalize(p.ชมรม)));
    }
    if (selectedAffiliations.length < allAffiliations.length) {
        availablePersons = availablePersons.filter(p => selectedAffiliations.includes(p.สังกัด));
    }

    const needsByYear = { ...requiredByYear };

    const newlyAssigned: Person[] = [];
    Object.keys(needsByYear).sort((a,b) => Number(b) - Number(a)).forEach(year => {
      const needed = needsByYear[year];
      if (needed > 0) {
        let candidates = availablePersons.filter(p => toArabic(p.ชั้นปีที่) === year);
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const assignedForYear = candidates.slice(0, needed);
        newlyAssigned.push(...assignedForYear);
        const assignedForYearNames = new Set(assignedForYear.map(p => normalizeName(p.ชื่อ, p.สกุล)));
        availablePersons = availablePersons.filter(p => !assignedForYearNames.has(normalizeName(p.ชื่อ, p.สกุล)));
      }
    });

    let finalRows: RowData[] = [
      ...rows.filter(r => r.ชื่อ && r.สกุล),
      ...newlyAssigned.map(p => ({ ...p, ลำดับ: p.ลำดับ || "0" }))
    ];

    finalRows.sort((a, b) => {
        const yearA = parseInt(toArabic(a.ชั้นปีที่ || '0'), 10);
        const yearB = parseInt(toArabic(b.ชั้นปีที่ || '0'), 10);
        return yearB - yearA;
    });

    finalRows = finalRows.map((row, idx) => ({ ...row, ลำดับ: (idx + 1).toString() }));

    setRows(finalRows);
    toast({ title: "จัดยอดเรียบร้อยแล้ว", description: `เพิ่มรายชื่อใหม่ ${newlyAssigned.length} คน` });
    setIsAssigning(false);
  };

  const toThaiNumber = (num: number): string => {
    const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"]
    return num.toString().split("").map((digit) => thaiDigits[parseInt(digit, 10)]).join("")
  }

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
      count: rows.length,
      content: content || null,
    };
    const next = [newEntry, ...prev].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(next));
  }

  const exportToExcelXlsx = async () => {
    if (rows.length === 0 || rows.every(r => !r.ชื่อ)) {
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
    ws.getCell("A1").border = { top: thin, left: thin, right: thin, bottom: thin };

    ws.mergeCells("A2:J2");
    ws.getCell("A2").border = { top: thin, left: thin, right: thin, bottom: thin };

    ws.mergeCells("B3:D3");
    ws.getCell("B3").value = "ยศ ชื่อ-สกุล";
    ws.getCell("A3").value = "ลำดับ";
    ws.getCell("E3").value = "ชั้นปีที่";
    ws.getCell("F3").value = "ตอน";
    ws.getCell("G3").value = "ตำแหน่ง";
    ws.getCell("H3").value = "สังกัด";
    ws.getCell("I3").value = "เบอร์โทรศัพท์";
    ws.getCell("J3").value = "หมายเหตุ";

    for (let col = 1; col <= 10; col++) {
        const cell = ws.getCell(3, col);
        cell.font = mainFont;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: thin, left: thin, right: thin, bottom: thin };
    }

    rows.forEach((person, idx) => {
        const rowIdx = idx + 4;
        const row = ws.getRow(rowIdx);
        row.values = [
            toThaiNumber(idx + 1),
            person.ยศ,
            person.ชื่อ,
            person.สกุล,
            person.ชั้นปีที่,
            person.ตอน,
            person.ตำแหน่ง,
            person.สังกัด,
            person.เบอร์โทรศัพท์,
            ""
        ];
        row.eachCell((cell, colNumber) => {
            cell.font = mainFont;
            cell.alignment = { horizontal: colNumber >= 3 && colNumber <= 4 ? 'left' : 'center', vertical: 'middle' };
            cell.border = { top: thin, left: thin, right: thin, bottom: thin };
        });
    });

    ws.getColumn(1).width = 6; ws.getColumn(2).width = 5; ws.getColumn(3).width = 15; ws.getColumn(4).width = 15; ws.getColumn(5).width = 8; ws.getColumn(6).width = 8; ws.getColumn(7).width = 20; ws.getColumn(8).width = 15; ws.getColumn(9).width = 15; ws.getColumn(10).width = 15;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${dutyName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (saveToHistory) {
      saveExportHistory('excel', `${dutyName}.xlsx`);
    }
    toast({ title: "ส่งออกไฟล์ .xlsx สำเร็จ", description: `ไฟล์ ${dutyName}.xlsx ถูกดาวน์โหลดแล้ว` });
  };

  const createReport = async () => {
    if (rows.length === 0 || rows.every(r => !r.ชื่อ)) {
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
      `จำนวนคนที่เลือก: ${rows.length} คน`,
      `ฐานข้อมูล: ${sheetName}`,
      "",
      "เงื่อนไขการกรอง:",
      `- ยกเว้นหน้าที่: ${excludedPositions.length > 0 ? excludedPositions.join(", ") : "ไม่มี"}`,
      `- ยกเว้นชมรม: ${excludedClubs.length > 0 ? excludedClubs.join(", ") : "ไม่มี"}`,
      `- ยกเว้นจากไฟล์: ${exclusionFilesSummary}`,
      "",
      "รายชื่อ:",
      ...rows.map(
        (person, index) =>
          `${index + 1}. ${person.ยศ || ''} ${person.ชื่อ} ${person.สกุล} (${person.สังกัด || 'N/A'}) - สถิติ: ${person.สถิติโดนยอด || 'N/A'}`,
      ),
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
      saveExportHistory('report', `รายงาน_${dutyName}.txt`, textContent);
    }

    toast({ title: "สร้างรายงานสำเร็จ", description: `รายงาน ${dutyName} ถูกดาวน์โหลดแล้ว` })
  }

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

  const refreshData = () => {
    loadSheetData(true);
  };

  const clearCurrentState = () => {
    if (window.confirm('ต้องการล้างข้อมูลการทำงานทั้งหมดใช่หรือไม่?')) {
      setDutyName("");
      setRows([{ ลำดับ: "1", ยศ: "นนร.", ชื่อ: "", สกุล: "" }]);
      setRequiredByYear({ "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 });
      setExcludedPositions([]);
      setExcludedClubs([]);
      setStatMax(10);
      setCheckAllSheets(true);
      setExclusionFiles([]);
      setExclusionSheetNames({});
      setSelectedExclusionSheets({});
      setNamesToExclude(new Set());
      clearModuleState(MODULE_NAME);
      toast({ title: "ล้างข้อมูลเรียบร้อย", description: "ข้อมูลการทำงานทั้งหมดถูกล้างแล้ว" });
    }
  };

  if (isLoadingData) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-center">
            <div className="text-center">
                <Database className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-semibold mb-2">กำลังโหลดข้อมูล...</h3>
            </div>
        </div>
    );
  }

  if (isLoadingUser) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-center">
            <div className="text-center">
                <Database className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-semibold mb-2">กำลังโหลดข้อมูลผู้ใช้...</h3>
            </div>
        </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center text-red-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">ไม่พบข้อมูลผู้ใช้</h3>
          <p>กรุณาเข้าสู่ระบบเพื่อใช้งานฟีเจอร์นี้</p>
        </div>
      </div>
    );
  }

  if (error || isErrorUser) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-center">
            <div className="text-center text-red-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">เกิดข้อผิดพลาด</h3>
                <p>{error || "ไม่สามารถโหลดข้อมูลผู้ใช้ได้"}</p>
            </div>
        </div>
    );
  }

  const hasPeople = rows.length > 0 && rows.some(r => r.ชื่อ);

  console.log("[CeremonyDutyManual] Final canAccessPage check before render:", canAccessPage);
  if (!canAccessPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center text-red-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">ไม่มีสิทธิ์เข้าถึง</h3>
          <p>ฟีเจอร์นี้สำหรับผู้ดูแลระบบเท่านั้น</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
            <div className="flex gap-2">
                <Button onClick={() => router.back()} variant="outline" className="text-white border-white/30 hover:bg-white/10 hover:text-white bg-transparent backdrop-blur-sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    กลับ
                </Button>
                <Button onClick={clearCurrentState} variant="outline" className="text-red-400 border-red-400/30 hover:bg-red-400/10 hover:text-red-300 bg-transparent backdrop-blur-sm">
                    <X className="h-4 w-4 mr-2" />
                    ล้างข้อมูล
                </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
                จัดยอดพิธี (ด้วยตัวเอง)
            </h1>
            <Button onClick={refreshData} variant="outline" size="sm" disabled={isLoadingData} className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm w-full sm:w-auto">
                <Database className={`h-4 w-4 mr-2 ${isLoadingData ? "animate-spin" : ""}`} />
                รีเฟรชข้อมูล
            </Button>
        </div>

        {/* Connection Status */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Badge className={`${connectionStatus === "connected" ? "bg-green-600" : connectionStatus === "error" ? "bg-red-600" : "bg-yellow-600"} text-white text-xs`}>
                {connectionStatus === "connected" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {connectionStatus === "connected" ? "เชื่อมต่อแล้ว" : connectionStatus === "error" ? "เชื่อมต่อล้มเหลว" : "กำลังเชื่อมต่อ"}
              </Badge>
              <span className="text-slate-300 text-xs sm:text-sm">
                ข้อมูลทั้งหมด: {allPersons.length} คน
              </span>
              {lastUpdated && (
                <span className="text-slate-400 text-xs sm:text-sm">อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString("th-TH")}</span>
              )}
            </div>
            <div className="text-slate-400 text-xs sm:text-sm">Manual Assignment Mode</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column: Filters & Settings */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Settings className="h-5 w-5 text-blue-400" />ข้อมูลพื้นฐาน</CardTitle></CardHeader>
                <CardContent>
                    <Label htmlFor="duty-name" className="text-white font-medium text-sm">ชื่อยอด</Label>
                    <Input id="duty-name" value={dutyName} onChange={(e) => setDutyName(e.target.value)} placeholder="กรอกชื่อยอด" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400 mt-2 text-sm"/>
                </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-blue-400"/>สุ่มเพิ่มตามจำนวน</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {["1", "2", "3", "4", "5"].map((year) => (
                    <div key={year} className="flex items-center gap-2">
                      <Label htmlFor={`year-${year}-count`} className="text-white text-sm w-20">ชั้นปีที่ {year}:</Label>
                      <Input
                        id={`year-${year}-count`}
                        type="number"
                        min="0"
                        value={requiredByYear[year] === 0 ? "" : requiredByYear[year]}
                        onChange={(e) => {
                          const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setRequiredByYear(prev => ({ ...prev, [year]: value }));
                        }}
                        className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400 text-sm"
                      />
                    </div>
                  ))}
                </CardContent>
            </Card>

            {isSuperAdmin && (
                <Card className="bg-slate-800/50 border-slate-700 shadow-xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-white text-base">กรองสังกัด</CardTitle>
                        <div>
                            <Button size="sm" variant="ghost" className="text-blue-200 hover:text-white" onClick={() => setSelectedAffiliations(allAffiliations)}>ทั้งหมด</Button>
                            <Button size="sm" variant="ghost" className="text-red-200 hover:text-white" onClick={() => setSelectedAffiliations([])}>ล้าง</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {allAffiliations.map(aff => (
                        <label key={aff} className="flex items-center gap-1 cursor-pointer bg-blue-800/60 rounded px-2 py-1 text-white border border-blue-700 hover:bg-blue-700 transition">
                            <Checkbox id={`affiliation-${aff}`} checked={selectedAffiliations.includes(aff)} onCheckedChange={checked => { setSelectedAffiliations(prev => checked ? [...prev, aff] : prev.filter(a => a !== aff)); }} className="border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
                            <span className="text-xs truncate max-w-[80px]">{aff}</span>
                        </label>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader><CardTitle className="flex items-center gap-2 text-white"><FileCheck className="h-5 w-5 text-green-400" />ไม่เลือกจากไฟล์ Excel</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="exclusion-file" className="text-white font-medium text-sm">อัปโหลดไฟล์ (.xlsx)</Label>
                    <Input id="exclusion-file" type="file" accept=".xlsx" multiple onChange={handleExclusionFileChange} className="bg-slate-700/50 border-slate-600 text-white mt-2 file:bg-slate-600 file:text-white file:border-0"/>
                  </div>
                  {exclusionFiles.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-700 mt-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="check-all-sheets" className="text-white font-medium text-sm">ตรวจสอบทุกชีท</Label>
                            <Switch id="check-all-sheets" checked={checkAllSheets} onCheckedChange={setCheckAllSheets} />
                        </div>
                        {exclusionFiles.map((file) => (
                          <div key={file.name} className="border border-slate-600 rounded-lg p-2 bg-slate-700/40 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="h-4 w-4 text-green-400 flex-shrink-0" />
                                <span className="text-white text-xs font-medium truncate">{file.name}</span>
                              </div>
                              <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/20 h-6 w-6" title="ลบไฟล์นี้"
                                onClick={() => {
                                  setExclusionFiles(prev => prev.filter(f => f.name !== file.name))
                                  setExclusionSheetNames(prev => { const cp = { ...prev }; delete cp[file.name]; return cp })
                                  setSelectedExclusionSheets(prev => { const cp = { ...prev }; delete cp[file.name]; return cp })
                                }}>
                                <X className="w-4 h-4" />
                              </Button>
                          </div>
                        ))}
                        <div className="mt-2 pt-2 border-t border-slate-600">
                            <Badge className="bg-green-600 text-xs">พบ {namesToExclude.size} ชื่อที่จะถูกยกเว้น</Badge>
                        </div>
                    </div>
                  )}
                </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-red-400" />ไม่เลือกคนที่มีหน้าที่</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleSelectAllPositions} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      {excludedPositions.length === positions.length ? 'ยกเลิก' : 'เลือกทั้งหมด'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    {positions.map((position) => (
                      <div key={position} className="flex items-center space-x-2">
                        <Checkbox id={`position-${position}`} checked={excludedPositions.includes(position)} onCheckedChange={(checked) => handlePositionChange(position, checked as boolean)} className="border-slate-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"/>
                        <Label htmlFor={`position-${position}`} className="text-white text-xs cursor-pointer">{position}</Label>
                      </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-orange-400" />ไม่เลือกชมรม</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleSelectAllClubs} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      {excludedClubs.length === clubs.length ? 'ยกเลิก' : 'เลือกทั้งหมด'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    {clubs.map((club) => (
                      <div key={club} className="flex items-center space-x-2">
                        <Checkbox id={`club-${club}`} checked={excludedClubs.includes(club)} onCheckedChange={(checked) => handleClubChange(club, checked as boolean)} className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"/>
                        <Label htmlFor={`club-${club}`} className="text-white text-xs cursor-pointer">{club}</Label>
                      </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader><CardTitle className="flex items-center gap-2 text-white"><BarChart3 className="h-5 w-5 text-blue-400" />เลือกค่าสูงสุดของสถิติ</CardTitle></CardHeader>
                <CardContent>
                    <Slider min={statDomain[0]} max={statDomain[1]} value={[statMax]} onValueChange={([val]) => setStatMax(val)} step={1} />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>ต่ำสุด: {statDomain[0]}</span>
                      <span>สูงสุด: {statMax}</span>
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* Right Column: Main Table & Actions */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                        <Button onClick={handleAssignDuty} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white w-full sm:w-auto" disabled={isAssigning || !dutyName.trim()}>
                            {isAssigning ? <Shuffle className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />} 
                            สุ่มเพิ่มตามจำนวนที่ระบุ
                        </Button>
                        {hasPeople && (
                        <>
                            <Button onClick={createReport} className="bg-gradient-to-r from-green-600 to-green-700 text-white w-full sm:w-auto">
                                <FileText className="mr-2 h-4 w-4" />สร้างรายงาน
                            </Button>
                            <Button onClick={exportToExcelXlsx} className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white w-full sm:w-auto">
                                <Download className="mr-2 h-4 w-4" />ดาวน์โหลด Excel
                            </Button>
                        </>
                        )}
                    </div>
                    {hasPeople && (
                        <div className="flex items-center gap-2 my-4 justify-center">
                            <input id="save-to-history" type="checkbox" checked={saveToHistory} onChange={e => setSaveToHistory(e.target.checked)} className="accent-blue-500 w-4 h-4" />
                            <label htmlFor="save-to-history" className="text-xs text-slate-300 cursor-pointer select-none">บันทึกไฟล์นี้ไว้ในประวัติยอด</label>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">รายชื่อ (ใส่ชื่อ-สกุล เพื่อล็อคคน)</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="overflow-x-auto w-full max-w-full rounded-lg border border-slate-700 p-1">
                <Table className="min-w-full text-[11px]">
                  <TableHeader>
                    <TableRow className="bg-slate-700/80 hover:bg-slate-700/70 border-b-slate-600">
                      <TableHead className="px-1 py-2 text-center text-white font-semibold w-12 whitespace-nowrap">ลำดับ</TableHead>
                      <TableHead className="px-1 py-2 text-center text-white font-semibold whitespace-nowrap w-14">ยศ</TableHead>
                      <TableHead className="px-1 py-2 text-center text-white font-semibold whitespace-nowrap min-w-[240px]" colSpan={2}>ชื่อ-สกุล</TableHead>
                      <TableHead className="px-1 py-2 text-center text-white font-semibold whitespace-nowrap">ชั้นปี</TableHead>
                      <TableHead className="px-1 py-2 text-center text-white font-semibold whitespace-nowrap">ตอน</TableHead>
                      <TableHead className="px-1 py-2 text-center text-white font-semibold whitespace-nowrap">ตำแหน่ง</TableHead>
                      <TableHead className="px-1 py-2 text-center text-white font-semibold whitespace-nowrap">สังกัด</TableHead>
                      <TableHead className="px-1 py-2 text-center text-white font-semibold whitespace-nowrap">สถิติ</TableHead>
                      <TableHead className="px-1 py-2 text-right text-white font-semibold w-10 whitespace-nowrap"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx} className={`border-b border-slate-700 ${idx % 2 === 0 ? "bg-slate-800/60" : "bg-slate-900/60"}`}>
                        <TableCell className="text-center align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{toThaiNumber(idx + 1)}</TableCell>
                        <TableCell className="px-1 py-1 whitespace-nowrap">
                          <Input value={row.ยศ || ''} onChange={e => handleNameChange(idx, "ยศ", e.target.value)} placeholder="ยศ" className="bg-transparent border-slate-600 text-white w-full text-[4px] h-7" />
                        </TableCell>
                        <TableCell className="px-1 py-1 whitespace-nowrap" colSpan={2}>
                            <PersonAutocomplete
                                people={allPersons}
                                value={row.ชื่อ ? row as Person : null}
                                onSelect={(person) => handlePersonSelect(idx, person)}
                            />
                        </TableCell>
                        <TableCell className="text-center align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{row.ชั้นปีที่}</TableCell>
                        <TableCell className="text-center align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{row.ตอน}</TableCell>
                        <TableCell className="text-left align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{row.ตำแหน่ง}</TableCell>
                        <TableCell className="text-left align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{row.สังกัด}</TableCell>
                        <TableCell className="text-center align-middle px-1 py-1 whitespace-nowrap">
                          {row.สถิติโดนยอด && <Badge variant="secondary" className="text-[11px]">{row.สถิติโดนยอด}</Badge>}
                        </TableCell>
                         <TableCell className="text-right align-middle px-1 py-1 whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} className="text-red-400 hover:bg-red-500/20 h-7 w-7">
                              <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                      <TableRow className="bg-slate-900/50">
                          <TableCell colSpan={10} className="p-2 text-right">
                              <Button onClick={addRow} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                                  <PlusCircle className="h-4 w-4 mr-2"/>
                                  เพิ่มแถว
                              </Button>
                          </TableCell>
                      </TableRow>
                  </TableBody>
                </Table>
              </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CeremonyDutyManual() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-center">
                <div className="text-center">
                    <Database className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-xl font-semibold mb-2">กำลังโหลด...</h3>
                </div>
            </div>
        }>
            <CeremonyDutyManualInternal />
        </Suspense>
    )
}