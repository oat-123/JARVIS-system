"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Phone, Award, Calendar, MapPin, Star, RefreshCw } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ProfileDetailProps {
  person: any
  onBack: () => void
}

// Helper function to format Thai short date
const toThaiShortDate = (input: string) => {
  if (!input) return ''
  try {
    const d = new Date(input)
    if (isNaN(d.getTime())) return input
    const day = d.getDate()
    const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    const year = d.getFullYear() + 543
    const shortYear = String(year).slice(-2)
    const thaiNum = (n:number) => String(n).split('').map(ch => '๐๑๒๓๔๕๖๗๘๙'[parseInt(ch)]).join('')
    return `${thaiNum(day)} ${monthNames[d.getMonth()]} ${thaiNum(parseInt(shortYear))}`
  } catch (e) { return input }
}

export function ProfileDetail({ person, onBack }: ProfileDetailProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  if (!person) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">ไม่พบข้อมูล</h2>
          <Button onClick={onBack} className="bg-blue-600">← ย้อนกลับ</Button>
        </div>
      </div>
    )
  }

  const fullName = `${(person.ยศ || '').trim()} ${(person.ชื่อ || '').trim()} ${(person.สกุล || '').trim()}`.replace(/\s+/g, ' ').trim()
  const displayName = (person.ชื่อ && person.ชื่อ !== "นนร.") ? fullName : "ไม่พบชื่อจริง"
  const position = person['ตำแหน่ง ทกท.'] || person.ตำแหน่ง || person['ทกท.'] || ''

  const fetchAvatar = async () => {
    if (person?.ชื่อ) {
      const cacheKey = `avatar_${person.ชื่อ}_${person.สกุล}`;
      const cachedUrl = localStorage.getItem(cacheKey);

      if (cachedUrl) {
        setAvatarUrl(cachedUrl);
        return;
      }

      try {
        const lastNameInitial = person.สกุล ? person.สกุล.charAt(0) : '';
        const searchName = `${person.ชื่อ} ${lastNameInitial}`.trim();

        const res = await fetch('/api/image-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personName: searchName }),
        });
        const data = await res.json();

        if (data.success) {
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(data.link)}`;
          setAvatarUrl(proxyUrl);
          localStorage.setItem(cacheKey, proxyUrl);
        }
      } catch (error) {
        console.error('Error fetching avatar:', error);
      }
    }
  };

  useEffect(() => {
    if (person?.ชื่อ) {
      const cacheKey = `avatar_${person.ชื่อ}_${person.สกุล}`;
      const cachedUrl = localStorage.getItem(cacheKey);

      if (cachedUrl) {
        setAvatarUrl(cachedUrl);
        return;
      }

      const fetchAvatar = async () => {
        try {
          const lastNameInitial = person.สกุล ? person.สกุล.charAt(0) : '';
          const searchName = `${person.ชื่อ} ${lastNameInitial}`.trim();

          const res = await fetch('/api/image-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personName: searchName }),
          });
          const data = await res.json();

          if (data.success) {
            // Set the thumbnail first for a quick preview
            if (data.thumbnailLink) {
              setAvatarUrl(data.thumbnailLink);
            }

            // Then load the full image in the background
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(data.link)}`;
            const img = new Image();
            img.src = proxyUrl;
            img.onload = () => {
              setAvatarUrl(proxyUrl);
              localStorage.setItem(cacheKey, proxyUrl);
            };
          }
        } catch (error) {
          console.error('Error fetching avatar:', error);
        }
      };
      fetchAvatar();
    }
  }, [person]);

  const handleDownload = () => {
    if (avatarUrl) {
      const link = document.createElement('a');
      link.href = avatarUrl;
      link.download = `${fullName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRefresh = () => {
    if (person?.ชื่อ) {
      const cacheKey = `avatar_${person.ชื่อ}_${person.สกุล}`;
      localStorage.removeItem(cacheKey);
      setAvatarUrl(null);
      fetchAvatar();
    }
  };

  // เรียก API เพื่อ log ข้อมูลใน terminal ทุกครั้งที่เปิดโปรไฟล์
  useEffect(() => {
    try {
      const payload = {
        name: fullName,
        position,
        report: {
          to: person.ถวายรายงาน || null,
          partner: person['น.กำกับยาม'] || null,
          date: person.วันที่ || null,
        },
        enter433Dates: Array.isArray(person._433_dates) ? person._433_dates : [],
        adminChpDates: Array.isArray(person._admin_dates) ? person._admin_dates : [],
        // เพิ่มข้อมูลใหม่ทั้งหมด
        allPersonData: person,
        detected433Columns: person._433_columns || [],
        detectedAdminColumns: person._admin_columns || [],
        metadata: {
          total433Columns: person._433_columns?.length || 0,
          totalAdminColumns: person._admin_columns?.length || 0,
        }
      }
      
      // แสดง log ใน console ของ browser
      console.log('🔍 Profile Detail - ข้อมูลที่ได้รับ:', {
        timestamp: new Date().toISOString(),
        personName: fullName,
        allData: person,
        summary: {
          basicInfo: {
            ลำดับ: person.ลำดับ,
            ยศ: person.ยศ,
            ชื่อ: person.ชื่อ,
            สกุล: person.สกุล,
            ชั้นปีที่: person.ชั้นปีที่,
            ตอน: person.ตอน,
            ตำแหน่ง: person.ตำแหน่ง,
            สังกัด: person.สังกัด,
            เบอร์โทรศัพท์: person.เบอร์โทรศัพท์,
            คัดเกรด: person.คัดเกรด,
          },
          additionalInfo: {
            'ธุรการ ฝอ.': person['ธุรการ ฝอ.లా'],
            ตัวชน: person.ตัวชน,
            ส่วนสูง: person.ส่วนสูง,
            นักกีฬา: person.นักกีฬา,
            'ภารกิจอื่น ๆ': person['ภารกิจอื่น ๆలా'],
            'ดูงานต่างประเทศ': person['ดูงานต่างประเทศలా'],
            'เจ็บ (ใบรับรองแพทย์)': person['เจ็บ (ใบรับรองแพทย์)లా'],
            หมายเหตุ: person.หมายเหตุ,
          },
          reportInfo: {
            ถวายรายงาน: person.ถวายรายงาน,
            'น.กำกับยาม': person['น.กำกับยามలా'],
            วันที่: person.วันที่,
          },
          dynamicColumns: {
            '433_columns': person._433_columns || [],
            'admin_columns': person._admin_columns || [],
            '433_dates': person._433_dates || [],
            'admin_dates': person._admin_dates || [],
          }
        }
      })
      
      fetch('/api/profile-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {}) // Suppress errors for logging
    } catch (e) {
      console.error('❌ Error logging profile data:', e)
    }
  // เปลี่ยนเมื่อเป้าหมายเปลี่ยนคน
  }, [fullName, position, person._433_dates, person._admin_dates, person.ถวายรายงาน, person['น.กำกับยาม'], person.วันที่, person._433_columns, person._admin_columns])

  // แสดงข้อมูลที่ดึงมาจาก Google Sheets ใน terminal
  console.log('=== ข้อมูลจาก Google Sheets ===')
  console.log('ข้อมูลทั้งหมด:', person)
  console.log('433 ครั้งที่ 1:', person['433 ครั้งที่ 1'])
  console.log('433 ครั้งที่ 2:', person['433 ครั้งที่ 2'])
  console.log('433 ครั้งที่ 3:', person['433 ครั้งที่ 3'])
  console.log('433 ครั้งที่ 4:', person['433 ครั้งที่ 4'])
  console.log('ถวายรายงาน:', person.ถวายรายงาน)
  console.log('น.กำกับยาม:', person['น.กำกับยาม'])
  console.log('วันที่:', person.วันที่)
  console.log('ธุรการ ครั้งที่ 1:', person['ธุรการ ครั้งที่ 1'])
  console.log('ธุรการ ครั้งที่ 2:', person['ธุรการ ครั้งที่ 2'])
  console.log('ธุรการ ครั้งที่ 3:', person['ธุรการ ครั้งที่ 3'])
  console.log('ธุรการ ครั้งที่ 4:', person['ธุรการ ครั้งที่ 4'])
  console.log('ธุรการ ครั้งที่ 5:', person['ธุรการ ครั้งที่ 5'])
  console.log('enter433 array:', person.enter433)
  console.log('reportHistory array:', person.reportHistory)
  console.log('enterChp array:', person.enterChp)
  console.log('===============================')

  // Clean and format enter433 data - ใช้ข้อมูลจาก Google Sheets ทั้งหมด (_433_dates)
  const formatEnter433 = (enter433: any[]) => {
    const dates: any[] = Array.isArray(person._433_dates) ? person._433_dates : []
    const entries: string[] = []
    dates.forEach((d, i) => {
      if (d && d.toString().trim()) entries.push(`ครั้งที่ ${i + 1} เมื่อ ${d}`)
    })
    return entries.length ? entries.join('\n') : '-'
  }

  // Clean and format report history - ใช้ข้อมูลจาก Google Sheets ทั้งหมด
  const formatReportHistory = (reportHistory: any[]) => {
    if (person.ถวายรายงาน && person['น.กำกับยาม'] && person.วันที่) {
      return `${person.ถวายรายงาน} คู่ ${person['น.กำกับยาม']} เมื่อ ${person.วันที่}`
    }
    return '-'
  }

  // Clean and format enterChp - ใช้หลักการเดียวกับ enter433 (_admin_dates)
  const formatEnterChp = (enterChp: any[]) => {
    const dates: any[] = Array.isArray(person._admin_dates) ? person._admin_dates : []
    const entries: string[] = []
    dates.forEach((d, i) => {
      if (d && d.toString().trim()) entries.push(`ครั้งที่ ${i + 1} เมื่อ ${d}`)
    })
    return entries.length ? entries.join('\n') : '-'
  }

  // คำนวณจำนวนครั้งที่เข้า 433 สำหรับสถิติ - ใช้ข้อมูลจาก Google Sheets เท่านั้น (_433_dates)
  const calculate433Count = () => {
    const dates: any[] = Array.isArray(person._433_dates) ? person._433_dates : []
    return dates.filter(d => d && d.toString().trim()).length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-start items-center mb-4 gap-2">
          <Button 
            onClick={onBack} 
            className="bg-yellow-400 text-black px-3 py-2 rounded-md shadow hover:bg-yellow-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            ย้อนกลับ
          </Button>
          <Button 
            onClick={handleRefresh} 
            className="bg-green-500 text-white p-2 rounded-full shadow hover:bg-green-600"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-3xl font-extrabold text-center tracking-tight mb-6">รายละเอียด</h2>

        {/* Profile Card */}
        <div className="rounded-lg p-6 shadow-md border border-slate-700/20 bg-gradient-to-tr from-blue-800/20 via-slate-800/10 to-transparent">
          {/* Profile Picture and Name */}
          <div className="flex flex-col items-center mb-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-700/40 flex items-center justify-center overflow-hidden ring-4 ring-white/6 shadow-2xl cursor-pointer">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={fullName} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="text-slate-200 text-center">
                      <User className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <span className="text-sm">รูปภาพ</span>
                    </div>
                  )}
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ดาวน์โหลดรูปภาพ</AlertDialogTitle>
                  <AlertDialogDescription>
                    คุณต้องการดาวน์โหลดรูปภาพนี้หรือไม่?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDownload}>ดาวน์โหลด</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="text-center mt-4">
              <div className="text-2xl font-semibold text-white">{displayName}</div>
              <div className="text-sm text-slate-300 mt-1">{position}</div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="divide-y divide-slate-500/40 bg-transparent rounded-md overflow-hidden">
            {/* Basic Information */}
            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Award className="h-4 w-4 mr-2" />
                ลำดับ
              </div>
              <div className="text-base font-medium text-white text-right">{person.ลำดับ || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                ชั้นปีที่
              </div>
              <div className="text-base font-medium text-white text-right">{person.ชั้นปีที่ || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                ตอน
              </div>
              <div className="text-base font-medium text-white text-right">{person.ตอน || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                สังกัด
              </div>
              <div className="text-base font-medium text-white text-right">{person.สังกัด || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                เบอร์โทรศัพท์
              </div>
              <div className="text-base font-medium text-white text-right">{person.เบอร์โทรศัพท์ || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Star className="h-4 w-4 mr-2" />
                คัดเกรด
              </div>
              <div className="text-base font-medium text-white text-right">{person.คัดเกรด || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Award className="h-4 w-4 mr-2" />
                ธุรการ ฝอ.
              </div>
              <div className="text-base font-medium text-white text-right">{person['ธุรการ ฝอ.'] || person.ธุรการ || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <User className="h-4 w-4 mr-2" />
                ตัวชน
              </div>
              <div className="text-base font-medium text-white text-right">{person.ตัวชน || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <User className="h-4 w-4 mr-2" />
                ส่วนสูง
              </div>
              <div className="text-base font-medium text-white text-right">{person.ส่วนสูง || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Star className="h-4 w-4 mr-2" />
                นักกีฬา
              </div>
              <div className="text-base font-medium text-white text-right">{person.นักกีฬา || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                ภารกิจอื่น ๆ
              </div>
              <div className="text-base font-medium text-white text-right">{person['ภารกิจอื่น ๆ'] || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                ดูงานต่างประเทศ
              </div>
              <div className="text-base font-medium text-white text-right">{person['ดูงานต่างประเทศ'] || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <User className="h-4 w-4 mr-2" />
                เจ็บ (ใบรับรองแพทย์)
              </div>
              <div className="text-base font-medium text-white text-right">{person['เจ็บ (ใบรับรองแพทย์)'] || '-'}</div >
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                หมายเหตุ
              </div>
              <div className="text-base font-medium text-white text-right">{person.หมายเหตุ || '-'}</div >
            </div>





            {/* Report History */}
            <div className="grid grid-cols-2 items-start px-6 py-4">
              <div className="text-sm text-slate-300">ประวัติถวายรายงาน</div>
              <div className="text-base font-medium text-white text-right whitespace-pre-line">
                {formatReportHistory(person.reportHistory)}
              </div>
            </div>

            {/* Dynamic 433 Columns */}
            {person._433_columns && person._433_columns.length > 0 && (
              <div className="grid grid-cols-2 items-start px-6 py-4">
                <div className="text-sm text-slate-300">รายละเอียด 433</div>
                <div className="text-base font-medium text-white text-right">
                  {person._433_columns.map((col: any, index: number) => (
                    <div key={index} className="mb-1">
                      <span className="text-slate-400 text-xs">{col.column}:</span> {col.value || '-'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Admin Columns */}
            {person._admin_columns && person._admin_columns.length > 0 && (
              <div className="grid grid-cols-2 items-start px-6 py-4">
                <div className="text-sm text-slate-300">รายละเอียด ธุรการ</div>
                <div className="text-base font-medium text-white text-right">
                  {person._admin_columns.map((col: any, index: number) => (
                    <div key={index} className="mb-1">
                      <span className="text-slate-400 text-xs">{col.column}:</span> {col.value || '-'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 items-center px-6 py-6">
              <div className="text-sm text-slate-300">จำนวนครั้งที่เข้า433</div>
              <div className="text-lg font-semibold text-white text-right">
                <Badge variant="secondary" className="bg-orange-600 text-white">
                  {calculate433Count()}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}