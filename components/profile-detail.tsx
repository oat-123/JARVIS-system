"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Phone, Award, Calendar, MapPin, Star } from "lucide-react"
import { useEffect } from "react"

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
  const position = person['ตำแหน่ง ทกท.'] || person.ตำแหน่ง || person['ทกท.'] || ''

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
      }
      fetch('/api/profile-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    } catch (e) {}
  // เปลี่ยนเมื่อเป้าหมายเปลี่ยนคน
  }, [fullName, position, person._433_dates, person._admin_dates, person.ถวายรายงาน, person['น.กำกับยาม'], person.วันที่])

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
        <div className="relative mb-6 py-2">
          <Button 
            onClick={onBack} 
            className="absolute left-4 top-4 bg-white text-slate-900 px-3 py-2 rounded-md shadow hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            ย้อนกลับ
          </Button>
          <h2 className="text-3xl font-extrabold text-center tracking-tight">รายละเอียด</h2>
        </div>

        {/* Profile Card */}
        <div className="rounded-lg p-6 shadow-md border border-slate-700/20 bg-gradient-to-tr from-blue-800/20 via-slate-800/10 to-transparent">
          {/* Profile Picture and Name */}
          <div className="flex flex-col items-center -mt-12 mb-6">
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-700/40 flex items-center justify-center overflow-hidden ring-4 ring-white/6 shadow-2xl">
              {person.avatarUrl ? (
                <img 
                  src={person.avatarUrl} 
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
            <div className="text-center mt-4">
              <div className="text-2xl font-semibold text-white">{fullName}</div>
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
              <div className="text-base font-medium text-white text-right">{person.ลำดับ || '-'}</div>
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                ชั้นปีที่
              </div>
              <div className="text-base font-medium text-white text-right">{person.ชั้นปีที่ || '-'}</div>
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                ตอน
              </div>
              <div className="text-base font-medium text-white text-right">{person.ตอน || '-'}</div>
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                สังกัด
              </div>
              <div className="text-base font-medium text-white text-right">{person.สังกัด || '-'}</div>
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                เบอร์โทรศัพท์
              </div>
              <div className="text-base font-medium text-white text-right">{person.เบอร์โทรศัพท์ || '-'}</div>
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300 flex items-center">
                <Star className="h-4 w-4 mr-2" />
                คัดเกรด
              </div>
              <div className="text-base font-medium text-white text-right">{person.คัดเกรด || '-'}</div>
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300">ธุรการ ฝอ.</div>
              <div className="text-base font-medium text-white text-right">{person['ธุรการ ฝอ.'] || person.ธุรการ || '-'}</div>
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300">ตัวชน</div>
              <div className="text-base font-medium text-white text-right">{person.ตัวชน || '-'}</div>
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300">ส่วนสูง</div>
              <div className="text-base font-medium text-white text-right">{person.ส่วนสูง || '-'}</div>
            </div>

            <div className="grid grid-cols-2 items-center px-6 py-4">
              <div className="text-sm text-slate-300">นักกีฬา</div>
              <div className="text-base font-medium text-white text-right">{person.นักกีฬา || '-'}</div>
            </div>

            {/* Report History */}
            <div className="grid grid-cols-2 items-start px-6 py-4">
              <div className="text-sm text-slate-300">ประวัติถวายรายงาน</div>
              <div className="text-base font-medium text-white text-right whitespace-pre-line">
                {formatReportHistory(person.reportHistory)}
              </div>
            </div>

            {/* Enter 433 History */}
            <div className="grid grid-cols-2 items-start px-6 py-4">
              <div className="text-sm text-slate-300">ประวัติเข้า433</div>
              <div className="text-base font-medium text-white text-right whitespace-pre-line">
                {formatEnter433(person.enter433)}
              </div>
            </div>

            {/* Enter ChP History */}
            <div className="grid grid-cols-2 items-start px-6 py-4">
              <div className="text-sm text-slate-300">ประวัติเข้าชป.</div>
              <div className="text-base font-medium text-white text-right whitespace-pre-line">
                {formatEnterChp(person.enterChp)}
              </div>
            </div>

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
