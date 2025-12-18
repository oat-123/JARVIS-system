"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

interface WeekendDutyProps {
  onBack: () => void
  sheetName: string
}

export function WeekendDuty({ onBack }: WeekendDutyProps) {
  const [spreadsheetId, setSpreadsheetId] = useState("1ufm0LPa4c903jhlANKn_YqNyMtG9id0iN-tMHrhNRA8")

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config")
        const data = await res.json()
        if (data.success && data.configs.WEEKEND_DUTY_SPREADSHEET_ID) {
          setSpreadsheetId(data.configs.WEEKEND_DUTY_SPREADSHEET_ID)
        }
      } catch (error) {
        console.error("Error fetching config:", error)
      }
    }
    fetchConfig()
  }, [])

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
            <CardTitle className="text-2xl text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              📅 เวรเตรียมการ
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-lg text-slate-300">จัดการเวรเสาร์-อาทิตย์และวันหยุดราชการ</p>

            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                เปิด Google Sheet
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
