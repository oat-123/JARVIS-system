"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, X, Users, Clock, MapPin, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface DutyEvent {
  id: string
  title: string
  description: string
  date: string
  time?: string
  location?: string
  assignedPersons: string[]
  type: 'duty433' | 'admin' | 'report' | 'ceremony' | 'other'
  priority: 'high' | 'medium' | 'low'
  status: 'scheduled' | 'completed' | 'cancelled'
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: DutyEvent[]
}

interface PopupData {
  date: Date
  events: DutyEvent[]
  weeklyDuty: any[]
}

interface EnhancedCalendarProps {
  onBack: () => void
  username?: string | null
}

export function EnhancedCalendar({ onBack, username }: EnhancedCalendarProps) {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [popupData, setPopupData] = useState<PopupData | null>(null)
  const [events, setEvents] = useState<DutyEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Sample duty events data - in real implementation, this would come from API
  const sampleEvents: DutyEvent[] = [
    {
      id: '1',
      title: 'เวรยาม 433',
      description: 'เวรยามประจำวันเสาร์-อาทิตย์',
      date: '2024-01-13',
      time: '08:00-17:00',
      location: 'อาคาร 433',
      assignedPersons: ['นนร.สมชาย ใจดี', 'นนร.วิชัย กล้าหาญ'],
      type: 'duty433',
      priority: 'high',
      status: 'scheduled'
    },
    {
      id: '2',
      title: 'ธุรการ ฝอ.',
      description: 'งานธุรการประจำวัน',
      date: '2024-01-15',
      time: '09:00-16:00',
      location: 'สำนักงาน ฝอ.',
      assignedPersons: ['นนร.ประยุทธ์ มั่นคง'],
      type: 'admin',
      priority: 'medium',
      status: 'scheduled'
    },
    {
      id: '3',
      title: 'ถวายรายงาน',
      description: 'ถวายรายงานประจำสัปดาห์',
      date: '2024-01-16',
      time: '14:00',
      location: 'ห้องประชุม',
      assignedPersons: ['นนร.อนุชา เรียบร้อย'],
      type: 'report',
      priority: 'high',
      status: 'scheduled'
    },
    {
      id: '4',
      title: 'พิธีเคารพธงชาติ',
      description: 'พิธีเคารพธงชาติประจำวัน',
      date: '2024-01-17',
      time: '08:00',
      location: 'ลานธงชาติ',
      assignedPersons: ['นนร.สมศักดิ์ ดีงาม', 'นนร.วิทยา ฉลาด'],
      type: 'ceremony',
      priority: 'medium',
      status: 'scheduled'
    }
  ]

  useEffect(() => {
    setEvents(sampleEvents)
  }, [])

  // Thai month names
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธ���นวาคม'
  ]

  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days: CalendarDay[] = []
    const today = new Date()
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.date)
        return eventDate.toDateString() === date.toDateString()
      })
      
      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        events: dayEvents
      })
    }
    
    return days
  }, [currentDate, events])

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  // Handle day click
  const handleDayClick = async (day: CalendarDay) => {
    setSelectedDate(day.date)
    setIsLoading(true)
    
    // Simulate API call for weekly duty data
    try {
      // In real implementation, fetch weekly duty data from API
      const weeklyDuty = [
        { name: 'นนร.สมชาย ใจดี', position: 'หัวหน้าเวร', count: 3 },
        { name: 'นนร.วิชัย กล้าหาญ', position: 'ผู้ช่วย', count: 2 }
      ]
      
      setPopupData({
        date: day.date,
        events: day.events,
        weeklyDuty
      })
      setShowPopup(true)
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get event type color
  const getEventTypeColor = (type: DutyEvent['type']) => {
    switch (type) {
      case 'duty433': return 'bg-blue-500'
      case 'admin': return 'bg-green-500'
      case 'report': return 'bg-orange-500'
      case 'ceremony': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: DutyEvent['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-400'
      case 'medium': return 'border-yellow-400'
      case 'low': return 'border-green-400'
      default: return 'border-gray-400'
    }
  }

  // Format Thai date
  const formatThaiDate = (date: Date) => {
    const day = date.getDate()
    const month = thaiMonths[date.getMonth()]
    const year = date.getFullYear() + 543
    return `${day} ${month} ${year}`
  }

  // Close popup
  const closePopup = () => {
    setShowPopup(false)
    setPopupData(null)
    setSelectedDate(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} className="bg-yellow-400 text-black">
              <ChevronLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              ปฏิทินเว���ประจำ
            </div>
            <Badge className="bg-green-600 text-white">
              <Calendar className="h-3 w-3 mr-1" />
              ระบบจัดการเวร
            </Badge>
          </div>
          <div className="text-sm text-slate-300">
            {new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </header>

        {/* Calendar Navigation */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => navigateMonth('prev')}
              className="bg-slate-700 hover:bg-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-2xl font-bold text-center">
              {thaiMonths[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
            </h2>
            
            <Button
              onClick={() => navigateMonth('next')}
              className="bg-slate-700 hover:bg-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {thaiDays.map((day) => (
              <div key={day} className="text-center font-semibold text-slate-400 p-2">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`
                  min-h-[120px] p-2 border border-slate-700 rounded-lg cursor-pointer
                  transition-all duration-200 hover:bg-slate-700/50
                  ${day.isCurrentMonth ? 'bg-slate-800/40' : 'bg-slate-900/20 opacity-50'}
                  ${day.isToday ? 'ring-2 ring-blue-400' : ''}
                  ${selectedDate?.toDateString() === day.date.toDateString() ? 'bg-blue-600/30' : ''}
                `}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${day.isToday ? 'text-blue-400' : 'text-slate-200'}`}>
                    {day.date.getDate()}
                  </span>
                  {day.events.length > 0 && (
                    <Badge className="bg-red-500 text-white text-xs px-1 py-0">
                      {day.events.length}
                    </Badge>
                  )}
                </div>
                
                {/* Event indicators */}
                <div className="space-y-1">
                  {day.events.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`
                        text-xs p-1 rounded truncate border-l-2
                        ${getEventTypeColor(event.type)} bg-opacity-20
                        ${getPriorityColor(event.priority)}
                      `}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {day.events.length > 3 && (
                    <div className="text-xs text-slate-400 text-center">
                      +{day.events.length - 3} เพิ่มเติม
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Legend */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">คำอธิบายสี</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">เวร 433</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">ธุรการ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm">ถวายรายงาน</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm">พิธีการ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Popup Modal */}
      {showPopup && popupData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Popup Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-xl font-bold">
                วันที่ {formatThaiDate(popupData.date)}
              </h3>
              <Button
                onClick={closePopup}
                className="bg-transparent hover:bg-slate-700 p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Popup Content */}
            <div className="p-4 space-y-6">
              {/* Events Section */}
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  กิจกรรมประจำวัน ({popupData.events.length})
                </h4>
                
                {popupData.events.length > 0 ? (
                  <div className="space-y-3">
                    {popupData.events.map((event) => (
                      <div
                        key={event.id}
                        className={`
                          bg-slate-900/50 border-l-4 rounded-lg p-4
                          ${getEventTypeColor(event.type).replace('bg-', 'border-')}
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-lg">{event.title}</h5>
                          <Badge
                            className={`
                              ${event.priority === 'high' ? 'bg-red-600' : 
                                event.priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'}
                            `}
                          >
                            {event.priority === 'high' ? 'สำคัญมาก' :
                             event.priority === 'medium' ? 'สำคัญปานกลาง' : 'สำคัญน้อย'}
                          </Badge>
                        </div>
                        
                        <p className="text-slate-300 mb-3">{event.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {event.time && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span>เวลา: {event.time}</span>
                            </div>
                          )}
                          
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              <span>สถานที่: {event.location}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium">ผู้ปฏิบัติหน้าที่:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {event.assignedPersons.map((person, index) => (
                              <Badge key={index} className="bg-slate-700 text-slate-200">
                                {person}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>ไม่มีกิจกรรมในวันนี้</p>
                  </div>
                )}
              </div>

              {/* Weekly Duty Section */}
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-400" />
                  ผู้ปฏิบัติหน้าที่สัปดาห์นี้
                </h4>
                
                {popupData.weeklyDuty.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {popupData.weeklyDuty.map((person, index) => (
                      <div
                        key={index}
                        className="bg-slate-900/50 border border-slate-700 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{person.name}</div>
                            <div className="text-sm text-slate-400">{person.position}</div>
                          </div>
                          <Badge className="bg-blue-600">
                            {person.count} ครั้ง
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400">
                    ไม่มีข้อมูลผู้ปฏิบัติหน้าที่
                  </div>
                )}
              </div>
            </div>

            {/* Popup Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
              <Button onClick={closePopup} className="bg-slate-600 hover:bg-slate-500">
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}