"use client"

import { useState } from "react"
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
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [showProfilePopup, setShowProfilePopup] = useState(false)

  const toggleProfilePopup = () => {
    setShowProfilePopup(!showProfilePopup)
  }

  if (activeModule === "ceremony-duty") {
    return <CeremonyDuty onBack={() => setActiveModule(null)} sheetName={user?.sheetname || ""} />
  }

  if (activeModule === "night-duty") {
    return <NightDuty onBack={() => setActiveModule(null)} sheetName={user?.sheetname || ""} />
  }

  if (activeModule === "weekend-duty") {
    return <WeekendDuty onBack={() => setActiveModule(null)} sheetName={user?.sheetname || ""} />
  }

  if (activeModule === "release-report") {
    return <ReleaseReport onBack={() => setActiveModule(null)} sheetName={user?.sheetname || ""} />
  }

  if (activeModule === "statistics") {
    return <Statistics onBack={() => setActiveModule(null)} sheetName={user?.sheetname || ""} />
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

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">ยอดที่จัดแล้ว</p>
                  <p className="text-2xl font-bold text-white">25</p>
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
            onClick={() => setActiveModule("night-duty")}
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
            onClick={() => setActiveModule("weekend-duty")}
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
            onClick={() => setActiveModule("ceremony-duty")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-yellow-400 transition-colors">
                <Award className="h-6 w-6" />
                <span>จัดยอดพิธี</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">สุ่มเลือกบุคลากรสำหรับงานพิธีต่างๆ</p>
              <Badge className="bg-yellow-600 text-white">จัดยอด(สุ่ม)</Badge>
            </CardContent>
          </Card>

          <Card
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
            onClick={() => setActiveModule("release-report")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-purple-400 transition-colors">
                <FileText className="h-6 w-6" />
                <span>ยอดปล่อย</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">สร้างรายงานยอดปล่อยประจำวัน</p>
              <Badge className="bg-purple-600 text-white">พิมพ์</Badge>
            </CardContent>
          </Card>

          <Card
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
            onClick={() => setActiveModule("statistics")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-orange-400 transition-colors">
                <BarChart3 className="h-6 w-6" />
                <span>สถิติโดนยอด</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">ตรวจสอบและอัพเดตสถิติการได้รับมอบหมาย</p>
              <Badge className="bg-orange-600 text-white">อัพเดต-ตรวจสอบ</Badge>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
