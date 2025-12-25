'use client';
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { ArrowLeft, Database, Search, Link as LinkIcon, RefreshCw, Wand2, Copy, FileText, Settings, CheckSquare, Square, ExternalLink, Trash2, Plus, Upload, UserMinus, UserPlus, FileSpreadsheet, Ruler, GraduationCap, ShieldAlert, Pencil, UserCog, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { loadFromCache, saveToCache } from "@/lib/ccache";
import { cn } from "@/lib/utils";

interface SheetData {
    name: string;
    data: { index: number, cells: any[] }[];
}

interface Person {
    ยศ: string;
    ชื่อ: string;
    สกุล: string;
    ชั้นปีที่: string;
    ตอน: string;
    ตำแหน่ง: string;
    สังกัด: string;
    เบอร์โทรศัพท์: string;
    เกรดเฉลี่ย?: string;
    คัดเกรด?: string;
    ส่วนสูง?: string;
    หมายเหตุ?: string;
    [key: string]: any;
}

export function CeremonyDutyLink({ onBack }: { onBack: () => void }) {
    const { toast } = useToast();
    const [url, setUrl] = useState("https://docs.google.com/spreadsheets/d/1QC_ogqwrDcos5mYozeVVFL6FLSRwG5V2oQrpevItMfE/edit?gid=1212184277#gid=1212184277");
    const [isLoading, setIsLoading] = useState(false);
    const [sheets, setSheets] = useState<SheetData[]>([]);
    const [dbPersons, setDbPersons] = useState<Person[]>([]);
    const [isDbLoading, setIsDbLoading] = useState(false);
    const [highlightDuplicates, setHighlightDuplicates] = useState(false);
    const [activeSheetName, setActiveSheetName] = useState<string | null>(null);
    const [isUpdatingSheet, setIsUpdatingSheet] = useState(false);

    // New States
    const [checkAllSheets, setCheckAllSheets] = useState(false);
    const [excludedSheets, setExcludedSheets] = useState<string[]>([]);

    // Randomizer State
    const [randomCount, setRandomCount] = useState<number>(10);
    const [generatedList, setGeneratedList] = useState<Person[]>([]);
    const [exclusionFilePersons, setExclusionFilePersons] = useState<Set<string>>(new Set());

    // Filters
    const [filterHeightRange, setFilterHeightRange] = useState<number[]>([160, 200]);
    const [excludedGrades, setExcludedGrades] = useState<string[]>([]);
    const [excludeAdmin433, setExcludeAdmin433] = useState(false);
    const [excludeFaw, setExcludeFaw] = useState(false);
    const [excludeAthletes, setExcludeAthletes] = useState(false);
    const [selectedAffiliations, setSelectedAffiliations] = useState<string[]>([]);

    // Fetch Database
    useEffect(() => {
        const fetchDb = async () => {
            setIsDbLoading(true);
            try {
                const cacheKey = `ceremony-link-grade-data`;
                const cached = loadFromCache<Person[]>(cacheKey);
                if (cached) {
                    setDbPersons(cached);
                }

                const res = await fetch(`/api/sheets/grade-data`);
                const result = await res.json();
                if (result.success && result.data) {
                    setDbPersons(result.data);
                    saveToCache(cacheKey, result.data);
                }
            } catch (err) {
                console.error("Failed to load DB", err);
            } finally {
                setIsDbLoading(false);
            }
        };
        fetchDb();
    }, []);

    const handleLoadSheet = async () => {
        if (!url) return;
        setIsLoading(true);
        setSheets([]);
        setActiveSheetName(null);
        try {
            const res = await fetch('/api/sheets/fetch-from-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const result = await res.json();
            if (result.success) {
                setSheets(result.sheets);
                toast({ title: "โหลดข้อมูลสำเร็จ", description: `พบ ${result.sheets.length} ชีท` });
                if (result.sheets.length > 0) {
                    setActiveSheetName(result.sheets[0].name);
                }
            } else {
                toast({ title: "เกิดข้อผิดพลาด", description: result.error, variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถเชื่อมต่อกับ Server ได้", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const normalize = (str: any) => String(str || "").trim().toLowerCase();

    const handleAutofill = async () => {
        if (sheets.length === 0) return;
        if (dbPersons.length === 0) {
            toast({ title: "ไม่พบฐานข้อมูล", description: "กำลังโหลดฐานข้อมูล กรุณารอสักครู่", variant: "destructive" });
            return;
        }
        if (!url) return;

        setIsUpdatingSheet(true);
        let totalUpdated = 0;

        try {
            const newSheets = [...sheets];
            // Apply to ALL sheets regardless of view mode, usually desired?
            // Or only active if not checking all?
            // Let's assume autofill applies to ALL fetched sheets for convenience.

            for (const sheet of newSheets) {
                const updates: { rowIndex: number, values: Record<number, string> }[] = [];

                const newData = sheet.data.map(rowObj => {
                    if (!rowObj?.cells || !Array.isArray(rowObj.cells)) return rowObj;

                    const row = rowObj.cells;
                    const name = row[2];
                    const surname = row[3];

                    if (name && surname) {
                        const match = dbPersons.find(p =>
                            normalize(p.ชื่อ) === normalize(name) &&
                            normalize(p.สกุล) === normalize(surname)
                        );

                        if (match) {
                            const newRow = [...row];
                            const rowUpdates: Record<number, string> = {};
                            let changed = false;

                            if (!newRow[1]) { newRow[1] = match.ยศ; rowUpdates[1] = match.ยศ; changed = true; }
                            if (!newRow[4]) { newRow[4] = match.ชั้นปีที่; rowUpdates[4] = match.ชั้นปีที่; changed = true; }
                            if (!newRow[5]) { newRow[5] = match.ตอน; rowUpdates[5] = match.ตอน; changed = true; }
                            if (!newRow[6]) { newRow[6] = match.ตำแหน่ง; rowUpdates[6] = match.ตำแหน่ง; changed = true; }
                            if (!newRow[7]) { newRow[7] = match.สังกัด; rowUpdates[7] = match.สังกัด; changed = true; }
                            if (!newRow[8]) { newRow[8] = match.เบอร์โทรศัพท์; rowUpdates[8] = match.เบอร์โทรศัพท์; changed = true; }

                            if (changed) {
                                updates.push({
                                    rowIndex: rowObj.index,
                                    values: rowUpdates
                                });
                                return { ...rowObj, cells: newRow };
                            }
                        }
                    }
                    return rowObj;
                });

                if (updates.length > 0) {
                    await fetch('/api/sheets/update-rows', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            url,
                            sheetName: sheet.name,
                            updates
                        })
                    });
                    totalUpdated += updates.length;
                    sheet.data = newData;
                }
            }

            setSheets(newSheets);

            if (totalUpdated > 0) {
                toast({ title: "เติมข้อมูลสำเร็จ", description: `อัปเดตข้อมูล ${totalUpdated} รายการลงใน Google Sheets` });
            } else {
                toast({ title: "ข้อมูลครบถ้วน", description: "ไม่พบข้อมูลที่ต้องเติม" });
            }

        } catch (e: any) {
            console.error(e);
            toast({ title: "Error", description: "Failed to update sheets", variant: "destructive" });
        } finally {
            setIsUpdatingSheet(false);
        }
    };

    const handleToggleHighlight = async () => {
        if (!url) return;

        const newState = !highlightDuplicates;
        setHighlightDuplicates(newState);

        if (newState) {
            // ENABLE Highlight
            setIsUpdatingSheet(true);
            try {
                // Calculate global counts if checkAllSheets is true
                const globalCounts = new Map<string, number>();

                const sheetsToCheck = checkAllSheets
                    ? sheets.filter(s => !excludedSheets.includes(s.name))
                    : sheets.filter(s => s.name === activeSheetName);

                sheetsToCheck.forEach(sheet => {
                    sheet.data.forEach(rowObj => {
                        if (rowObj?.cells && Array.isArray(rowObj.cells)) {
                            const surname = normalize(rowObj.cells[3]);
                            if (surname) globalCounts.set(surname, (globalCounts.get(surname) || 0) + 1);
                        }
                    });
                });

                // Apply highlighting to relevant sheets
                let highlightedCount = 0;
                for (const sheet of sheetsToCheck) {
                    const duplicateRowIndices: number[] = [];
                    sheet.data.forEach(rowObj => {
                        if (rowObj?.cells && Array.isArray(rowObj.cells)) {
                            const surname = normalize(rowObj.cells[3]);
                            if (surname && globalCounts.get(surname)! > 1) {
                                duplicateRowIndices.push(rowObj.index);
                            }
                        }
                    });

                    if (duplicateRowIndices.length > 0) {
                        await fetch('/api/sheets/highlight-duplicates', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url, sheetName: sheet.name, duplicateRowIndices })
                        });
                        highlightedCount++;
                    }
                }

                if (highlightedCount > 0) {
                    toast({ title: "Success", description: "Highlighted duplicates in Google Sheets." });
                } else {
                    toast({ title: "Info", description: "No duplicates found." });
                }

            } catch (e) {
                console.error(e);
                toast({ title: "Error", description: "Failed to highlight", variant: "destructive" });
            } finally {
                setIsUpdatingSheet(false);
            }
        } else {
            // DISABLE Highlight -> Reset Format
            // Reset ALL checked sheets to be safe? Or just active?
            // If user switched modes, we might leave highlights.
            // Safest is to reset sheets found in `sheets` state that we might have touched.
            // Let's reset ALL sheets that are not excluded if in All mode, or just active.
            setIsUpdatingSheet(true);
            try {
                const sheetsToReset = checkAllSheets
                    ? sheets.filter(s => !excludedSheets.includes(s.name))
                    : (activeSheetName ? sheets.filter(s => s.name === activeSheetName) : []);

                for (const sheet of sheetsToReset) {
                    await fetch('/api/sheets/reset-format', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, sheetName: sheet.name })
                    });
                }
                toast({ title: "Reset", description: "Cleared formatting." });
            } catch (e) { console.error(e) } finally { setIsUpdatingSheet(false); }
        }
    };

    const uniqueAffiliations = useMemo(() => {
        const set = new Set<string>();
        dbPersons.forEach(p => p.สังกัด && set.add(p.สังกัด));
        return Array.from(set).sort();
    }, [dbPersons]);

    const handleToggleAffiliation = (aff: string) => {
        setSelectedAffiliations(prev =>
            prev.includes(aff) ? prev.filter(a => a !== aff) : [...prev, aff]
        );
    };

    const uniqueGrades = useMemo(() => {
        const set = new Set<string>();
        dbPersons.forEach(p => p.คัดเกรด && set.add(p.คัดเกรด));
        return Array.from(set).sort();
    }, [dbPersons]);

    const handleToggleGrade = (grade: string) => {
        setExcludedGrades(prev =>
            prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
        );
    };

    const currentActiveSheetData = useMemo(() => {
        return sheets.find(s => s.name === activeSheetName);
    }, [sheets, activeSheetName]);

    const duplicateSet = useMemo(() => {
        if (!highlightDuplicates) return null;

        const counts = new Map<string, number>();

        const sheetsToCheck = checkAllSheets
            ? sheets.filter(s => !excludedSheets.includes(s.name))
            : sheets.filter(s => s.name === activeSheetName);

        sheetsToCheck.forEach(sheet => {
            sheet.data.forEach(rowObj => {
                if (rowObj?.cells && Array.isArray(rowObj.cells)) {
                    const surname = normalize(rowObj.cells[3]);
                    if (surname) counts.set(surname, (counts.get(surname) || 0) + 1);
                }
            });
        });

        return counts;
    }, [sheets, activeSheetName, highlightDuplicates, checkAllSheets, excludedSheets]);

    const toggleExclusion = (name: string) => {
        setExcludedSheets(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const getFullName = (p: { ชื่อ: string, สกุล: string }) => `${normalize(p.ชื่อ)}|${normalize(p.สกุล)}`;

    const handleFileUploadExclusion = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

            const names = new Set<string>();
            jsonData.forEach(row => {
                if (row[2] && row[3]) {
                    names.add(`${normalize(row[2])}|${normalize(row[3])}`);
                }
            });
            setExclusionFilePersons(prev => new Set([...Array.from(prev), ...Array.from(names)]));
            toast({ title: "Exclusion List Loaded", description: `Added ${names.size} names to exclusion.` });
        } catch (err) {
            toast({ title: "Error", description: "Failed to parse Excel file", variant: "destructive" });
        }
    };

    const filteredCandidates = useMemo(() => {
        if (!dbPersons) return [];
        let candidates = [...dbPersons];

        if (selectedAffiliations.length > 0) candidates = candidates.filter(p => selectedAffiliations.includes(p.สังกัด));

        if (excludedGrades.length > 0) {
            candidates = candidates.filter(p => !excludedGrades.includes(p.คัดเกรด || ""));
        }

        if (true) { // range matches always active if using range state
            candidates = candidates.filter(p => {
                const h = parseFloat(p.ส่วนสูง || "0");
                return !isNaN(h) && h >= filterHeightRange[0] && h <= filterHeightRange[1];
            });
        }

        if (exclusionFilePersons.size > 0) candidates = candidates.filter(p => !exclusionFilePersons.has(getFullName(p)));

        const linkNames = new Set<string>();
        sheets.filter(s => excludedSheets.includes(s.name)).forEach(s => {
            s.data.forEach(row => {
                if (row?.cells && row.cells[2] && row.cells[3]) {
                    linkNames.add(`${normalize(row.cells[2])}|${normalize(row.cells[3])}`);
                }
            });
        });
        candidates = candidates.filter(p => !linkNames.has(getFullName(p)));

        if (excludeAdmin433) candidates = candidates.filter(p => !p['ธุรการ ฝอ.'] && !p.ตำแหน่ง?.includes("ธุรการ") && !p.หมายเหตุ?.includes("433"));
        if (excludeFaw) candidates = candidates.filter(p => !p.ตำแหน่ง?.includes("ฝอ."));
        if (excludeAthletes) candidates = candidates.filter(p => !p['นักกีฬา'] && !p.หมายเหตุ?.includes("นักกีฬา") && !p.ตอน?.includes("นักกีฬา"));

        return candidates;
    }, [dbPersons, selectedAffiliations, filterHeightRange, excludedGrades, exclusionFilePersons, sheets, excludedSheets, excludeAdmin433, excludeFaw, excludeAthletes]);

    const handleRandomize = () => {
        if (filteredCandidates.length === 0) {
            // Toast removed to avoid spam if auto-updating, but okay for button click
            if (randomCount > 0) toast({ title: "Warning", description: "No candidates match current criteria.", variant: "destructive" });
            return;
        }

        let candidates = [...filteredCandidates];

        // Priority Grouping: C > B > A > A+ > Others
        const groups: Record<string, typeof candidates> = {
            'C': [], 'B': [], 'A': [], 'A+': [], 'Others': []
        };

        candidates.forEach(p => {
            const g = (p.คัดเกรด || "").toUpperCase().trim();
            if (['C', 'B', 'A', 'A+'].includes(g)) {
                groups[g].push(p);
            } else {
                groups['Others'].push(p);
            }
        });

        const order = ['C', 'B', 'A', 'A+', 'Others'];
        let finalCandidates: typeof candidates = [];

        order.forEach(key => {
            let list = groups[key];
            // Shuffle within group
            for (let i = list.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [list[i], list[j]] = [list[j], list[i]];
            }
            finalCandidates = [...finalCandidates, ...list];
        });

        candidates = finalCandidates;

        const selected = candidates.slice(0, randomCount);
        setGeneratedList(selected);
        toast({ title: "Randomized", description: `Selected ${selected.length} people.` });
    };

    const handleAddRow = () => {
        setGeneratedList(prev => [...prev, { ยศ: "", ชื่อ: "", สกุล: "", ชั้นปีที่: "", ตอน: "", ตำแหน่ง: "", สังกัด: "", เบอร์โทรศัพท์: "" }]);
    };

    const handleRemoveRow = (index: number) => {
        setGeneratedList(prev => prev.filter((_, i) => i !== index));
    };

    const handlRowChange = (index: number, field: keyof Person, value: string) => {
        const newList = [...generatedList];
        newList[index] = { ...newList[index], [field]: value };
        setGeneratedList(newList);
    };

    const [editingRow, setEditingRow] = useState<{ index: number, cells: any[] } | null>(null);
    const [manualSearchTerm, setManualSearchTerm] = useState("");

    const manualSearchResults = useMemo(() => {
        if (!manualSearchTerm || !dbPersons) return [];
        const term = manualSearchTerm.toLowerCase();
        return dbPersons.filter(p =>
            (p.ชื่อ && p.ชื่อ.includes(term)) ||
            (p.สกุล && p.สกุล.includes(term))
        ).slice(0, 10); // Limit to 10
    }, [manualSearchTerm, dbPersons]);

    const handleConfirmManualUpdate = async (person: Person) => {
        if (!editingRow || !activeSheetName || !url) return;

        const rowIndex = editingRow.index;
        // Construct values for update-rows (Specific cells)
        const values: Record<number, string> = {
            1: person.ยศ || "",
            2: person.ชื่อ || "",
            3: person.สกุล || "",
            4: person.ชั้นปีที่ || "",
            5: person.ตอน || "",
            6: person.ตำแหน่ง || "",
            7: person.สังกัด || "",
            8: person.เบอร์โทรศัพท์ || ""
        };

        try {
            setIsUpdatingSheet(true);
            await fetch('/api/sheets/update-rows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, sheetName: activeSheetName, updates: [{ rowIndex, values }] })
            }); // Single row update

            // Update local state instead of reloading helper
            setSheets(prev => prev.map(sheet => {
                if (sheet.name !== activeSheetName) return sheet;
                return {
                    ...sheet,
                    data: sheet.data.map(row => {
                        if (row.index !== rowIndex) return row;
                        const newCells = [...row.cells];
                        newCells[1] = values[1];
                        newCells[2] = values[2];
                        newCells[3] = values[3];
                        newCells[4] = values[4];
                        newCells[5] = values[5];
                        newCells[6] = values[6];
                        newCells[7] = values[7];
                        newCells[8] = values[8];
                        return { ...row, cells: newCells };
                    })
                };
            }));

            toast({ title: "Updated", description: `Updated row ${rowIndex + 1} with ${person.ชื่อ}` });
            setEditingRow(null);
            setManualSearchTerm("");
            // handleLoadSheet(); // Removed to prevent reload
        } catch (e) {
            toast({ title: "Error", description: "Failed to update row", variant: "destructive" });
        } finally {
            setIsUpdatingSheet(false);
        }
    };

    const handleAddGeneratedToLink = async () => {
        if (!activeSheetName || !url) return;
        const currentSheet = sheets.find(s => s.name === activeSheetName);
        if (!currentSheet) return;

        let maxIndex = 3;
        currentSheet.data.forEach(d => { if (d.index > maxIndex) maxIndex = d.index; });
        let nextIndex = maxIndex + 1;

        const updates: any[] = [];
        generatedList.forEach((p, idx) => {
            const rowIndex = nextIndex + idx;
            const values: Record<number, string> = {
                0: String(rowIndex - 2), // rough seq
                1: p.ยศ || "",
                2: p.ชื่อ || "",
                3: p.สกุล || "",
                4: p.ชั้นปีที่ || "",
                6: p.ตำแหน่ง || "", // Col 6 is Position
                7: p.สังกัด || "",
                8: p.เบอร์โทรศัพท์ || "",
                9: p.หมายเหตุ || ""
            };
            updates.push({ rowIndex, values });
        });

        try {
            setIsUpdatingSheet(true);
            await fetch('/api/sheets/update-rows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, sheetName: activeSheetName, updates })
            });
            toast({ title: "Success", description: "Added entries to sheet." });
            handleLoadSheet();
        } catch (e) {
            toast({ title: "Error", description: "Failed to add", variant: "destructive" });
        } finally {
            setIsUpdatingSheet(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <Button onClick={onBack} variant="outline" className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        กลับ
                    </Button>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
                        <LinkIcon className="h-6 w-6 text-orange-400" />
                        จัดยอดในลิงก์
                    </h1>
                    <div className="w-20"></div>
                </div>

                <Card className="bg-slate-800/50 border-slate-700 mb-6 backdrop-blur-sm">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col gap-4 mb-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="วางลิงก์ Google Sheets ที่นี่..."
                                        className="pl-9 pr-8 bg-slate-900/50 border-slate-600 text-white"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                    />
                                    {url && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full"
                                            onClick={() => setUrl("")}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <Button onClick={handleLoadSheet} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                    โหลดข้อมูล
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.open(url, "_blank")}
                                    disabled={!url}
                                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    ดูลิงก์
                                </Button>
                            </div>

                            {sheets.length > 0 && (
                                <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="check-mode"
                                            checked={checkAllSheets}
                                            onCheckedChange={setCheckAllSheets}
                                            disabled={highlightDuplicates} // Prevent changing mode while highlighted
                                        />
                                        <Label htmlFor="check-mode" className="text-slate-200">
                                            {checkAllSheets ? "เช็คซ้ำทุกชีท (All Sheets)" : "เช็คซ้ำเฉพาะชีทนี้ (Current Sheet)"}
                                        </Label>
                                    </div>

                                    {checkAllSheets && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className="ml-auto border-slate-600 text-slate-300">
                                                    <Settings className="h-4 w-4 mr-2" />
                                                    เลือกชีทที่ไม่สนใจ ({excludedSheets.length})
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="bg-slate-800 border-slate-700 text-white w-64 max-h-[300px] overflow-y-auto">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium text-sm text-slate-400 mb-2">ติ๊กเพื่อไม่สนใจ (Exclude)</h4>
                                                    {sheets.map(sheet => (
                                                        <div key={sheet.name} className="flex items-center space-x-2">
                                                            <div
                                                                className={cn("w-4 h-4 border rounded cursor-pointer flex items-center justify-center",
                                                                    excludedSheets.includes(sheet.name) ? "bg-red-500 border-red-500" : "border-slate-500")}
                                                                onClick={() => toggleExclusion(sheet.name)}
                                                            >
                                                                {excludedSheets.includes(sheet.name) && <CheckSquare className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <span className="text-sm truncate cursor-pointer" onClick={() => toggleExclusion(sheet.name)}>{sheet.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>
                            )}
                        </div>

                        {sheets.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar mt-4">
                                {sheets.map((sheet) => {
                                    const isExcluded = excludedSheets.includes(sheet.name);
                                    return (
                                        <button
                                            key={sheet.name}
                                            onClick={() => {
                                                setActiveSheetName(sheet.name);
                                                if (highlightDuplicates && !checkAllSheets) {
                                                    // If specific mode, turning off highlight when changing sheet is safer visually
                                                    setHighlightDuplicates(false);
                                                }
                                            }}
                                            className={cn(
                                                "relative px-2 py-2 text-xs sm:text-sm rounded-md border text-center transition-all truncate bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700",
                                                activeSheetName === sheet.name && "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400",
                                                isExcluded && "opacity-50 text-slate-500"
                                            )}
                                        >
                                            {sheet.name}
                                            {isExcluded && <span className="absolute top-0 right-1 text-red-500 text-[10px] m-0 leading-none">x</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {activeSheetName && currentActiveSheetData ? (
                    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2 border-b border-slate-700/50 gap-4">
                            <CardTitle className="text-xl flex flex-wrap items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-400" />
                                {activeSheetName}
                                <Badge variant="outline" className="ml-2 text-xs font-normal text-slate-400">
                                    {currentActiveSheetData.data.length} รายชื่อ
                                </Badge>
                                {excludedSheets.includes(activeSheetName) && <Badge variant="destructive" className="text-xs">Excluded</Badge>}
                            </CardTitle>
                            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAutofill}
                                    disabled={isDbLoading || isUpdatingSheet}
                                    className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                                >
                                    <Wand2 className="h-4 w-4 mr-2" />
                                    Autofill Missing Data
                                </Button>
                                <Button
                                    variant={highlightDuplicates ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={handleToggleHighlight}
                                    disabled={isUpdatingSheet}
                                    className={highlightDuplicates
                                        ? "bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30"
                                        : "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                    }
                                >
                                    {isUpdatingSheet ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                    {highlightDuplicates ? "Reset Highlight" : (checkAllSheets ? "Highlight Duplicates (All Sheets)" : "Highlight Duplicates (This Sheet)")}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto max-h-[600px]">
                                <Table>
                                    <TableHeader className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                                        <TableRow className="border-b border-slate-700">
                                            <TableHead className="w-[60px] min-w-[50px] text-center text-slate-300 border-r border-slate-700/50">ลำดับ</TableHead>
                                            <TableHead className="w-[80px] min-w-[70px] text-slate-300 border-r border-slate-700/50">ยศ</TableHead>
                                            <TableHead className="min-w-[180px] text-slate-300 border-r border-slate-700/50">ชื่อ - สกุล</TableHead>
                                            <TableHead className="min-w-[120px] text-slate-300 border-r border-slate-700/50">ตำแหน่ง</TableHead>
                                            <TableHead className="min-w-[100px] text-slate-300 border-r border-slate-700/50">สังกัด</TableHead>
                                            <TableHead className="w-[60px] min-w-[50px] text-center text-slate-300 border-r border-slate-700/50">เกรด</TableHead>
                                            <TableHead className="min-w-[150px] text-slate-300">หมายเหตุ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="bg-slate-900/30">
                                        {currentActiveSheetData.data.map((rowObj, rIdx) => {
                                            if (!rowObj?.cells) return null; // Safety
                                            const row = rowObj.cells;
                                            const surname = normalize(row[3]);
                                            const isDup = highlightDuplicates && duplicateSet && duplicateSet.get(surname)! > 1;

                                            // Grade lookup
                                            const person = dbPersons?.find(p => p.ชื่อ === normalize(row[2]) && p.สกุล === normalize(row[3]));
                                            const grade = person?.คัดเกรด || "-";

                                            return (
                                                <TableRow key={rIdx} className={cn("border-b border-slate-800/50 transition-colors", isDup ? "bg-red-900/20 hover:bg-red-900/30" : "hover:bg-slate-800/50")}>
                                                    <TableCell className="text-center font-mono text-slate-400 border-r border-slate-700/50 whitespace-nowrap">{row[0]}</TableCell>
                                                    <TableCell className="text-slate-300 truncate max-w-[80px] border-r border-slate-700/50 whitespace-nowrap" title={row[1]}>{row[1]}</TableCell>
                                                    <TableCell className={cn("relative group border-r border-slate-700/50 whitespace-nowrap", isDup ? "text-red-300 font-semibold" : "")}>
                                                        <span>{row[2]}  {row[3]}</span>
                                                        {isDup && <Badge variant="destructive" className="ml-2 text-[10px] h-4 inline-flex">ซ้ำ ({duplicateSet?.get(surname)})</Badge>}
                                                        <Button variant="ghost" size="icon" className="h-5 w-5 ml-2 opacity-0 group-hover:opacity-100 bg-slate-800/80 hover:bg-blue-600 hover:text-white border border-slate-600 rounded-full inline-flex items-center justify-center transition-opacity"
                                                            onClick={() => {
                                                                setEditingRow(rowObj);
                                                                setManualSearchTerm(typeof row[2] === 'string' ? row[2] : String(row[2] || ""));
                                                            }}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="text-slate-300 text-xs border-r border-slate-700/50 whitespace-nowrap">{row[6]}</TableCell>
                                                    <TableCell className="text-slate-300 text-xs border-r border-slate-700/50 whitespace-nowrap">{row[7]}</TableCell>
                                                    <TableCell className="text-center text-slate-300 text-xs font-mono border-r border-slate-700/50 whitespace-nowrap">{grade}</TableCell>
                                                    <TableCell className="text-slate-400 text-sm whitespace-nowrap">{row[9]}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    !isLoading && sheets.length === 0 && (
                        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-lg bg-slate-800/20">
                            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>ยังไม่มีข้อมูล กรุณาโหลดลิงก์ Google Sheets</p>
                        </div>
                    )
                )}

                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm mt-6">
                    <CardHeader className="border-b border-slate-700/50">
                        <CardTitle className="flex items-center gap-2 text-xl text-orange-400">
                            <Wand2 className="h-5 w-5" />
                            จัดยอด / สุ่มรายชื่อ (Random Duty)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Main Settings Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1: Criteria */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-orange-300 flex items-center gap-2">
                                    <Settings className="h-4 w-4" /> เกณฑ์การสุ่ม (Criteria)
                                    <Badge variant="secondary" className="ml-2 text-[10px] h-5 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20">
                                        เหลือ {filteredCandidates.length}/{dbPersons.length}
                                    </Badge>
                                </h3>

                                <div className="space-y-2">
                                    <Label>จำนวนที่ต้องการ (คน)</Label>
                                    <Input type="number" value={randomCount} onChange={e => setRandomCount(Number(e.target.value))} className="bg-slate-900/50 border-slate-600" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <Label>ช่วงส่วนสูง (ซม.)</Label>
                                            <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                                {filterHeightRange[0]} - {filterHeightRange[1]}
                                            </span>
                                        </div>
                                        <Slider
                                            defaultValue={[160, 200]}
                                            max={200}
                                            min={0}
                                            step={1}
                                            value={filterHeightRange}
                                            onValueChange={setFilterHeightRange}
                                            className="py-4"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label>ตัดเกรดที่ไม่ต้องการ</Label>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => setExcludedGrades(uniqueGrades)} className="text-[10px] h-5 px-1 hover:bg-slate-700">All</Button>
                                                <Button variant="ghost" size="sm" onClick={() => setExcludedGrades([])} className="text-[10px] h-5 px-1 hover:bg-slate-700">None</Button>
                                            </div>
                                        </div>
                                        <div className="h-32 overflow-y-auto border border-slate-700 rounded p-2 bg-slate-900/30 custom-scrollbar space-y-1">
                                            {uniqueGrades.length > 0 ? uniqueGrades.map(g => (
                                                <div key={g} className="flex items-center space-x-2 p-1 hover:bg-slate-800/50 rounded">
                                                    <Checkbox
                                                        id={`grade-${g}`}
                                                        checked={excludedGrades.includes(g)}
                                                        onCheckedChange={() => handleToggleGrade(g)}
                                                        className="border-slate-500 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                    />
                                                    <Label htmlFor={`grade-${g}`} className="text-sm cursor-pointer hover:text-red-300 flex-1">{g || "(ว่าง)"}</Label>
                                                </div>
                                            )) : <div className="text-xs text-slate-500 text-center py-4">กำลังโหลด...</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>เลือกสังกัด (ทั้งหมดหากไม่เลือก)</Label>
                                    <div className="h-48 overflow-y-auto border border-slate-700 rounded p-2 bg-slate-900/30 custom-scrollbar space-y-1">
                                        {uniqueAffiliations.length > 0 ? uniqueAffiliations.map(aff => (
                                            <div key={aff} className="flex items-center space-x-2 p-1 hover:bg-slate-800/50 rounded">
                                                <Checkbox
                                                    id={`aff-${aff}`}
                                                    checked={selectedAffiliations.includes(aff)}
                                                    onCheckedChange={() => handleToggleAffiliation(aff)}
                                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                                />
                                                <Label htmlFor={`aff-${aff}`} className="text-sm cursor-pointer hover:text-blue-300 flex-1">{aff}</Label>
                                            </div>
                                        )) : <div className="text-xs text-slate-500 text-center py-4">โหลดฐานข้อมูลเพื่อแสดงสังกัด...</div>}
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Exclusions */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-red-300 flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> การตัดรายชื่อ (Exclusions)</h3>

                                <div className="space-y-2 border p-3 rounded-lg border-red-500/20 bg-red-500/5">
                                    <div className="flex items-center justify-between">
                                        <Label>ตัดรายชื่อจากชีทในลิงก์</Label>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setExcludedSheets(sheets.map(s => s.name))} className="text-xs h-6 px-2 hover:bg-red-500/20 hover:text-red-300">เลือกทั้งหมด</Button>
                                            <Button variant="ghost" size="sm" onClick={() => setExcludedSheets([])} className="text-xs h-6 px-2 hover:bg-slate-700">ล้าง</Button>
                                        </div>
                                    </div>
                                    <div className="h-32 overflow-y-auto border border-slate-700 rounded p-2 bg-slate-900/30 custom-scrollbar space-y-1">
                                        {sheets.length > 0 ? sheets.map(sheet => (
                                            <div key={sheet.name} className="flex items-center space-x-2 p-1 hover:bg-slate-800/50 rounded">
                                                <Checkbox
                                                    id={`ex-sheet-${sheet.name}`}
                                                    checked={excludedSheets.includes(sheet.name)}
                                                    onCheckedChange={() => toggleExclusion(sheet.name)}
                                                    className="border-slate-500 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                />
                                                <Label htmlFor={`ex-sheet-${sheet.name}`} className="text-sm cursor-pointer hover:text-red-300 flex-1">{sheet.name}</Label>
                                            </div>
                                        )) : <div className="text-xs text-slate-500 text-center py-4">ยังไม่ได้โหลดลิงก์...</div>}
                                    </div>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <UserMinus className="h-3 w-3" /> รายชื่อในชีทที่ถูกติ๊ก จะไม่ถูกนำมาสุ่ม
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>ตัดจากไฟล์ Excel ภายนอก</Label>
                                    <Input type="file" accept=".xlsx, .xls" onChange={handleFileUploadExclusion} className="bg-slate-900/50 border-slate-600 text-xs" />
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <div className="flex items-center space-x-2 bg-slate-900/40 p-2 rounded border border-slate-700/50">
                                        <Switch id="ex-admin" checked={excludeAdmin433} onCheckedChange={setExcludeAdmin433} />
                                        <Label htmlFor="ex-admin" className="cursor-pointer">ตัดธุรการ 433</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-slate-900/40 p-2 rounded border border-slate-700/50">
                                        <Switch id="ex-ath" checked={excludeAthletes} onCheckedChange={setExcludeAthletes} />
                                        <Label htmlFor="ex-ath" className="cursor-pointer">ตัดนักกีฬา</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-slate-900/40 p-2 rounded border border-slate-700/50">
                                        <Switch id="ex-faw" checked={excludeFaw} onCheckedChange={setExcludeFaw} />
                                        <Label htmlFor="ex-faw" className="cursor-pointer">ตัดฝอ.</Label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleRandomize} className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold h-12 text-lg shadow-lg">
                            <Wand2 className="h-5 w-5 mr-2" />
                            สุ่มรายชื่อ (Process Randomization)
                        </Button>

                        {/* Manual Edit Dialog */}
                        <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
                            <DialogContent className="bg-slate-800 border-slate-700 text-white">
                                <DialogHeader>
                                    <DialogTitle>แก้ไขข้อมูลรายบุคคล (Manual Fix)</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        ค้นหาชื่อที่ถูกต้องเพื่อแทนที่ข้อมูลในแถวที่ {editingRow ? editingRow.index + 1 : ""}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="flex gap-2 p-2 bg-slate-900/50 rounded text-sm text-slate-300">
                                        <span>Current:</span>
                                        <span className="font-semibold text-white">{editingRow?.cells[2]} {editingRow?.cells[3]}</span>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="พิมพ์ชื่อหรือสกุล..."
                                            value={manualSearchTerm}
                                            onChange={e => setManualSearchTerm(e.target.value)}
                                            className="pl-9 bg-slate-900 border-slate-600"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto space-y-1 border border-slate-700 rounded p-1">
                                        {manualSearchResults.length > 0 ? manualSearchResults.map((p, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-2 hover:bg-blue-600/20 rounded cursor-pointer group"
                                                onClick={() => handleConfirmManualUpdate(p)}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-white">{p.ยศ} {p.ชื่อ} {p.สกุล}</span>
                                                    <span className="text-xs text-slate-400">{p.สังกัด} | ชั้น {p.ชั้นปีที่}</span>
                                                </div>
                                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6">เลือก</Button>
                                            </div>
                                        )) : (
                                            <div className="text-center py-4 text-slate-500 text-xs">{manualSearchTerm ? "ไม่พบรายชื่อ" : "พิมพ์เพื่อค้นหา..."}</div>
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Results Table */}
                        {generatedList.length > 0 && (
                            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                                        ผลลัพธ์การสุ่ม ({generatedList.length} นาย)
                                    </h3>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setGeneratedList([])} className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"><Trash2 className="h-4 w-4 mr-2" /> ล้างรายการ</Button>
                                        <Button variant="outline" size="sm" onClick={handleAddRow}><Plus className="h-4 w-4 mr-2" /> เพิ่มแถว</Button>
                                        <Button onClick={handleAddGeneratedToLink} disabled={isUpdatingSheet || !activeSheetName} className="bg-green-600 hover:bg-green-700">
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            เพิ่มเข้าในลิงก์ ({activeSheetName})
                                        </Button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border rounded-md border-slate-700">
                                    <Table>
                                        <TableHeader className="bg-slate-900">
                                            <TableRow>
                                                <TableHead className="w-[50px]">#</TableHead>
                                                <TableHead>ยศ</TableHead>
                                                <TableHead>ชื่อ</TableHead>
                                                <TableHead>สกุล</TableHead>
                                                <TableHead>สังกัด</TableHead>
                                                <TableHead>ตำแหน่ง</TableHead>
                                                <TableHead>หมายเหตุ</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {generatedList.map((p, i) => (
                                                <TableRow key={i} className="hover:bg-slate-800/50">
                                                    <TableCell className="text-slate-400">{i + 1}</TableCell>
                                                    <TableCell><Input value={p.ยศ} onChange={e => handlRowChange(i, 'ยศ', e.target.value)} className="h-8 bg-transparent border-transparent hover:border-slate-600 focus:border-blue-500" /></TableCell>
                                                    <TableCell><Input value={p.ชื่อ} onChange={e => handlRowChange(i, 'ชื่อ', e.target.value)} className="h-8 bg-transparent border-transparent hover:border-slate-600 focus:border-blue-500" /></TableCell>
                                                    <TableCell><Input value={p.สกุล} onChange={e => handlRowChange(i, 'สกุล', e.target.value)} className="h-8 bg-transparent border-transparent hover:border-slate-600 focus:border-blue-500" /></TableCell>
                                                    <TableCell><Input value={p.สังกัด} onChange={e => handlRowChange(i, 'สังกัด', e.target.value)} className="h-8 bg-transparent border-transparent hover:border-slate-600 focus:border-blue-500" /></TableCell>
                                                    <TableCell><Input value={p.ตำแหน่ง} onChange={e => handlRowChange(i, 'ตำแหน่ง', e.target.value)} className="h-8 bg-transparent border-transparent hover:border-slate-600 focus:border-blue-500" /></TableCell>
                                                    <TableCell><Input value={p.หมายเหตุ || ""} onChange={e => handlRowChange(i, 'หมายเหตุ', e.target.value)} className="h-8 bg-transparent border-transparent hover:border-slate-600 focus:border-blue-500" /></TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(i)} className="text-red-400 hover:text-red-300 hover:bg-red-950/30 w-6 h-6">
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
