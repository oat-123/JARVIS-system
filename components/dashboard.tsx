"use client"

import { useState, useEffect } from "react"
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

// ฟังก์ชันโหลดไฟล์จาก Google Sheets
async function loadGoogleSheetsFiles() {
  try {
    const SHEET_ID = '1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw';
    const SHEET_NAME = 'file';
    
    // ใช้ Google Sheets API หรือ CSV export
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gid=344324158/export?format=csv`;
    
    try {
      const response = await fetch(csvUrl);
      const csvData = await response.text();
      
      // แปลง CSV เป็น array
      const rows = csvData.split('\n').map(row => row.split(','));
      
      // กรองข้อมูลไฟล์ (สมมติว่าข้อมูลเริ่มจากแถวที่ 2)
      const files = rows.slice(1).filter(row => row[0] && row[0].trim()).map((row, index) => ({
        id: `sheet_${index}`,
        name: row[0]?.replace(/"/g, '') || `ไฟล์ ${index + 1}`,
        type: 'ceremony-duty',
        date: row[1]?.replace(/"/g, '') || new Date().toISOString().split('T')[0],
        sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=344324158#gid=344324158`,
        lastModified: new Date().toISOString(),
        source: 'google-sheets'
      }));
      
      return files;
    } catch (fetchError) {
      // Fallback ข้อมูล Mock ถ้าไม่สามารถเชื่อมต่อได้
      console.warn('Cannot fetch from Google Sheets, using mock data:', fetchError);
      return [
        {
          id: 'sheet1',
          name: 'ยอดพิธีประจำสัปดาห์ 1/2025',
          type: 'ceremony-duty',
          date: '2025-01-29',
          sheetUrl: 'https://docs.google.com/spreadsheets/d/1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw/edit?gid=344324158#gid=344324158',
          lastModified: new Date().toISOString(),
          source: 'google-sheets'
        },
        {
          id: 'sheet2', 
          name: 'ยอดพิธีประจำสัปดาห์ 2/2025',
          type: 'ceremony-duty',
          date: '2025-01-22',
          sheetUrl: 'https://docs.google.com/spreadsheets/d/1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw/edit?gid=344324158#gid=344324158',
          lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          source: 'google-sheets'
        }
      ];
    }
  } catch (error) {
    console.error('Failed to load Google Sheets files:', error);
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
  BarChart3,
  Globe,
  ChevronDown,
  X,
  Folder,
  ExternalLink,
} from "lucide-react"
import { CeremonyDuty } from "./modules/ceremony-duty"
import { NightDuty } from "./modules/night-duty"
import { WeekendDuty } from "./modules/weekend-duty"
import { ReleaseReport } from "./modules/release-report"
import { Statistics } from "./modules/statistics"

interface DashboardProps {
  user: {
    displayName: string
    role: string
    group: string
    sheetname: string
  } | null
  username: string | null
  onLogout: () => void
}

