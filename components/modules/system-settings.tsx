"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Settings,
    ArrowLeft,
    Save,
    RefreshCw,
    Database,
    ShieldCheck,
    Plus,
    Loader2,
    ExternalLink,
    Globe,
    FileSpreadsheet,
    FileText,
    Table,
    Edit3,
    Layers,
    ChevronRight,
    Search,
    Download,
    Lock,
    Folder,
    Image as ImageIcon,
    FolderOpen
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface SystemSettingsProps {
    onBack: () => void
}

interface EnvInfo {
    clientEmail?: string;
    projectId?: string;
    adminSpreadsheetId?: string;
    nodeEnv?: string;
}

const DB_MAP = [
    {
        key: "CEREMONY_SPREADSHEET_ID",
        label: "ฐานข้อมูลนักเรียน (พิธีการ)",
        description: "ใช้สำหรับ จัดยอดพิธี, สถิติโดนยอด, รายงานยอดปล่อย",
        default: "1fItcYVGL1a5WcvVsdleZhe5WT8VoJ6YGgPTJFMNozrw",
        icon: <UsersIcon className="h-5 w-5 text-teal-400" />
    },
    {
        key: "DUTY_433_SPREADSHEET_ID",
        label: "ฐานข้อมูลหน้าที่ 433 & เกรด",
        description: "ใช้สำหรับ หน้าที่ 433, คัดเกรด, ประวัติการปฏิบัติหน้าที่",
        default: "1E0cu1J33gpRA-OHyNYL7tND30OoHBX4YpeoQ7JFUOaQ",
        icon: <AwardIcon className="h-5 w-5 text-amber-400" />
    },
    {
        key: "WEEKLY_433_SPREADSHEET_ID",
        label: "ตารางเวร 433 รายสัปดาห์",
        description: "ใช้สำหรับ ดึงรายชื่อเวรประจำวันเสาร์-อาทิตย์",
        default: "1TwqqgEhug2_oe2iIPlR9q-1pGuGIqMGswtPEnLzzcSk",
        icon: <CalendarIcon className="h-5 w-5 text-blue-400" />
    },
    {
        key: "NIGHT_DUTY_SPREADSHEET_ID",
        label: "ฐานข้อมูลเวรรักษาการณ์",
        description: "ใช้สำหรับ จัดการเวรยืนกลางคืน และแท็กเวร",
        default: "1PjT38W2Zx7KV764yv9Vjwo9i0TJPacRI0iUGzP0ItAU",
        icon: <ShieldCheck className="h-5 w-5 text-indigo-400" />
    },
    {
        key: "WEEKEND_DUTY_SPREADSHEET_ID",
        label: "ฐานข้อมูลเวรเตรียมการ",
        description: "ใช้สำหรับ จัดการเวรเสาร์-อาทิตย์และวันหยุด",
        default: "1ufm0LPa4c903jhlANKn_YqNyMtG9id0iN-tMHrhNRA8",
        icon: <CalendarIcon className="h-5 w-5 text-rose-400" />
    },
    {
        key: "RELEASE_REPORT_SPREADSHEET_ID",
        label: "ไฟล์รายงานยอดปล่อยบ้าน",
        description: "ใช้สำหรับ สร้างไฟล์สรุปยอดปล่อยประจำสัปดาห์",
        default: "1_kKUegxtwwd3ce3EduPqRoPpgAF1_IcecA1ri9Pfxz0",
        icon: <FileText className="h-5 w-5 text-emerald-400" />
    },
    {
        key: "LOG_LOGIN_SPREADSHEET_ID",
        label: "บันทึกการเข้าใช้งาน (Logs)",
        description: "ใช้สำหรับ บันทึกประวัติการ Login และความปลอดภัย",
        default: "1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw",
        icon: <ShieldCheck className="h-5 w-5 text-slate-400" />
    },
    {
        key: "GOOGLE_DRIVE_ROOT_ID",
        label: "คลังไฟล์หลัก (Drive Root)",
        description: "โฟลเดอร์หลักที่เก็บไฟล์ ฉก. และประวัติของ นนร. ทั้งหมด",
        default: "1yNdCSMtz0vE4b4Kugap5JPHH86r7zyp_",
        icon: <Folder className="h-5 w-5 text-blue-400" />,
        isFolder: true
    },
    {
        key: "GOOGLE_DRIVE_PRIORITY_ID",
        label: "โฟลเดอร์ไฟล์เร่งด่วน (Priority)",
        description: "ใช้สำหรับค้นหาไฟล์นำร่องก่อนค้นหาในคลังหลัก",
        default: "1AvPt_VAEt1FNbDLgUwykfhMljBXoTdcY",
        icon: <FolderOpen className="h-5 w-5 text-amber-500" />,
        isFolder: true
    },
    {
        key: "GOOGLE_DRIVE_IMAGE_ID",
        label: "คลังรูปภาพ นนร. (Images)",
        description: "โฟลเดอร์หลักที่เก็บรูปภาพ นนร. ทั้งหมดในระบบ",
        default: "17h7HzW7YQqXeVH7-A-EhkJKQOmGNUC5s",
        icon: <ImageIcon className="h-5 w-5 text-purple-400" />,
        isFolder: true
    },
    {
        key: "GOOGLE_DRIVE_ADDITIONAL_ID",
        label: "คลังไฟล์เพิ่มเติม (Additional Files)",
        description: "ใช้สำหรับเก็บไฟล์ชั่วคราวหรือไฟล์ที่ดึงผ่าน fetch-file-link",
        default: "1DsLfQC3x4G2swC8L92IuipH1XqCsKwtb",
        icon: <Folder className="h-5 w-5 text-emerald-400" />,
        isFolder: true
    }
]

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}

function AwardIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
        </svg>
    )
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
    )
}

export function SystemSettings({ onBack }: SystemSettingsProps) {
    const [configs, setConfigs] = useState<Record<string, string>>({})
    const [envInfo, setEnvInfo] = useState<EnvInfo>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const { toast } = useToast()

    const fetchConfigs = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/config")
            const data = await res.json()
            if (data.success) {
                setConfigs(data.configs)
                setEnvInfo(data.envInfo)
            } else {
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: data.error || "ไม่สามารถโหลดข้อมูลตั้งค่าได้",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error fetching configs:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchConfigs()
    }, [])

    const handleUpdate = async (key: string, value: string) => {
        if (!value) return
        setSaving(key)
        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, value }),
            })
            const data = await res.json()
            if (data.success) {
                toast({
                    title: "อัปเดตสำเร็จ",
                    description: `บันทึกพิกัด ${key} เรียบร้อยแล้ว`,
                })
                setConfigs(prev => ({ ...prev, [key]: value }))
            } else {
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: data.error || "ไม่สามารถอัปเดตข้อมูลได้",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error updating config:", error)
        } finally {
            setSaving(null)
        }
    }

    // Database Viewer State
    const [viewingDb, setViewingDb] = useState<{ id: string, label: string } | null>(null)
    const [dbSheets, setDbSheets] = useState<{ title: string }[]>([])
    const [activeSheet, setActiveSheet] = useState<string>("")
    const [sheetData, setSheetData] = useState<any[][]>([])
    const [loadingDb, setLoadingDb] = useState(false)
    const [loadingSheet, setLoadingSheet] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editedData, setEditedData] = useState<any[][]>([])

    const fetchSheets = async (spreadsheetId: string, label: string) => {
        setViewingDb({ id: spreadsheetId, label })
        setLoadingDb(true)
        try {
            const res = await fetch(`/api/admin/database?spreadsheetId=${spreadsheetId}`)
            const data = await res.json()
            if (data.success) {
                setDbSheets(data.sheets)
                if (data.sheets.length > 0) {
                    fetchSheetData(spreadsheetId, data.sheets[0].title)
                }
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingDb(false)
        }
    }

    const fetchSheetData = async (spreadsheetId: string, sheetName: string) => {
        setActiveSheet(sheetName)
        setLoadingSheet(true)
        setIsEditing(false)
        try {
            const res = await fetch(`/api/admin/database?spreadsheetId=${spreadsheetId}&sheetName=${encodeURIComponent(sheetName)}`)
            const data = await res.json()
            if (data.success) {
                setSheetData(data.values)
                setEditedData(data.values)
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingSheet(false)
        }
    }

    const handleSaveSheet = async () => {
        if (!viewingDb) return
        setLoadingSheet(true)
        try {
            const res = await fetch("/api/admin/database", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    spreadsheetId: viewingDb.id,
                    sheetName: activeSheet,
                    values: editedData
                })
            })
            const data = await res.json()
            if (data.success) {
                toast({ title: "บันทึกสำเร็จ", description: "ข้อมูลใน Google Sheets ถูกอัปเดตเรียบร้อยแล้ว" })
                setSheetData(editedData)
                setIsEditing(false)
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingSheet(false)
        }
    }

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newData = [...editedData]
        if (!newData[rowIndex]) newData[rowIndex] = []
        newData[rowIndex][colIndex] = value
        setEditedData(newData)
    }

    const addNewRow = () => {
        const numCols = sheetData[0]?.length || 10
        setEditedData([...editedData, new Array(numCols).fill("")])
        setIsEditing(true)
    }

    const openSheet = (id: string, isFolder: boolean = false) => {
        if (!id) return
        const url = isFolder
            ? `https://drive.google.com/drive/folders/${id}`
            : `https://docs.google.com/spreadsheets/d/${id}/edit`
        window.open(url, "_blank")
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 p-2 h-auto text-sm transition-all">
                            <ArrowLeft className="h-5 w-5 mr-1" /> กลับแดชบอร์ด
                        </Button>
                        <div className="h-8 w-[1px] bg-slate-700 hidden md:block" />
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                                <Database className="h-6 w-6 text-teal-400" />
                                <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Infrastructure Dashboard</span>
                            </h1>
                            <p className="text-slate-400 text-xs mt-1">จัดการและตรวจสอบเส้นทางการเชื่อมต่อฐานข้อมูล Google Sheets ทั้งหมด</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex flex-col items-end mr-2">
                            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM READY
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono uppercase truncate max-w-[150px]">{envInfo.clientEmail}</span>
                        </div>
                        <Button
                            variant="outline"
                            className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 transition-all border-dashed"
                            onClick={fetchConfigs}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> รีเฟรชข้อมูล
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Main Config List */}
                    <div className="xl:col-span-3 space-y-6">
                        <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-xl border-t-0 overflow-hidden shadow-2xl">
                            <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500" />
                            <CardHeader className="bg-slate-900/40 border-b border-slate-700/50 py-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-teal-400" />
                                    Database Registry
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-4">
                                        <div className="relative h-12 w-12">
                                            <Loader2 className="h-12 w-12 animate-spin text-teal-500 absolute inset-0" />
                                            <div className="h-12 w-12 rounded-full border-4 border-slate-700/50 absolute inset-0" />
                                        </div>
                                        <p className="text-sm font-medium animate-pulse">กำลังอ่านพิกัดข้อมูลล่าสุด...</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-700/50">
                                        {DB_MAP.map((db) => {
                                            const currentId = configs[db.key] || db.default
                                            return (
                                                <div key={db.key} className="p-6 hover:bg-slate-800/30 transition-all group">
                                                    <div className="flex flex-col lg:flex-row gap-6">
                                                        <div className="flex-1 space-y-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700">
                                                                    {db.icon}
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-bold text-white group-hover:text-teal-400 transition-colors">{db.label}</h3>
                                                                    <p className="text-xs text-slate-500">{db.description}</p>
                                                                </div>
                                                            </div>

                                                            <div className="relative group/input">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[10px] select-none uppercase">ID:</div>
                                                                <Input
                                                                    defaultValue={currentId}
                                                                    className="bg-slate-900/60 border-slate-700 pl-10 h-10 font-mono text-sm text-teal-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                                                                    id={`input-${db.key}`}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex lg:flex-col justify-end gap-2 shrink-0 lg:min-w-[120px]">
                                                            <Button
                                                                variant="outline"
                                                                className="flex-1 bg-slate-900/60 border-slate-700 hover:bg-slate-800 text-xs gap-2"
                                                                onClick={() => {
                                                                    if ((db as any).isFolder) {
                                                                        openSheet(currentId, true)
                                                                    } else {
                                                                        fetchSheets(currentId, db.label)
                                                                    }
                                                                }}
                                                            >
                                                                {(db as any).isFolder ? (
                                                                    <FolderOpen className="h-3 w-3 text-blue-400" />
                                                                ) : (
                                                                    <Table className="h-3 w-3 text-teal-400" />
                                                                )}
                                                                {(db as any).isFolder ? "เปิดคลังไฟล์" : "ดูโครงสร้าง"}
                                                            </Button>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    className="flex-1 bg-slate-900/40 border-slate-800 hover:bg-slate-800 text-[10px] h-8"
                                                                    onClick={() => openSheet(currentId, (db as any).isFolder)}
                                                                >
                                                                    <ExternalLink className="h-3 w-3 mr-1" /> {(db as any).isFolder ? "เปิดใน Drive" : "ไฟล์จริง"}
                                                                </Button>
                                                                <Button
                                                                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold h-8 text-[10px] gap-1 shadow-lg shadow-teal-900/20"
                                                                    disabled={saving === db.key}
                                                                    onClick={() => {
                                                                        const val = (document.getElementById(`input-${db.key}`) as HTMLInputElement).value
                                                                        handleUpdate(db.key, val)
                                                                    }}
                                                                >
                                                                    {saving === db.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                                    บันทึก
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-xl group hover:border-blue-500/50 transition-all">
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-400">
                                    <Lock className="h-4 w-4 text-blue-400" /> Root Authentication Node
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-white">ADMIN REGISTRY (CORE)</p>
                                        <p className="text-[10px] font-mono text-slate-500">{envInfo.adminSpreadsheetId}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5">System Level</Badge>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-500/10" onClick={() => openSheet(envInfo.adminSpreadsheetId || "")}>
                                            <ExternalLink className="h-4 w-4 text-blue-400" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 ml-1">
                                    * ฐานข้อมูลหลัก (Core) ใช้สำหรับจัดการ User และ Config ของทั้งระบบ ไม่สามารถย้ายพิกัดผ่านหน้านี้ได้เพื่อความปลอดภัย
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Sidebar: Health & Meta */}
                    <div className="space-y-6">
                        <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <CardHeader className="bg-teal-600/10 border-b border-teal-500/20 py-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-teal-400">
                                    <ShieldCheck className="h-4 w-4" /> System Health
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-700/30">
                                        <span className="text-[11px] font-medium text-slate-300">Sheets Service</span>
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0 h-5 text-[9px] font-bold">ACTIVE</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-700/30">
                                        <span className="text-[11px] font-medium text-slate-300">Drive Service</span>
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0 h-5 text-[9px] font-bold">ACTIVE</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-700/30">
                                        <span className="text-[11px] font-medium text-slate-300">Rate Limiter</span>
                                        <Badge className="bg-blue-500/20 text-blue-400 border-0 h-5 text-[9px] font-bold">READY</Badge>
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-700">
                                    <div className="flex items-center gap-2 mb-2 text-slate-500">
                                        <Globe className="h-3 w-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Environment</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-slate-500">Project ID:</span>
                                            <span className="text-slate-300 font-mono">{envInfo.projectId}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-slate-500">Mode:</span>
                                            <Badge variant="outline" className="h-4 text-[8px] bg-amber-500/5 text-amber-500 border-amber-500/30">PRODUCTION</Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute -right-6 -bottom-6 text-blue-500/10 group-hover:scale-110 transition-transform">
                                <Database className="h-24 w-24" />
                            </div>
                            <h4 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <Settings className="h-3 w-3" /> Quick Tip
                            </h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                เมื่อคุณเปลี่ยน Spreadsheet ID ในหน้านี้ ระบบจะบันทึกลงฐานข้อมูลพิกัดทันที (Dynamic Registry)
                                โดยโมดูลต่างๆ ในแอปจะเริ่มดึงข้อมูลจากไฟล์ใหม่โดยอาศัย Key ที่คุณกำหนดไว้
                                <b> แนะนำให้ตรวจสอบหัวข้อคอลัมน์ของไฟล์ใหม่ให้ตรงตามมาตรฐานเดิมเสมอ</b>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Database Explorer Dialog */}
            <Dialog open={!!viewingDb} onOpenChange={(open) => !open && setViewingDb(null)}>
                <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] bg-slate-900 border-slate-700 flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                                    <Database className="h-5 w-5 text-teal-400" />
                                    {viewingDb?.label}
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 font-mono text-[10px] mt-1">
                                    Spreadsheet ID: {viewingDb?.id}
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={isEditing ? "default" : "outline"}
                                    className={isEditing ? "bg-amber-600 hover:bg-amber-500" : "bg-slate-800 border-slate-700"}
                                    onClick={() => {
                                        if (isEditing) {
                                            setEditedData(sheetData)
                                            setIsEditing(false)
                                        } else {
                                            setIsEditing(true)
                                        }
                                    }}
                                >
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    {isEditing ? "ยกเลิกการแก้ไข" : "โหมดแก้ไข"}
                                </Button>
                                {isEditing && (
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/40" onClick={handleSaveSheet}>
                                        <Save className="h-4 w-4 mr-2" />
                                        บันทึกไปยังคลาวด์
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Sheet Tabs */}
                        <div className="flex items-center gap-1 mt-4 overflow-x-auto no-scrollbar">
                            {dbSheets.map(s => (
                                <Button
                                    key={s.title}
                                    size="sm"
                                    variant="ghost"
                                    className={`rounded-t-lg rounded-b-none border-b-2 transition-all px-4 ${activeSheet === s.title
                                        ? "bg-slate-800 border-teal-500 text-white"
                                        : "hover:bg-slate-800 border-transparent text-slate-500"}`}
                                    onClick={() => fetchSheetData(viewingDb?.id || "", s.title)}
                                >
                                    <Layers className="h-3 w-3 mr-2" />
                                    {s.title}
                                </Button>
                            ))}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto bg-slate-950 p-0 relative">
                        {loadingSheet ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-50">
                                <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
                            </div>
                        ) : (
                            <div className="min-w-full inline-block align-middle">
                                <table className="min-w-full border-collapse">
                                    <thead className="sticky top-0 z-10 bg-slate-900 shadow-md">
                                        <tr>
                                            <th className="p-2 border border-slate-700 bg-slate-800 text-[10px] text-slate-500 w-10 font-mono text-center">#</th>
                                            {sheetData[0]?.map((col, idx) => (
                                                <th key={idx} className="p-3 border border-slate-700 text-left text-xs font-bold text-slate-300 uppercase tracking-wider min-w-[120px]">
                                                    {isEditing ? (
                                                        <input
                                                            value={editedData[0]?.[idx] || ""}
                                                            onChange={(e) => handleCellChange(0, idx, e.target.value)}
                                                            className="bg-slate-800 border-slate-600 w-full px-1 rounded focus:ring-1 focus:ring-teal-500 outline-none"
                                                        />
                                                    ) : (
                                                        col || `Column ${idx + 1}`
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {(isEditing ? editedData : sheetData).slice(1).map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-slate-900/50 transition-colors">
                                                <td className="p-2 border border-slate-800/50 bg-slate-900/30 text-[10px] font-mono text-slate-600 text-center">{rIdx + 1}</td>
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className="p-2 border border-slate-800/50 text-xs text-slate-400">
                                                        {isEditing ? (
                                                            <input
                                                                value={cell || ""}
                                                                onChange={(e) => handleCellChange(rIdx + 1, cIdx, e.target.value)}
                                                                className="bg-transparent hover:bg-slate-800/50 focus:bg-slate-800 border-none w-full px-1 py-1 rounded transition-all focus:ring-1 focus:ring-teal-500 outline-none text-teal-200"
                                                            />
                                                        ) : (
                                                            cell || "-"
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {isEditing && (
                                            <tr>
                                                <td colSpan={(sheetData[0]?.length || 0) + 1} className="p-4 bg-slate-900/20 text-center">
                                                    <Button variant="ghost" size="sm" className="text-teal-400 hover:text-teal-300 hover:bg-teal-400/10 border border-dashed border-teal-500/30" onClick={addNewRow}>
                                                        <Plus className="h-4 w-4 mr-2" /> เพิ่มแถวใหม่
                                                    </Button>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                {sheetData.length === 0 && !loadingSheet && (
                                    <div className="py-20 text-center text-slate-600 space-y-2">
                                        <Search className="h-10 w-10 mx-auto opacity-20" />
                                        <p>ไม่พบข้อมูลในชีทนี้</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between sm:justify-between">
                        <div className="text-[10px] text-slate-500 flex items-center gap-4 font-mono">
                            <span>TOTAL ROWS: {(isEditing ? editedData : sheetData).length}</span>
                            <span>TOTAL COLS: {(isEditing ? editedData : sheetData)[0]?.length || 0}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setViewingDb(null)}>ปิดหน้าต่าง</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
