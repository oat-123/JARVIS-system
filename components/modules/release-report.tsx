"use client"

import { useState, useEffect } from "react"
import { saveModuleState, loadModuleState, clearModuleState } from "@/lib/state-persistence"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ExternalLink } from "lucide-react"

interface ReleaseReportProps {
  onBack: () => void
  sheetName: string
}

export function ReleaseReport({ onBack }: ReleaseReportProps) {
  const MODULE_NAME = 'release-report'
  const [isStateLoaded, setIsStateLoaded] = useState(false)
  
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [report, setReport] = useState("")

  const defaults = { 5: 67, 4: 101, 3: 94, 2: 85 }
  const categories = ["เวรเตรียมพร้อม", "กักบริเวณ", "อยู่โรงเรียน", "ราชการ", "โรงพยาบาล", "ลา", "อื่นๆ"]

  const [data, setData] = useState<Record<number, Record<string, number>>>({
    5: Object.fromEntries(categories.map((cat) => [cat, 0])),
    4: Object.fromEntries(categories.map((cat) => [cat, 0])),
    3: Object.fromEntries(categories.map((cat) => [cat, 0])),
    2: Object.fromEntries(categories.map((cat) => [cat, 0])),
  })

  const updateData = (year: number, category: string, value: number) => {
    setData((prev) => ({
      ...prev,
      [year]: {
        ...prev[year],
        [category]: value,
      },
    }))
  }

  // ฟังก์ชันบันทึกและโหลด state
  const saveCurrentState = () => {
    if (!isStateLoaded) return // ป้องกันการบันทึกก่อนโหลด state เสร็จ
    console.log('💾 Saving release-report state:', { startDate, endDate, report: report.substring(0, 50) + '...', data })
    saveModuleState(MODULE_NAME, { startDate, endDate, report, data })
  }

  const loadSavedState = () => {
    const savedState = loadModuleState(MODULE_NAME)
    if (savedState) {
      console.log('🔄 Loading release-report state:', savedState)
      if (savedState.startDate) setStartDate(savedState.startDate)
      if (savedState.endDate) setEndDate(savedState.endDate)
      if (savedState.report) setReport(savedState.report)
      if (savedState.data) setData(savedState.data)
      console.log('✅ Release-report state loaded successfully')
    } else {
      console.log('ℹ️ No saved release-report state found')
    }
    setIsStateLoaded(true)
  }

  // useEffect hooks
  useEffect(() => {
    // โหลด state ทันทีเมื่อ component mount
    loadSavedState()
  }, [])

  useEffect(() => {
    // บันทึก state หลังจากโหลดเสร็จแล้ว
    if (isStateLoaded) {
      saveCurrentState()
    }
  }, [startDate, endDate, report, data, isStateLoaded])

  const generateReport = () => {
    const lines: string[] = []
    const startStr = new Date(startDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
    const endStr = new Date(endDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })

    lines.push(
      `พัน.4 กรม นนร.รอ. ขออนุญาตส่งยอด นนร. ปล่อยพักบ้าน, อยู่โรงเรียน และ เวรเตรียมพร้อม ของวันที่ ${startStr} - ${endStr} ดังนี้`,
    )
    lines.push("")

    // ยอดเดิม
    for (const y of [5, 4, 3, 2]) {
      lines.push(`ชั้นปีที่ ${y} ยอดเดิม ${defaults[y]} นาย`)
    }
    lines.push("")

    // 1. ยอดปล่อยบ้าน
    lines.push("1.ยอดปล่อยพักบ้าน")
    let totalHome = 0
    for (const y of [5, 4, 3, 2]) {
      const sumOthers = Object.values(data[y]).reduce((sum, val) => sum + (val || 0), 0)
      const val = defaults[y] - sumOthers
      totalHome += val
      lines.push(`   -ชั้นปีที่ ${y} จำนวน ${val} นาย`)
    }
    lines.push(`   -รวม ${totalHome} นาย`)
    lines.push("")

    // 2-8. หมวดหมู่อื่นๆ
    const categoryMap = ["อยู่โรงเรียน", "เวรเตรียมพร้อม", "กักบริเวณ", "โรงพยาบาล", "ราชการ", "ลา", "อื่นๆ"]
    categoryMap.forEach((cat, index) => {
      lines.push(`${index + 2}.${cat}`)
      let total = 0
      for (const y of [5, 4, 3, 2]) {
        const val = data[y][cat] || 0
        total += val
        const showVal = val !== 0 ? val.toString() : "-"
        lines.push(`   -ชั้นปีที่ ${y} จำนวน ${showVal} นาย`)
      }
      const showTotal = total !== 0 ? total.toString() : "-"
      lines.push(`   -รวม ${showTotal} นาย`)
      lines.push("")
    })

    lines.push("จึงเรียนมาเพื่อกรุณาทราบ")

    setReport(lines.join("\n"))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          onClick={onBack}
          variant="outline"
          className="mb-8 text-white border-white hover:bg-white hover:text-black bg-transparent"
        >
          ← กลับหน้าหลัก
        </Button>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">📝 ยอดปล่อย</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* วันที่ */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-white">
                  วันปล่อย
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-white">
                  วันเข้ารร.
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* กรอกข้อมูลแต่ละชั้นปี */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">กรอกข้อมูลแต่ละชั้นปี</h3>

              {[5, 4, 3, 2].map((year) => (
                <Card key={year} className="bg-slate-700/50 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">
                      ชั้นปีที่ {year} (ยอดเดิม {defaults[year]} นาย)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {categories.map((category) => (
                        <div key={category} className="space-y-2">
                          <Label className="text-white text-sm font-medium">{category}</Label>
                          <Input
                            type="number"
                            min="0"
                            value={data[year][category] || 0}
                            onChange={(e) => updateData(year, category, Number.parseInt(e.target.value) || 0)}
                            className="bg-slate-600 border-slate-500 text-white"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>

                    {/* แสดงยอดคงเหลือ */}
                    <div className="mt-4 p-3 bg-slate-600/50 rounded-lg">
                      <div className="text-sm text-slate-300">
                        ยอดใช้ไป: {Object.values(data[year]).reduce((sum, val) => sum + (val || 0), 0)} นาย
                      </div>
                      <div className="text-sm font-semibold text-green-400">
                        ยอดปล่อยบ้าน:{" "}
                        {defaults[year] - Object.values(data[year]).reduce((sum, val) => sum + (val || 0), 0)} นาย
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ปุ่มสร้างรายงาน */}
            <div className="flex gap-4">
              <Button
                onClick={generateReport}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                📘 สร้างรายงาน
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white bg-transparent"
              >
                <a
                  href="https://docs.google.com/spreadsheets/d/1_kKUegxtwwd3ce3EduPqRoPpgAF1_IcecA1ri9Pfxz0/edit?gid=351113778#gid=351113778"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />📗 ทำไฟล์
                </a>
              </Button>
            </div>

            {/* แสดงรายงาน */}
            {report && (
              <Card className="bg-slate-700/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">รายงานยอด</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={report}
                    readOnly
                    className="bg-slate-800 border-slate-600 text-white h-96 font-mono text-sm resize-none"
                  />
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
