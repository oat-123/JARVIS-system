"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import * as XLSX from "xlsx"
// ฟังก์ชันช่วยโหลดประวัติยอดจาก localStorage
function getDutyHistory() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('jarvis-duty-history') || '[]');
  } catch {
    return [];
  }
}
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Settings,
  LogOut,
  User,
  Shield,
  Calendar,
  Award,
  FileText,
  FileSpreadsheet,
  BarChart3,
  Globe,
  ChevronDown,
  X,
} from "lucide-react"
import { CeremonyDuty } from "./modules/ceremony-duty";
import { NightDuty } from "./modules/night-duty"
import { WeekendDuty } from "./modules/weekend-duty"
import { ReleaseReport } from "./modules/release-report"
import { Statistics } from "./modules/statistics"
import { Duty433 } from "./modules/duty-433"
import { ExcelManager } from "./modules/excel-manager"
import { SystemSettings } from "./modules/system-settings"
import { CreateFiles } from "./modules/create-files"


interface DashboardProps {
  user: {
    username?: string
    displayName: string
    role: string
    group: string
    sheetname: string
    displayRole?: string
  } | null
  username: string | null
  onLogout: () => void
}

export function Dashboard({ user, username, onLogout }: DashboardProps) {
  // State สำหรับ modal แสดงประวัติยอด
  const [showHistoryPage, setShowHistoryPage] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'report' | 'excel'>('all');
  const [dutyHistory, setDutyHistory] = useState<any[]>([]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [excelPreview, setExcelPreview] = useState<{ sheets: string[], data: any[][], sheetName: string } | null>(null);

  // State สำหรับแสดงไฟล์จาก Google Sheets
  const [googleSheetsFiles, setGoogleSheetsFiles] = useState<any[]>([]);

  // Session info state
  const [sessionInfo, setSessionInfo] = useState<{ expiryTime: number, isRemembered: boolean } | null>(null);

  const previewExcelFile = async (base64String: any, idx: number) => {
    try {
      const stringValue = String(base64String || ''); // Ensure it's a string, even if base64String is null/undefined
      if (!stringValue) { // Add check for empty string
        console.error("Invalid base64 input: Content is empty. Cannot preview file.");
        setPreviewIdx(null);
        setExcelPreview({ sheets: [], data: [], sheetName: '' });
        return;
      }
      const parts = stringValue.split(",");
      if (parts.length < 2) {
        console.error("Invalid base64 input: Missing comma separator. Cannot preview file.");
        setPreviewIdx(null);
        setExcelPreview({ sheets: [], data: [], sheetName: '' });
        return; // Exit the function gracefully
      }

      const raw = parts[1];
      const data = atob(raw);
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < data.length; ++i) {
        bytes[i] = data.charCodeAt(i);
      }

      const workbook = XLSX.read(bytes.buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];

      const dataRows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 3 }) as any[][];
      const filtered = dataRows
        .filter(row => row && row.length >= 4 && (row[0] || row[2] || row[3]))
        .slice(0, 20);

      setPreviewIdx(idx);
      setExcelPreview({
        sheets: workbook.SheetNames,
        sheetName,
        data: filtered
      });
    } catch (e) {
      console.error("Preview failed:", e);
      setPreviewIdx(null);
      setExcelPreview({ sheets: [], data: [], sheetName: '' });
    }
  }

  // โหลด dutyHistory ทุกครั้งที่เข้า history page
  useEffect(() => {
    if (showHistoryPage) {
      setDutyHistory(getDutyHistory());
    }
  }, [showHistoryPage]);

  // โหลดไฟล์จาก Google Sheets เมื่อเข้าหน้า history
  useEffect(() => {
    if (showHistoryPage) {
      // TODO: Define or import loadGoogleSheetsFiles before using this effect
      // For now, this effect is disabled to prevent runtime errors
      // Uncomment and fix the following line when loadGoogleSheetsFiles is available:
      // loadGoogleSheetsFiles().then(setGoogleSheetsFiles);
    }
  }, [showHistoryPage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SESSION_KEY = 'jarvis-session';
      let sessionStr = localStorage.getItem(SESSION_KEY);
      let isRemembered = true;

      if (!sessionStr) {
        sessionStr = sessionStorage.getItem(SESSION_KEY);
        isRemembered = false;
      }

      if (sessionStr) {
        try {
          const sessionData = JSON.parse(sessionStr);
          setSessionInfo({
            expiryTime: sessionData.expiryTime,
            isRemembered
          });
        } catch (e) {
          console.error('Failed to parse session data:', e);
        }
      }

      // โหลด page state ที่บันทึกไว้
      const savedPageState = sessionStorage.getItem('jarvis-page-state');
      if (savedPageState) {
        try {
          const pageState = JSON.parse(savedPageState);
          if (pageState.activeModule) {
            setActiveModule(pageState.activeModule);
          }
          if (pageState.showHistoryPage) {
            setShowHistoryPage(pageState.showHistoryPage);
          }
        } catch (e) {
          console.error('Failed to parse page state:', e);
        }
      }
    }
  }, []);

  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [showProfilePopup, setShowProfilePopup] = useState(false)

  const normalizeName = (firstName: string | undefined, lastName: string | undefined): string => {
    const first = (firstName || '').toString().trim()
    const last = (lastName || '').toString().trim()
    return `${first} ${last}`.trim()
  }

  // ฟังก์ชันบันทึก page state
  const savePageState = (newActiveModule: string | null, newShowHistoryPage: boolean = false) => {
    if (typeof window !== 'undefined') {
      const pageState = {
        activeModule: newActiveModule,
        showHistoryPage: newShowHistoryPage
      };
      sessionStorage.setItem('jarvis-page-state', JSON.stringify(pageState));
    }
  };

  // แก้ไข setActiveModule ให้บันทึก state
  const setActiveModuleWithSave = (module: string | null) => {
    setActiveModule(module);
    setShowHistoryPage(false); // ปิด history page เมื่อเข้า module
    savePageState(module, false);
  };

  // แก้ไข setShowHistoryPage ให้บันทึก state  
  const setShowHistoryPageWithSave = (show: boolean, filter: 'all' | 'report' | 'excel' = 'all') => {
    setShowHistoryPage(show);
    setHistoryFilter(filter);
    if (show) {
      setActiveModule(null); // ปิด module เมื่อเข้า history page
    }
    savePageState(null, show);
  };

  const toggleProfilePopup = () => {
    setShowProfilePopup(!showProfilePopup)
  }

  if (activeModule === "excel-manager") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
        <ExcelManager onBack={() => setActiveModuleWithSave(null)} />
      </motion.div>
    )
  }

  if (activeModule === "system-settings") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
        <SystemSettings onBack={() => setActiveModuleWithSave(null)} />
      </motion.div>
    )
  }

  if (activeModule === "ceremony-duty") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
        <CeremonyDuty onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} user={user} />
      </motion.div>
    )
  }
  if (activeModule === "night-duty") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
        <NightDuty onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} />
      </motion.div>
    )
  }
  if (activeModule === "weekend-duty") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
        <WeekendDuty onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} />
      </motion.div>
    )
  }
  if (activeModule === "release-report") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
        <ReleaseReport onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} />
      </motion.div>
    )
  }
  if (activeModule === "statistics") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
        <Statistics onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} />
      </motion.div>
    )
  }
  if (activeModule === "duty-433") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
        <Duty433 onBack={() => setActiveModuleWithSave(null)} onActivateModule={setActiveModuleWithSave} user={user} />
      </motion.div>
    )
  }
  if (activeModule === "create-files") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
        <CreateFiles onBack={() => setActiveModuleWithSave("duty-433")} />
      </motion.div>
    )
  }

  if (showHistoryPage) {
    return (
      <motion.div
        key="history"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6"
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button onClick={() => setShowHistoryPageWithSave(false)} variant="outline" className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm">
                <ChevronDown className="h-4 w-4 mr-2 rotate-90" /> กลับหน้าหลัก
              </Button>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-2">
                <Award className="h-6 w-6 text-yellow-400" />
                {historyFilter === 'report' ? 'ประวัติรายงานที่สร้าง' : historyFilter === 'excel' ? 'ประวัติยอดที่จัดแล้ว' : 'ประวัติทั้งหมด'} (20 รายการล่าสุด)
              </h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant={historyFilter === 'all' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('all')}
                className="text-xs"
              >ทั้งหมด</Button>
              <Button
                variant={historyFilter === 'report' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('report')}
                className="text-xs"
              >รายงาน</Button>
              <Button
                variant={historyFilter === 'excel' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('excel')}
                className="text-xs"
              >Excel</Button>
            </div>
          </div>
          {dutyHistory.length === 0 ? (
            <div className="text-slate-400 text-center py-12">ยังไม่มีประวัติยอดที่บันทึกไว้</div>
          ) : (
            <div className="overflow-x-auto w-full max-w-full space-y-3">
              {dutyHistory
                .filter(item => historyFilter === 'all' || item.type === historyFilter)
                .map((item, idx) => (
                  <div key={idx} className="bg-slate-800/70 border border-slate-700 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-200 mr-2">{item.type === 'excel' ? 'Excel' : 'Report'}</span>
                        <span className="truncate max-w-[180px] sm:max-w-[260px]">{item.fileName}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">ยอด: <span className="text-blue-300">{normalizeName(item.dutyName, item.sheetName)}</span> | ฐาน: {item.sheetName} | คน: {item.count} | วันที่: {new Date(item.date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/10" title="ลบประวัตินี้"
                        onClick={() => {
                          if (window.confirm('คุณต้องการลบประวัตินี้ใช่หรือไม่?')) {
                            const next = dutyHistory.filter((_, i) => i !== idx);
                            setDutyHistory(next);
                            localStorage.setItem('jarvis-duty-history', JSON.stringify(next));
                            if (previewIdx === idx) { setPreviewIdx(null); setExcelPreview(null); }
                          }
                        }}>
                        <X className="h-4 w-4" />
                      </Button>
                      {item.type === 'report' && (
                        <Button size="sm" variant="outline" className="text-blue-400 border-blue-400 hover:bg-blue-400/10" onClick={() => setPreviewIdx(previewIdx === idx ? null : idx)}>
                          {previewIdx === idx ? 'ซ่อนพรีวิว' : 'ดูพรีวิว'}
                        </Button>
                      )}
                      {item.type === 'excel' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-400 border-green-400 hover:bg-green-400/10"
                          onClick={() => {
                            if (previewIdx === idx) {
                              setPreviewIdx(null);
                              setExcelPreview(null);
                              return;
                            }
                            previewExcelFile(item.content, idx);
                          }}
                        >
                          {previewIdx === idx ? 'ซ่อนพรีวิว' : 'ดูพรีวิว'}
                        </Button>

                      )}
                      <Button size="sm" className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-1 rounded shadow hover:from-yellow-600 hover:to-yellow-700"
                        onClick={() => {
                          if (item.type === 'report') {
                            const BOM = "\uFEFF";
                            const blob = new Blob([BOM + (item.content || '')], { type: "text/plain;charset=utf-8;" });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = item.fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          } else if (item.type === 'excel' && item.content) {
                            // ดาวน์โหลด Excel base64
                            const link = document.createElement("a");
                            link.href = item.content;
                            link.download = item.fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          } else {
                            alert('การดาวน์โหลด Excel ย้อนหลังยังไม่รองรับ กรุณาสร้างใหม่');
                          }
                        }}>
                        ดาวน์โหลด
                      </Button>
                    </div>
                    {item.type === 'report' && previewIdx === idx && (
                      <div className="mt-2 bg-slate-900/80 border border-slate-700 rounded p-3 text-xs text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {item.content ? item.content : 'ไม่พบข้อมูลรายชื่อในประวัติ (content)'}
                      </div>
                    )}
                    {item.type === 'excel' && previewIdx === idx && excelPreview && (
                      <div className="mt-2 bg-slate-900/80 border border-slate-700 rounded p-3 text-xs text-slate-200 max-h-60 overflow-x-auto overflow-y-auto">
                        <div className="mb-2">Sheet: <span className="text-green-300">{excelPreview.sheetName}</span> ({excelPreview.sheets.length} ชีท)</div>
                        <table className="min-w-full w-full max-w-full break-words border border-slate-700 text-xs">
                          <thead>
                            <tr>
                              <th className="border border-slate-700 px-2 py-1">ยศ</th>
                              <th className="border border-slate-700 px-2 py-1">ชื่อ</th>
                              <th className="border border-slate-700 px-2 py-1">สกุล</th>
                            </tr>
                          </thead>
                          <tbody>
                            {excelPreview.data.slice(1, 21).map((row, rIdx) => (
                              <tr key={rIdx}>
                                <td className="border border-slate-700 px-2 py-1">{row[1] || ''}</td>
                                <td className="border border-slate-700 px-2 py-1">{row[2] || ''}</td>
                                <td className="border border-slate-700 px-2 py-1">{row[3] || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {excelPreview.data.length > 21 && <div className="text-slate-400 mt-1">...แสดงสูงสุด 20 แถว</div>}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="relative z-20 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-col sm:flex-row gap-3 sm:gap-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">

              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                J.A.R.V.I.S
              </h1>
            </div>
            <Badge className="bg-green-600 text-white">ระบบผู้ช่วย ฝอ.1</Badge>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* 5 ฟังก์ชันหลัก - ขยับมาใกล้โปรไฟล์ */}
            <div className="flex items-center space-x-2 bg-slate-700/50 rounded-lg px-3 py-2 backdrop-blur-sm">
              <BarChart3 className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">5 ฟังก์ชันหลัก</span>
            </div>

            <Button variant="ghost" size="sm" className="text-white hover:bg-slate-700/50">
              <Bell className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="sm" className="text-white hover:bg-slate-700/50">
              <Settings className="h-5 w-5" />
            </Button>

            {/* Profile Section */}
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center space-x-3 text-white hover:bg-slate-700/50 p-2"
                onClick={toggleProfilePopup}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/jarvis-robot.png" alt="Profile" className="object-cover" />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user?.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-sm font-medium">{user?.displayName || "ผู้ใช้"}</div>
                  <div className="text-xs text-slate-400">{user?.role || "ผู้ใช้งาน"}</div>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {/* Profile Popup */}
              {showProfilePopup && (
                <div className="fixed sm:absolute inset-0 sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-full sm:w-80 bg-slate-800 border border-slate-700 rounded-none sm:rounded-lg shadow-xl z-[100] backdrop-blur-sm">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">ข้อมูลผู้ใช้</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleProfilePopup}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="/jarvis-robot.png" alt="Profile" className="object-cover" />
                        <AvatarFallback className="bg-blue-600 text-white text-lg">
                          {user?.displayName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-white font-medium">{user?.displayName || "ผู้ใช้"}</div>
                        <div className="text-slate-400 text-sm">@{username}</div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-slate-300">บทบาท: {user?.role || "ผู้ใช้งาน"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-slate-300">ฐานข้อมูล: {user?.sheetname || 'ไม่ระบุ'}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <Button
                        onClick={onLogout}
                        variant="ghost"
                        className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        ออกจากระบบ
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-6 py-6">

        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-400/50 shadow-lg overflow-hidden bg-slate-800">
              <img src="/jarvis-robot.png" alt="JARVIS Robot" className="w-full h-full object-cover" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            ยินดีต้อนรับ <span className="text-blue-400">{user?.displayName || "ผู้ใช้"}</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">เลือกฟังก์ชันที่ต้องการใช้งานจากด้านล่าง</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 backdrop-blur-sm cursor-pointer group" onClick={() => setActiveModuleWithSave("statistics")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">เวรที่ดำเนินการ</p>
                  <p className="text-2xl font-bold text-white">12</p>
                </div>
                <Shield className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 backdrop-blur-sm cursor-pointer group" onClick={() => setActiveModuleWithSave("excel-manager")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">จัดการไฟล์ Excel</p>
                  <p className="text-2xl font-bold text-white">Tool</p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 backdrop-blur-sm cursor-pointer group" onClick={() => setShowHistoryPageWithSave(true, 'excel')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">ยอดที่จัดแล้ว</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-white">
                      {getDutyHistory().filter((item: any) => item.type === 'excel').length}
                    </p>
                  </div>
                </div>
                <Award className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Function Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          <Card
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
            onClick={() => setActiveModuleWithSave("night-duty")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-blue-400 transition-colors">
                <Shield className="h-6 w-6" />
                <span>เวรรักษาการณ์</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">จัดการและดูข้อมูลเวรยืนกลางคืน</p>
              <Badge className="bg-blue-600 text-white">ดู-อัพเดต</Badge>
            </CardContent>
          </Card>

          <Card
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
            onClick={() => setActiveModuleWithSave("weekend-duty")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-green-400 transition-colors">
                <Calendar className="h-6 w-6" />
                <span>เวรเตรียมการ</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">จัดการเวรเสาร์-อาทิตย์และวันหยุด</p>
              <Badge className="bg-green-600 text-white">ดู-อัพเดต</Badge>
            </CardContent>
          </Card>

          <Card
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
            onClick={() => setActiveModuleWithSave("ceremony-duty")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-yellow-400 transition-colors">
                <Award className="h-6 w-6" />
                <span>จัดยอดพิธี</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">สุ่มเลือกนนร.สำหรับงานพิธีต่างๆ</p>
              <Badge className="bg-yellow-600 text-white">จัดยอด(สุ่ม)</Badge>
            </CardContent>
          </Card>



          <Card
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
            onClick={() => setActiveModuleWithSave("release-report")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-purple-400 transition-colors">
                <FileText className="h-6 w-6" />
                <span>ยอดปล่อย</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">สร้างรายงานยอดปล่อยประจำสัปดาห์</p>
              <Badge className="bg-purple-600 text-white">พิมพ์</Badge>
            </CardContent>
          </Card>

          <Card
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
            onClick={() => setActiveModuleWithSave("statistics")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-orange-400 transition-colors">
                <BarChart3 className="h-6 w-6" />
                <span>สถิติโดนยอด</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">ตรวจสอบและอัพเดตสถิติยอดพิธี</p>
              <Badge className="bg-orange-600 text-white">อัพเดต-ตรวจสอบ</Badge>
            </CardContent>
          </Card>

          {/* Admin Section - System Settings and Duty 433 */}
          {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'oat' || user?.role === 'ผู้ดูแลระบบ') && (
            <>
              <Card
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
                onClick={() => setActiveModuleWithSave("duty-433")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-white group-hover:text-amber-400 transition-colors">
                    <Award className="h-6 w-6" />
                    <span>หน้าที่ 433</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm mb-4">แดชบอร์ดสรุป433 — สำหรับผู้ดูแลระบบ</p>
                  <Badge className="bg-amber-600 text-white">ตรวจสอบ - จัดการ</Badge>
                </CardContent>
              </Card>

              <Card
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
                onClick={() => setActiveModuleWithSave("system-settings")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-white group-hover:text-teal-400 transition-colors">
                    <Settings className="h-6 w-6" />
                    <span>ตั้งค่าระบบ</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm mb-4">จัดการฐานข้อมูลและโครงสร้างระบบ</p>
                  <Badge className="bg-teal-600 text-white">จัดการ</Badge>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}