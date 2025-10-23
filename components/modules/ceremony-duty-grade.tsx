'use client';
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Settings, FileCheck, FileText, BarChart3, X, Download, Shuffle, Database, Award, AlertCircle, Wifi, WifiOff, PlusCircle, Check, ChevronsUpDown } from "lucide-react";
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
import { Alert } from "@/components/ui/alert";
import { useUserSession } from "@/hooks/useUserSession";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Helper to convert Thai numerals to Arabic numerals
function toArabic(str: string) {
  return (str || '').replace(/[๐-๙]/g, (d: string) => "0123456789"["๐๑๒๓๔๕๖๗๘๙".indexOf(d)]);
}

// Define the types for the data to match the new Google Sheet structure
interface Person {
  ลำดับ: string;
  ยศ: string;
  ชื่อ: string;
  สกุล: string;
  ชั้นปีที่: string;
  ตอน: string;
  'ตำแหน่ง ทกท.': string;
  สังกัด: string;
  เบอร์โทรศัพท์: string;
  คัดเกรด: string;
  'ธุรการ ฝอ.': string;
  ตัวชน: string;
  ส่วนสูง: string;
  นักกีฬา: string;
  'ภารกิจอื่น ๆ': string;
  'ดูงานต่างประเทศ': string;
}

interface ApiResponse {
  success: boolean;
  data?: Person[];
  error?: string;
}

// Define the type for a row in the table
type RowData = Partial<Person> & { ลำดับ: string; ยศ?: string; };

// --- Inlined PersonAutocomplete Component ---
interface InlinedPersonAutocompleteProps {
  people: Person[];
  value: Person | null;
  onSelect: (person: Person | null) => void;
}

