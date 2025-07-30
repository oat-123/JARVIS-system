"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ExternalLink, Upload, Clock, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userSheetMap } from "@/config/auth"
import * as XLSX from 'xlsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface StatisticsProps {
  onBack: () => void
  sheetName: string
}

interface SheetData {
  fullNames: string[]
  weight: number
}

interface RecentFile {
  fileName: string
  uploadDate: string
  sheetsCount: number
  totalUpdated: number
}

export function Statistics({ onBack, sheetName }: StatisticsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [sheetSettings, setSheetSettings] = useState<Record<string, number>>({})
  const [sheetPreviews, setSheetPreviews] = useState<Record<string, any[][]>>({})
  const [fullNamesInSheet, setFullNamesInSheet] = useState<string[]>([])
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const { toast } = useToast()
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [updatedDetails, setUpdatedDetails] = useState<any[]>([])

  const currentUser = userSheetMap[sheetName as keyof typeof userSheetMap] || userSheetMap["ชั้น4_พัน4"]

  // โหลดประวัติไฟล์ล่าสุดเมื่อ component เริ่มต้น
  useEffect(() => {
    const loadRecentFiles = async () => {
      try {
        const response = await fetch(`/api/sheets/recent-files?sheetName=${encodeURIComponent(sheetName)}`);
        
        // ตรวจสอบว่า response เป็น JSON หรือไม่
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.log('Recent files API not available yet');
          return;
        }
        
        const result = await response.json();
        if (result.success) {
          setRecentFiles(result.recentFiles || []);
        }
      } catch (error) {
        console.log('Recent files feature not implemented yet');
        // ไม่แสดง error ใน console เพื่อไม่ให้รบกวนผู้ใช้
      }
    };
    loadRecentFiles();
  }, [sheetName]);

  // ✅ ปรับปรุงฟังก์ชัน normalizeName ให้เหมือนกับ Python
  const normalizeName = (firstName: string | undefined, lastName: string | undefined): string => {
    const first = (firstName || '').toString().trim()
    const last = (lastName || '').toString().trim()
    return `${first} ${last}`.trim()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith('.xlsx')) {
      setSelectedFile(file)
      // อ่านรายชื่อชีทจริงจากไฟล์
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      setSelectedSheets(sheetNames)
      
      // ✅ อ่าน preview ข้อมูลแต่ละชีท (skip 3 rows เหมือน Python)
      const previews: Record<string, any[][]> = {};
      for (const sheet of sheetNames) {
        const ws = workbook.Sheets[sheet];
        if (!ws) continue;
        
        // ✅ อ่านข้อมูลโดย skip 3 แถวแรก (header=None, skiprows=3)
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 3 }) as any[][];
        
        // ✅ กรองแถวที่ไม่ใช่ข้อมูล (dropna equivalent)
        const filteredData = data.filter(row => {
          return row && row.length >= 4 && (row[0] || row[2] || row[3])
        });
        
        // ✅ สร้าง preview แบบเดียวกับ Python
        const previewRows = filteredData.map((row: any[]) => [
          row[0], // ลำดับ (คอลัมน์ A)
          row[2], // ชื่อ (คอลัมน์ C) 
          row[3], // สกุล (คอลัมน์ D)
        ]);
        
        previews[sheet] = previewRows;
      }
      setSheetPreviews(previews);
      
      // ✅ ดึง fullNamesInSheet จาก backend
      try {
        const res = await fetch(`/api/sheets/update-stats?sheetName=${encodeURIComponent(sheetName)}`);
        const json = await res.json();
        if (json.success) {
          setFullNamesInSheet(json.fullNamesInSheet || []);
        } else {
          setFullNamesInSheet([]);
        }
      } catch (error) {
        console.error('Error fetching sheet data:', error);
        setFullNamesInSheet([]);
      }
    } else {
      toast({
        title: 'ไฟล์ไม่ถูกต้อง',
        description: 'กรุณาเลือกไฟล์ .xlsx เท่านั้น',
        variant: 'destructive',
      })
    }
  }

  const updateStatistics = async () => {
    if (!selectedFile || selectedSheets.length === 0) {
      toast({
        title: 'ข้อมูลไม่ครบ',
        description: 'กรุณาอัปโหลดไฟล์และเลือกชีท',
        variant: 'destructive',
      })
      return
    }
    
    try {
      // ✅ เตรียมข้อมูลแต่ละชีทเหมือน Python
      const processedSheets: Record<string, SheetData> = {};
      
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      for (const sheet of selectedSheets) {
        const ws = workbook.Sheets[sheet];
        if (!ws) continue;
        
        // ✅ อ่านข้อมูลโดย skip 3 แถวแรก
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 3 }) as any[][];
        
        // ✅ กรองและสร้าง fullNames เหมือน Python
        const filteredData = data.filter(row => {
          return row && row.length >= 4 && (row[0] || row[2] || row[3])
        });
        
        const fullNames = filteredData.map((row: any[]) => {
          return normalizeName(row[2], row[3]); // คอลัมน์ C, D
        }).filter(name => name.trim().length > 0);
        
        processedSheets[sheet] = {
          fullNames,
          weight: sheetSettings[sheet] || 3
        };
      }
      
      // ✅ ส่งข้อมูลไป backend
      const response = await fetch('/api/sheets/update-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processedSheets,
          sheetName,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'อัปเดตแต้มสำเร็จ',
          description: `อัปเดตแต้มให้ ${result.updatedDetails?.length || 0} คนเรียบร้อยแล้ว`,
        });
        if (result.updatedDetails && result.updatedDetails.length > 0) {
          setUpdatedDetails(result.updatedDetails);
          setShowUpdateDialog(true);
        }
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถอัปเดตข้อมูลได้',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตข้อมูลได้',
        variant: 'destructive',
      });
      console.error(error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={onBack}
          variant="outline"
          className="mb-8 text-white border-white hover:bg-white hover:text-black bg-transparent"
        >
          ← กลับหน้าหลัก
        </Button>

        <Card className="bg-slate-800/50 border-slate-700 shadow-xl shadow-blue-900/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
              📊 สถิติโดนยอด
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ลิงก์ดูสถิติ */}
            <div className="text-center">
              <Button
                asChild
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white bg-transparent"
              >
                <a href={currentUser.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  ดูสถิติโดนยอดปัจจุบัน (ชีท: {currentUser.name})
                </a>
              </Button>
            </div>

            {/* อัปโหลดไฟล์ */}
            <div>
              <Label htmlFor="file-upload" className="text-white">
                📤 อัปโหลดไฟล์ยอด (.xlsx)
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx"
                onChange={handleFileUpload}
                className="bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white file:border-0"
              />
            </div>

            {/* แสดงชีทที่เลือก */}
            {selectedSheets.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">📄 รายชื่อชีทในไฟล์ที่อัปโหลด</h3>
                <ul className="list-disc pl-6 text-slate-200">
                  {selectedSheets.map((sheet) => (
                    <li key={sheet}>{sheet}</li>
                  ))}
                </ul>
                
                {/* ✅ พรีวิวข้อมูลแต่ละชีทพร้อมสถานะจับคู่ */}
                {selectedSheets.map((sheet) => (
                  <div key={sheet} className="my-8 flex justify-center">
                    <div className="w-full max-w-2xl">
                      <div className="font-bold text-slate-600 mb-2 text-center text-lg tracking-wide">Preview: {sheet}</div>
                      <div className="overflow-x-auto rounded-2xl shadow-2xl border border-slate-200 bg-white">
                        <table className="min-w-full text-base rounded-2xl">
                          <thead>
                            <tr>
                              <th className="border-b border-slate-300 px-7 py-3 bg-blue-950 text-white font-bold text-center rounded-tl-2xl text-lg tracking-wide">ลำดับ</th>
                              <th className="border-b border-slate-300 px-7 py-3 bg-blue-950 text-white font-bold text-center text-lg tracking-wide">ชื่อ</th>
                              <th className="border-b border-slate-300 px-7 py-3 bg-blue-950 text-white font-bold text-center text-lg tracking-wide">สกุล</th>
                              <th className="border-b border-slate-300 px-7 py-3 bg-blue-950 text-white font-bold text-center rounded-tr-2xl text-lg tracking-wide">สถานะจับคู่</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(sheetPreviews[sheet] && sheetPreviews[sheet].length > 0) ? (
                              sheetPreviews[sheet].map((row: any[], idx: number) => {
                                // ✅ สร้าง fullName เหมือน Python
                                const fullName = normalizeName(row[1], row[2]);
                                const matched = fullNamesInSheet.includes(fullName);
                                
                                return (
                                  <tr key={idx} className={matched ? 'bg-green-50' : 'bg-red-50'}>
                                    <td className="border-b border-slate-200 px-7 py-3 text-center text-slate-800 font-medium align-middle min-h-[48px]">{row[0]}</td>
                                    <td className="border-b border-slate-200 px-7 py-3 text-center text-slate-800 font-medium align-middle min-h-[48px]">{row[1]}</td>
                                    <td className="border-b border-slate-200 px-7 py-3 text-center text-slate-800 font-medium align-middle min-h-[48px]">{row[2]}</td>
                                    <td className="border-b border-slate-200 px-7 py-3 text-center font-bold align-middle min-h-[48px]">
                                      {matched ? 
                                        <span className="text-green-600">✅ พบในฐานข้อมูล</span> : 
                                        <span className="text-red-500">❌ ไม่พบในฐานข้อมูล</span>
                                      }
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400 italic">ไม่มีข้อมูลในชีทนี้</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
                
                <h3 className="text-lg font-semibold text-white mt-8 mb-4 text-center">⚙️ ตั้งค่าความเหนื่อยสำหรับแต่ละชีท</h3>
                {selectedSheets.map((sheet) => (
                  <div key={sheet} className="flex justify-center mb-8">
                    <Card className="bg-slate-800/80 border-slate-700 w-full max-w-2xl rounded-2xl shadow-xl">
                      <CardContent className="p-6 flex flex-col items-center">
                        <div className="space-y-4 w-full">
                          <Label className="text-white text-lg block text-center mb-2">ชีท: <span className="font-bold text-blue-300">{sheet}</span></Label>
                          <div className="space-y-3 w-full">
                            <Label className="text-base text-slate-300 block text-center">ระดับความเหนื่อย: <span className="font-bold text-green-300">{sheetSettings[sheet] || 3}</span></Label>
                            <Slider
                              value={[sheetSettings[sheet] || 3]}
                              onValueChange={(value) => setSheetSettings((prev) => ({ ...prev, [sheet]: value[0] }))}
                              max={5}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-slate-400 w-full">
                              <span>1 (ง่าย)</span>
                              <span>5 (หนัก)</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
                
                <div className="flex justify-center mt-10">
                  <Button
                    onClick={updateStatistics}
                    className="w-full max-w-lg mx-auto flex items-center justify-center bg-green-600 hover:bg-green-700 text-lg py-4 rounded-2xl shadow-2xl font-bold tracking-wide transition-all duration-200 min-h-[56px]"
                  >
                    <Upload className="mr-2 h-6 w-6 flex-shrink-0" />
                    <span className="whitespace-nowrap">✅ อัปเดตแต้มเข้า Google Sheets</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog popup รายชื่อที่ถูกอัปเดตแต้ม */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="max-w-lg p-0 bg-white">
            <Card className="shadow-none border-0 bg-white">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center text-green-700 mb-2">✅ อัปเดตแต้มเรียบร้อย</DialogTitle>
              </DialogHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto px-6 py-2">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="bg-green-50">
                        <th className="py-2 px-3 text-left font-semibold">ชื่อ-สกุล</th>
                        <th className="py-2 px-3 text-center font-semibold">แต้มเดิม</th>
                        <th className="py-2 px-3 text-center font-semibold">แต้มใหม่</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updatedDetails.map((d, i) => (
                        <tr key={i} className="even:bg-green-50">
                          <td className="py-2 px-3">{d.fullName}</td>
                          <td className="py-2 px-3 text-center text-slate-500">{d.oldStat}</td>
                          <td className="py-2 px-3 text-center font-bold text-green-700">{d.newStat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {updatedDetails.length === 0 && (
                    <div className="text-center text-slate-400 py-8">ไม่มีรายชื่อที่ถูกอัปเดต</div>
                  )}
                </div>
                <div className="flex justify-center py-4">
                  <Button onClick={() => setShowUpdateDialog(false)} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg text-lg font-semibold shadow">
                    ปิด
                  </Button>
                </div>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}