export function Dashboard({ user, username, onLogout }: DashboardProps) {
  // State สำหรับ modal แสดงประวัติยอด
  const [showHistoryPage, setShowHistoryPage] = useState(false);
  const [dutyHistory, setDutyHistory] = useState<any[]>([]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [excelPreview, setExcelPreview] = useState<{ sheets: string[], data: any[][], sheetName: string } | null>(null);
  
  // State สำหรับแสดงไฟล์จาก Google Sheets
  const [googleSheetsFiles, setGoogleSheetsFiles] = useState<any[]>([]);
  
  // Session info state
  const [sessionInfo, setSessionInfo] = useState<{ expiryTime: number, isRemembered: boolean } | null>(null);
  // ฟังก์ชัน normalizeName เหมือนกับใน statistics.tsx
  const normalizeName = (firstName: string | undefined, lastName: string | undefined): string => {
    const first = (firstName || '').toString().trim()
    const last = (lastName || '').toString().trim()
    return `${first} ${last}`.trim()
  }
  const previewExcelFile = async (base64String: any, idx: number) => {
    try {
      // ✅ ตรวจสอบข้อมูลเบื้องต้น
      if (!base64String) {
        throw new Error("No Excel data available for preview");
      }

      const stringValue = String(base64String);
      
      // ✅ แปลง base64 เป็น ArrayBuffer
      let arrayBuffer: ArrayBuffer;
      
      if (stringValue.includes(',')) {
        // กรณีที่เป็น data URL
        const response = await fetch(stringValue);
        arrayBuffer = await response.arrayBuffer();
      } else {
        // กรณีที่เป็น pure base64 - แปลงเป็น data URL ก่อน
        const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${stringValue}`;
        const response = await fetch(dataUrl);
        arrayBuffer = await response.arrayBuffer();
      }

      // ✅ ใช้ XLSX.read เหมือนกับ statistics.tsx
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];
      
      if (!ws) {
        throw new Error("No worksheet found in the Excel file");
      }

      // ✅ ใช้ logic เดียวกับ statistics.tsx - อ่านจากแถวที่ 4 เป็นต้นไป (skip header 3 rows)
      // แต่สำหรับไฟล์ที่มาจาก ceremony-duty.tsx ข้อมูลจริงเริ่มที่แถว 4 (row index 3)
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      // ✅ กรองข้อมูลเริ่มจากแถว 4 (index 3) เป็นต้นไป และมีข้อมูลครบ
      const filteredData = data.slice(3).filter(row => {
        return row && row.length >= 4 && (row[0] || row[1] || row[2] || row[3])
      });

      // ✅ แสดงข้อมูลทั้งหมด (ไม่จำกัด 20 แถว)
      const previewData = filteredData;

      // ✅ สร้าง header สำหรับแสดงผล
      const headerRow = ['ลำดับ', 'ยศ', 'ชื่อ', 'สกุล', 'ชั้นปีที่', 'ตอน', 'ตำแหน่ง', 'สังกัด', 'เบอร์โทรศัพท์', 'หมายเหตุ'];

      setPreviewIdx(idx);
      setExcelPreview({
        sheets: workbook.SheetNames,
        sheetName,
        data: [headerRow, ...previewData] // เพิ่ม header เข้าไปด้วย
      });

    } catch (e) {
      console.error("Preview failed:", e);
      
      // ✅ แสดงข้อความแจ้งเตือนที่เหมาะสม
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert(`ไม่สามารถแสดงตัวอย่างได้: ${errorMessage}\n\nคุณยังสามารถดาวน์โหลดไฟล์ได้ตามปกติ`);
      
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
      loadGoogleSheetsFiles().then(setGoogleSheetsFiles);
    }
  }, [showHistoryPage]);

  // โหลดข้อมูล session และ page state
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
  const setShowHistoryPageWithSave = (show: boolean) => {
    setShowHistoryPage(show);
    if (show) {
      setActiveModule(null); // ปิด module เมื่อเข้า history page
    }
    savePageState(null, show);
  };

  const toggleProfilePopup = () => {
    setShowProfilePopup(!showProfilePopup)
  }

  if (activeModule === "ceremony-duty") {
    return <CeremonyDuty onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} />
  }
  if (activeModule === "night-duty") {
    return <NightDuty onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} />
  }
  if (activeModule === "weekend-duty") {
    return <WeekendDuty onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} />
  }
  if (activeModule === "release-report") {
    return <ReleaseReport onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} />
  }
  if (activeModule === "statistics") {
    return <Statistics onBack={() => setActiveModuleWithSave(null)} sheetName={user?.sheetname || ""} />
  }


  if (showHistoryPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button onClick={() => setShowHistoryPageWithSave(false)} variant="outline" className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm">
              <ChevronDown className="h-4 w-4 mr-2 rotate-90" /> กลับหน้าหลัก
            </Button>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-400" /> ยอดที่จัดไว้ในระบบ (20 รายการล่าสุด)
            </h2>
          </div>
          
          {/* แสดงไฟล์จาก Google Sheets ก่อน */}
          {googleSheetsFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Folder className="h-5 w-5" /> ไฟล์จาก Google Sheets
              </h3>
              <div className="space-y-2">
                {googleSheetsFiles.map((file, idx) => (
                  <div key={file.id} className="bg-slate-800/70 border border-green-700/50 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-green-700 text-green-200">Sheet</span>
                        <span className="truncate max-w-[180px] sm:max-w-[260px]">{file.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        ประเภท: <span className="text-green-300">{file.type}</span> | 
                        วันที่: {new Date(file.date).toLocaleDateString('th-TH')} | 
                        อัปเดต: {new Date(file.lastModified).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                        onClick={() => window.open(file.sheetUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        เปิดใน Sheets
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dutyHistory.length === 0 && googleSheetsFiles.length === 0 ? (
            <div className="text-slate-400 text-center py-12">ยังไม่มีประวัติยอดที่บันทึกไว้</div>
          ) : dutyHistory.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <Award className="h-5 w-5" /> ไฟล์ที่สร้างในระบบ
              </h3>
              <div className="space-y-2">            
                {dutyHistory.map((item, idx) => (
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
                    <div className="mt-2 bg-slate-900/80 border border-slate-700 rounded p-3 text-xs text-slate-200 max-h-80 overflow-auto">
                      <div className="mb-2">
                        Sheet: <span className="text-green-300">{excelPreview.sheetName}</span> ({excelPreview.sheets.length} ชีท)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-slate-700 text-xs">
                          <thead>
                            <tr className="bg-slate-800">
                              {excelPreview.data[0]?.map((header: any, hIdx: number) => (
                                <th key={hIdx} className="border border-slate-700 px-2 py-1 font-semibold text-blue-300 whitespace-nowrap">
                                  {header || `Col ${hIdx + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {excelPreview.data.slice(1).map((row: any[], rIdx: number) => (
                              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/50'}>
                                {row.map((cell: any, cIdx: number) => (
                                  <td key={cIdx} className="border border-slate-700 px-2 py-1 whitespace-nowrap">
                                    {cell || ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-slate-400 mt-2 text-center">แสดงทั้งหมด {excelPreview.data.length - 1} รายการ</div>
                    </div>
                  )}
                </div>
              ))}
                </div>
                </div>
                ) : null}
                </div>
                </div>
                );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4">
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
                <div className="fixed sm:absolute inset-0 sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-full sm:w-80 bg-slate-800 border border-slate-700 rounded-none sm:rounded-lg shadow-xl z-50 backdrop-blur-sm">
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
                        <span className="text-sm text-slate-300">กลุ่ม: {user?.group || "ไม่ระบุ"}</span>
                      </div>
                      {sessionInfo && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-yellow-400" />
                          <span className="text-xs text-slate-400">
                            Session หมดอายุ: {new Date(sessionInfo.expiryTime).toLocaleString('th-TH')}
                            {sessionInfo.isRemembered && " (จำการเข้าสู่ระบบ)"}
                          </span>
                        </div>
                      )}
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
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 backdrop-blur-sm">
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

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">รายงานที่สร้าง</p>
                  <p className="text-2xl font-bold text-white">8</p>
                </div>
                <FileText className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 backdrop-blur-sm cursor-pointer group" onClick={() => setShowHistoryPageWithSave(true)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">ยอดที่จัดแล้ว</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-white">{getDutyHistory().length}</p>
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
        </div>
      </main>
    </div>
  )
}