function InlinedPersonAutocomplete({ people, value, onSelect }: InlinedPersonAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleSelect = (person: Person) => {
    onSelect(person);
    setInputValue("");
    setOpen(false);
  };

  const filterPeople = (search: string): Person[] => {
    if (!search) {
      return people.slice(0, 100); // Limit initial results
    }

    const lowercasedSearch = search.toLowerCase().trim();
    const searchTerms = lowercasedSearch.split(/\s+/).filter(Boolean);

    if (searchTerms.length === 0) {
      return people.slice(0, 100);
    }

    const firstTerm = searchTerms[0];
    const secondTerm = searchTerms.length > 1 ? searchTerms[1] : null;

    return people
      .filter((person) => {
        const firstName = (person.ชื่อ || '').toLowerCase();
        const lastName = (person.สกุล || '').toLowerCase();

        if (searchTerms.length === 1) {
          return firstName.startsWith(firstTerm) || lastName.startsWith(firstTerm);
        }

        if (secondTerm) {
          return firstName.startsWith(firstTerm) && lastName.startsWith(secondTerm);
        }

        return false;
      })
      .slice(0, 100);
  };
  
  const filtered = filterPeople(inputValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent border-slate-600 text-white hover:bg-slate-700"
        >
          {value ? `${value.ชื่อ || ''} ${value.สกุล || ''}`.trim() : "เลือกรายชื่อ..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-slate-800 border-slate-700 text-white">
        <Command>
          <CommandInput
            placeholder="ค้นหาชื่อ..."
            value={inputValue}
            onValueChange={setInputValue}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>ไม่พบรายชื่อ</CommandEmpty>
            <CommandGroup>
              {filtered.map((person) => (
                <CommandItem
                  key={person.ลำดับ}
                  value={`${person.ชื่อ || ''} ${person.สกุล || ''}`.trim()}
                  onSelect={() => handleSelect(person)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.ลำดับ === person.ลำดับ ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <p>{`${person.ชื่อ || ''} ${person.สกุล || ''}`.trim()}</p>
                    <p className="text-xs text-slate-400">{person.สังกัด} - ชั้นปี {person.ชั้นปีที่}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
// --- End Inlined PersonAutocomplete Component ---


// Define the state for persistence
interface CeremonyDutyGradeState extends ModuleState {
  dutyName: string;
  requiredByYear: { [year: string]: number };
  rows: RowData[];
  saveToHistory: boolean;
  selectedAffiliations: string[];
  excludedAdminDuties: string[];
  excludedAthletes: string[];
  excludedGrades: string[];
  heightRange: [number, number];
  checkAllSheets: boolean;
  excludeFaw?: boolean;
}

const MODULE_NAME = 'ceremony-duty-grade';

function CeremonyDutyGradeInternal() {
  const router = useRouter();
  const { toast } = useToast();

  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [dutyName, setDutyName] = useState("");
  const [requiredByYear, setRequiredByYear] = useState<{ [year: string]: number }>({ "4": 0 });
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

  const handleToggleSheetSelection = (fileName: string, sheetName: string, checked: boolean) => {
    setSelectedExclusionSheets(prev => {
      const cp = { ...prev };
      const prevList = new Set(cp[fileName] || []);
      if (checked) prevList.add(sheetName); else prevList.delete(sheetName);
      cp[fileName] = Array.from(prevList);
      return cp;
    });
  }
  
  const [excludedAdminDuties, setExcludedAdminDuties] = useState<string[]>([]);
  const [excludedAthletes, setExcludedAthletes] = useState<string[]>([]);
  const [excludedGrades, setExcludedGrades] = useState<string[]>([]);
  const [heightDomain, setHeightDomain] = useState<[number, number]>([150, 200]);
  const [heightRange, setHeightRange] = useState<[number, number]>([150, 200]);
  const [excludeFaw, setExcludeFaw] = useState<boolean>(false);

  const { user, isLoading: isLoadingUser, isError: isErrorUser } = useUserSession();
  const canAccessPage = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'oat' || user?.role?.toLowerCase() === 'user';
  const isSuperAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'oat';

  const [isStateLoaded, setIsStateLoaded] = useState(false);

  // When checkAllSheets is enabled, select all sheets for every uploaded file.
  useEffect(() => {
    if (checkAllSheets) {
      const next: { [filename: string]: string[] } = {};
      Object.keys(exclusionSheetNames).forEach(fn => {
        next[fn] = [...(exclusionSheetNames[fn] || [])];
      });
      // Also ensure files that exist but not yet in exclusionSheetNames are preserved
      exclusionFiles.forEach(f => {
        if (!next[f.name]) next[f.name] = [...(exclusionSheetNames[f.name] || [])];
      })
      setSelectedExclusionSheets(next);
    }
  }, [checkAllSheets, exclusionSheetNames, exclusionFiles]);

  const allAffiliations = useMemo(() => {
    const set = new Set<string>();
    allPersons.forEach((p) => {
      if (p.สังกัด && typeof p.สังกัด === "string" && p.สังกัด.trim() && !/^๐-๙$/.test(p.สังกัด.trim())) {
        set.add(p.สังกัด.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [allPersons]);

  useEffect(() => {
    if (isStateLoaded) setSelectedAffiliations(allAffiliations);
  }, [allAffiliations, isStateLoaded]);

  const adminDuties = useMemo(() => {
    const set = new Set<string>()
    allPersons.forEach(p => {
      if (p['ธุรการ ฝอ.'] && p['ธุรการ ฝอ.'].trim()) set.add(p['ธุรการ ฝอ.'].trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [allPersons])

  const athletes = useMemo(() => {
    const set = new Set<string>()
    allPersons.forEach(p => {
      if (p.นักกีฬา && p.นักกีฬา.trim()) set.add(p.นักกีฬา.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [allPersons])
  
  const grades = useMemo(() => {
    const set = new Set<string>()
    allPersons.forEach(p => {
      if (p.คัดเกรด && p.คัดเกรด.trim()) set.add(p.คัดเกรด.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [allPersons])

  useEffect(() => {
    if (allPersons.length > 0) {
      const heights = allPersons.map(p => parseInt(toArabic(p.ส่วนสูง), 10) || 0).filter(h => h > 0);
      if (heights.length > 0) {
        const min = Math.min(...heights);
        const max = Math.max(...heights);
        setHeightDomain([min, max]);
        if (!isStateLoaded) {
            setHeightRange([min, max]);
        }
      }
    }
  }, [allPersons, isStateLoaded]);

  const saveCurrentState = () => {
    if (!isStateLoaded) return;
    const state: CeremonyDutyGradeState = {
      dutyName,
      requiredByYear,
      rows,
      saveToHistory,
      selectedAffiliations,
      excludedAdminDuties,
      excludedAthletes,
      excludedGrades,
      heightRange,
      checkAllSheets,
      excludeFaw,
    };
    saveModuleState(MODULE_NAME, state);
  };

  const loadSavedState = () => {
    const savedState = loadModuleState(MODULE_NAME);
    if (savedState) {
      if (savedState.dutyName) setDutyName(savedState.dutyName);
      if (savedState.requiredByYear) setRequiredByYear(savedState.requiredByYear);
      if (savedState.rows && savedState.rows.length > 0) setRows(savedState.rows);
      if (typeof savedState.saveToHistory === 'boolean') setSaveToHistory(savedState.saveToHistory);
      if (savedState.selectedAffiliations) setSelectedAffiliations(savedState.selectedAffiliations);
      if (savedState.excludedAdminDuties) setExcludedAdminDuties(savedState.excludedAdminDuties);
      if (savedState.excludedAthletes) setExcludedAthletes(savedState.excludedAthletes);
      if (savedState.excludedGrades) setExcludedGrades(savedState.excludedGrades);
      if (savedState.heightRange) setHeightRange(savedState.heightRange);
      if (typeof savedState.checkAllSheets === 'boolean') setCheckAllSheets(savedState.checkAllSheets);
      if (typeof savedState.excludeFaw === 'boolean') setExcludeFaw(savedState.excludeFaw);
    } 
    setIsStateLoaded(true);
  };

  const loadSheetData = async (force: boolean = false) => {
    setIsLoadingData(true);
    setError(null);
    const cacheKey = `ceremony-grade-data`;

    if (!force) {
      const cachedData = loadFromCache<any[]>(cacheKey);
      if (cachedData) {
        const dataRows = cachedData.map((p: any) => ({
          ...p,
          สกุล: p.สกุล || p.สกุุล || ''
        }));
        setAllPersons(dataRows);
        setConnectionStatus("connected");
        setLastUpdated(new Date());
        toast({ title: "โหลดข้อมูลสำเร็จ", description: `ใช้ข้อมูลจากแคช ${dataRows.length} คน` });
        setIsLoadingData(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/sheets/grade-data`);
      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        const dataRows = result.data.map((p: any) => ({
          ...p,
          สกุล: p.สกุล || p.สกุุล || ''
        }));
        setAllPersons(dataRows);
        saveToCache(cacheKey, dataRows);
        setConnectionStatus("connected");
        setLastUpdated(new Date());
        toast({ title: "เชื่อมต่อสำเร็จ", description: `โหลดข้อมูล ${dataRows.length} คน` });
      } else {
        throw new Error(result.error || "Failed to load data from Google Sheet");
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
  }, []);

  useEffect(() => {
    if (!isLoadingData && allPersons.length > 0) {
      loadSavedState();
    }
  }, [isLoadingData, allPersons]);

  useEffect(() => {
    saveCurrentState();
  }, [dutyName, requiredByYear, rows, saveToHistory, selectedAffiliations, excludedAdminDuties, excludedAthletes, excludedGrades, heightRange, checkAllSheets, isStateLoaded]);

  // include excludeFaw in save effect
  useEffect(() => {
    saveCurrentState();
  }, [excludeFaw]);

  const normalizeName = (firstName?: string, lastName?: string): string => {
    const first = (firstName || "").toString().trim()
    const last = (lastName || "").toString().trim()
    return `${first} ${last}`.trim()
  }

  const handlePersonSelect = (idx: number, person: Person | null) => {
    setRows(prev => {
      const newRows = [...prev];
      if (person) {
        newRows[idx] = { ...newRows[idx], ...person };
      } else {
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

  const handleClearRows = () => {
    if (window.confirm('คุณต้องการลบรายชื่อทั้งหมดในตารางใช่หรือไม่?')) {
      setRows([]);
      toast({ title: "ลบรายชื่อทั้งหมดเรียบร้อยแล้ว" });
    }
  };

  const handleAssignDuty = () => {
    setIsAssigning(true);
    
    let availablePersons = [...allPersons];
    
    const assignedNames = new Set(rows.filter(r => r.ชื่อ && r.สกุล).map(r => normalizeName(r.ชื่อ, r.สกุล)));
    if (assignedNames.size > 0) {
        availablePersons = availablePersons.filter(p => !assignedNames.has(normalizeName(p.ชื่อ, p.สกุล)));
    }

    if (namesToExclude.size > 0) {
        availablePersons = availablePersons.filter(p => !namesToExclude.has(normalizeName(p.ชื่อ, p.สกุล)));
    }

  // Exclude any position that contains ฝอ (case-insensitive) when enabled
  if (excludeFaw) {
    availablePersons = availablePersons.filter(p => {
      const pos = (p['ตำแหน่ง ทกท.'] || '').toString();
      return !/ฝอ/i.test(pos);
    });
  }

    const normalize = (str?: string) => (str ? str.trim().toLowerCase() : "");

    // Apply height filter
    availablePersons = availablePersons.filter(p => {
        const heightStr = (p.ส่วนสูง || '').toString();
        const height = parseInt(toArabic(heightStr).match(/\d+/)?.[0] || "0", 10);
        return height >= heightRange[0] && height <= heightRange[1];
    });

    // Apply other filters
    if (excludedAdminDuties.length > 0) {
        const normDuties = excludedAdminDuties.map(normalize);
        availablePersons = availablePersons.filter(p => !normDuties.includes(normalize(p['ธุรการ ฝอ.'])));
    }
    if (excludedAthletes.length > 0) {
        const normAthletes = excludedAthletes.map(normalize);
        availablePersons = availablePersons.filter(p => !normAthletes.includes(normalize(p.นักกีฬา)));
    }
    if (excludedGrades.length > 0) {
        const normGrades = excludedGrades.map(normalize);
        availablePersons = availablePersons.filter(p => !normGrades.includes(normalize(p.คัดเกรด)));
    }
    if (selectedAffiliations.length < allAffiliations.length) {
        availablePersons = availablePersons.filter(p => selectedAffiliations.includes(p.สังกัด));
    }

    const needsByYear = { ...requiredByYear };

    const newlyAssigned: Person[] = [];
    Object.keys(needsByYear).sort((a,b) => Number(b) - Number(a)).forEach(year => {
      const needed = needsByYear[year];
      if (needed > 0) {
        let candidates = availablePersons.filter(p => toArabic(p.ชั้นปีที่).includes(year));
        
        const gradePriority = ['F', 'D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+'];
        candidates.sort((a, b) => {
            const gradeA = (a.คัดเกรด || '').trim().toUpperCase();
            const gradeB = (b.คัดเกรด || '').trim().toUpperCase();
            
            const rankA = gradePriority.indexOf(gradeA);
            const rankB = gradePriority.indexOf(gradeB);

            // Grades not in the priority list are ranked lowest
            const effectiveRankA = rankA === -1 ? gradePriority.length : rankA;
            const effectiveRankB = rankB === -1 ? gradePriority.length : rankB;

            // Prioritize lower grades (lower index in gradePriority)
            if (effectiveRankA !== effectiveRankB) {
                return effectiveRankA - effectiveRankB;
            }
            
            // For candidates with the same grade, shuffle them randomly
            return Math.random() - 0.5;
        });
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
      sheetName: "GradeDataSheet",
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
            person.ยศ || '',
            person.ชื่อ || '',
            person.สกุล || '',
            person.ชั้นปีที่ || '',
            person.ตอน || '',
            person['ตำแหน่ง ทกท.'] || '',
            person.สังกัด || '',
            person.เบอร์โทรศัพท์ || '',
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
      `ฐานข้อมูล: Grade Data Sheet`,
      "",
      "เงื่อนไขการกรอง:",
      `- กรองตามสังกัด: ${selectedAffiliations.length === allAffiliations.length ? "ทั้งหมด" : selectedAffiliations.join(", ")}`,
      `- ยกเว้น ธุรการ/ฝอ.: ${excludedAdminDuties.length > 0 ? excludedAdminDuties.join(", ") : "ไม่มี"}`,
      `- ยกเว้น นักกีฬา: ${excludedAthletes.length > 0 ? excludedAthletes.join(", ") : "ไม่มี"}`,
      `- ยกเว้นตามเกรด: ${excludedGrades.length > 0 ? excludedGrades.join(", ") : "ไม่มี"}`,
      `- กรองตามส่วนสูง: ${heightRange[0]} - ${heightRange[1]} ซม.`,
      `- ยกเว้นจากไฟล์: ${exclusionFilesSummary}`,
      "",
      "รายชื่อ:",
      ...rows.map(
        (person, index) =>
          `${index + 1}. ${person.ยศ || ''} ${person.ชื่อ || ''} ${person.สกุล || ''} (${person.สังกัด || 'N/A'})`,
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
      try {
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: "array" })
        setExclusionSheetNames(prev => ({ ...prev, [file.name]: workbook.SheetNames }))
        // default to selecting all sheets on upload
        setSelectedExclusionSheets(prev => ({ ...prev, [file.name]: [...workbook.SheetNames] }))

        // Extract and log all names found in this file (all sheets) with per-sheet previews
        const found = new Set<string>()
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName]
          if (!ws) continue
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 3 }) as any[][]
          const filteredData = data.filter(row => row && row.length >= 4 && (row[0] || row[2] || row[3]))
          const namesInSheet: string[] = []
          filteredData.forEach(row => {
            const fullName = normalizeName(row[2], row[3])
            if (fullName) {
              found.add(fullName)
              namesInSheet.push(fullName)
            }
          })
          console.log(`[exclusion][preview] File='${file.name}' Sheet='${sheetName}' -> ${namesInSheet.length} names`, namesInSheet)
        }
        console.log(`[exclusion] Uploaded file '${file.name}' contains ${found.size} extracted names (aggregate)`, Array.from(found))
      } catch (err) {
        console.error(`[exclusion] Failed to read uploaded file '${file.name}':`, err)
      }
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
        try {
          const arrayBuffer = await file.arrayBuffer()
          const workbook = XLSX.read(arrayBuffer, { type: "array" })
          const sheetsToProcess = checkAllSheets
            ? exclusionSheetNames[file.name] || []
            : selectedExclusionSheets[file.name] || []

          const namesPerFile = new Set<string>()
          for (const sheetName of sheetsToProcess) {
            const ws = workbook.Sheets[sheetName]
            if (!ws) continue
            const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 3 }) as any[][]
            const filteredData = data.filter(row => row && row.length >= 4 && (row[0] || row[2] || row[3]))
            const namesInSheet: string[] = []
            filteredData.forEach(row => {
              const fullName = normalizeName(row[2], row[3])
              if (fullName) {
                names.add(fullName)
                namesPerFile.add(fullName)
                namesInSheet.push(fullName)
              }
            })
            console.log(`[exclusion][process] File='${file.name}' Sheet='${sheetName}' -> ${namesInSheet.length} names`, namesInSheet)
          }
          console.log(`[exclusion] Processed file '${file.name}' sheets: [${sheetsToProcess.join(', ')}] -> found ${namesPerFile.size} names`)
        } catch (err) {
          console.error(`[exclusion] Failed to process file '${file.name}':`, err)
        }
      }
      setNamesToExclude(names)
    }
    processExclusionFiles()
  }, [exclusionFiles, checkAllSheets, selectedExclusionSheets, exclusionSheetNames])

  const handleAdminDutyChange = (duty: string, checked: boolean) => {
    setExcludedAdminDuties(prev => checked ? [...prev, duty] : prev.filter(p => p !== duty))
  }

  const handleAthleteChange = (athlete: string, checked: boolean) => {
    setExcludedAthletes(prev => checked ? [...prev, athlete] : prev.filter(c => c !== athlete))
  }
  
  const handleGradeChange = (grade: string, checked: boolean) => {
    setExcludedGrades(prev => checked ? [...prev, grade] : prev.filter(g => g !== grade))
  }

  const handleSelectAllAdminDuties = () => {
    setExcludedAdminDuties(prev => prev.length === adminDuties.length ? [] : [...adminDuties])
  }

  const handleSelectAllAthletes = () => {
    setExcludedAthletes(prev => prev.length === athletes.length ? [] : [...athletes])
  }
  
  const handleSelectAllGrades = () => {
    setExcludedGrades(prev => prev.length === grades.length ? [] : [...grades])
  }

  const refreshData = () => {
    loadSheetData(true);
  };

  const clearCurrentState = () => {
    if (window.confirm('ต้องการล้างข้อมูลการทำงานทั้งหมดใช่หรือไม่?')) {
      setDutyName("");
      setRows([{ ลำดับ: "1", ยศ: "นนร.", ชื่อ: "", สกุล: "" }]);
      setRequiredByYear({ "4": 0 });
      setExcludedAdminDuties([]);
      setExcludedAthletes([]);
      setExcludedGrades([]);
  if (heightDomain) setHeightRange(heightDomain);
  setExcludeFaw(false);
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
                จัดยอดตามเกรด 433
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
            <div className="text-slate-400 text-xs sm:text-sm">Grade Assignment Mode</div>
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
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <Label className="text-white font-medium text-sm">ตัด ฝอ.</Label>
                        <p className="text-xs text-slate-400">ยกเว้นผู้ที่มีคำว่า 'ฝอ' ในคอลัมน์ 'ตำแหน่ง ทกท.'</p>
                      </div>
                      <Switch checked={excludeFaw} onCheckedChange={setExcludeFaw} />
                    </div>
                </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-blue-400"/>สุ่มเพิ่มตามจำนวน (เฉพาะชั้น ๔)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`year-4-count`} className="text-white text-sm w-20">ชั้นปีที่ ๔:</Label>
                      <Input
                        id={`year-4-count`}
                        type="number"
                        min="0"
                        value={requiredByYear["4"] === 0 ? "" : requiredByYear["4"]}
                        onChange={(e) => {
                          const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setRequiredByYear(prev => ({ ...prev, "4": value }));
                        }}
                        className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400 text-sm"
                      />
                    </div>
                </CardContent>
            </Card>

            {isSuperAdmin && (
                <Card className="bg-slate-800/50 border-slate-700 shadow-xl">
                    <CardHeader className="pb-1"><CardTitle className="flex items-center gap-2 text-white text-base">กรองสังกัด</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-end gap-2 mb-2">
                            <Button size="sm" variant="ghost" className="text-blue-200 hover:text-white" onClick={() => setSelectedAffiliations(allAffiliations)}>ทั้งหมด</Button>
                            <Button size="sm" variant="ghost" className="text-red-200 hover:text-white" onClick={() => setSelectedAffiliations([])}>ล้าง</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {allAffiliations.map(aff => (
                            <label key={aff} className="flex items-center gap-1 cursor-pointer bg-blue-800/60 rounded px-2 py-1 text-white border border-blue-700 hover:bg-blue-700 transition">
                                <Checkbox id={`affiliation-${aff}`} checked={selectedAffiliations.includes(aff)} onCheckedChange={checked => { setSelectedAffiliations(prev => checked ? [...prev, aff] : prev.filter(a => a !== aff)); }} className="border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
                                <span className="text-xs truncate max-w-[80px]">{aff}</span>
                            </label>
                            ))}
                        </div>
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
                        {exclusionFiles.map((file) => (
                          <div key={`sheets-${file.name}`} className="mt-2 border border-slate-700 rounded-lg p-2 bg-slate-800/40">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-white text-xs font-medium">ชีทในไฟล์: {file.name}</div>
                              <div className="text-xs text-slate-300">{(exclusionSheetNames[file.name] || []).length} ชีท</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {(exclusionSheetNames[file.name] || []).map(sheet => (
                                <label key={`${file.name}-${sheet}`} className="flex items-center gap-2 cursor-pointer bg-slate-700/60 rounded px-2 py-1 text-white text-xs">
                                  <input type="checkbox" checked={(selectedExclusionSheets[file.name] || []).includes(sheet)} onChange={(e) => handleToggleSheetSelection(file.name, sheet, e.target.checked)} className="w-4 h-4" />
                                  <span className="truncate">{sheet}</span>
                                </label>
                              ))}
                            </div>
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
                    <CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-red-400" />ตัด ธุรการ 433</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleSelectAllAdminDuties} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      {excludedAdminDuties.length === adminDuties.length ? 'ยกเลิก' : 'เลือกทั้งหมด'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    {adminDuties.map((duty) => (
                      <div key={duty} className="flex items-center space-x-2">
                        <Checkbox id={`duty-${duty}`} checked={excludedAdminDuties.includes(duty)} onCheckedChange={(checked) => handleAdminDutyChange(duty, checked as boolean)} className="border-slate-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"/>
                        <Label htmlFor={`duty-${duty}`} className="text-white text-xs cursor-pointer">{duty}</Label>
                      </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-orange-400" />ไม่เลือกนักกีฬา</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleSelectAllAthletes} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      {excludedAthletes.length === athletes.length ? 'ยกเลิก' : 'เลือกทั้งหมด'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    {athletes.map((athlete) => (
                      <div key={athlete} className="flex items-center space-x-2">
                        <Checkbox id={`athlete-${athlete}`} checked={excludedAthletes.includes(athlete)} onCheckedChange={(checked) => handleAthleteChange(athlete, checked as boolean)} className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"/>
                        <Label htmlFor={`athlete-${athlete}`} className="text-white text-xs cursor-pointer">{athlete}</Label>
                      </div>
                    ))}
                </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-yellow-400" />ตัดเกรดที่ไม่ต้องการ</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleSelectAllGrades} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      {excludedGrades.length === grades.length ? 'ยกเลิก' : 'เลือกทั้งหมด'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    {grades.map((grade) => (
                      <div key={grade} className="flex items-center space-x-2">
                        <Checkbox id={`grade-${grade}`} checked={excludedGrades.includes(grade)} onCheckedChange={(checked) => handleGradeChange(grade, checked as boolean)} className="border-slate-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"/>
                        <Label htmlFor={`grade-${grade}`} className="text-white text-xs cursor-pointer">{grade}</Label>
                      </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 shadow-xl backdrop-blur-sm">
                <CardHeader><CardTitle className="flex items-center gap-2 text-white"><BarChart3 className="h-5 w-5 text-indigo-400" />กรองตามส่วนสูง (ซม.)</CardTitle></CardHeader>
                <CardContent>
                    <Slider min={heightDomain[0]} max={heightDomain[1]} value={heightRange} onValueChange={(value) => setHeightRange(value as [number, number])} step={1} />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>ต่ำสุด: {heightRange[0]}</span>
                      <span>สูงสุด: {heightRange[1]}</span>
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
                      <TableHead className="px-1 py-2 text-right text-white font-semibold w-10 whitespace-nowrap">เกรด</TableHead>
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
                            <InlinedPersonAutocomplete
                                people={allPersons}
                                value={row.ชื่อ ? row as Person : null}
                                onSelect={(person) => handlePersonSelect(idx, person)}
                            />
                        </TableCell>
                        <TableCell className="text-center align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{row.ชั้นปีที่}</TableCell>
                        <TableCell className="text-center align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{row.ตอน}</TableCell>
                        <TableCell className="text-left align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{row['ตำแหน่ง ทกท.']}</TableCell>
                        <TableCell className="text-left align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{row.สังกัด}</TableCell>
                        <TableCell className="text-center align-middle text-slate-300 px-1 py-1 whitespace-nowrap text-[11px]">{row.คัดเกรด}</TableCell>
                         <TableCell className="text-right align-middle px-1 py-1 whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} className="text-red-400 hover:bg-red-500/20 h-7 w-7">
                              <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                      <TableRow className="bg-slate-900/50">
                          <TableCell colSpan={10} className="p-2">
                              <div className="flex justify-end gap-2">
                                  <Button onClick={addRow} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                                      <PlusCircle className="h-4 w-4 mr-2"/>
                                      เพิ่มแถว
                                  </Button>
                                  <Button onClick={handleClearRows} size="sm" className="bg-red-500 hover:bg-red-600 text-white">
                                      <X className="h-4 w-4 mr-2" />
                                      ลบทุกแถว
                                  </Button>
                              </div>
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

export function CeremonyDutyGrade() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-center">
                <div className="text-center">
                    <Database className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-xl font-semibold mb-2">กำลังโหลด...</h3>
                </div>
            </div>
        }>
            <CeremonyDutyGradeInternal />
        </Suspense>
    )
}