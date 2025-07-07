"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ExternalLink, RefreshCw, Eye, Edit } from "lucide-react"

interface NightDutyProps {
  onBack: () => void
  sheetName: string
}

export function NightDuty({ onBack, sheetName }: NightDutyProps) {
  const [selectedSheet, setSelectedSheet] = useState<"tag" | "summary">("tag")
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = () => {
    setIsLoading(true)
    // Simulate refresh
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  const getIframeLink = () => {
    if (selectedSheet === "tag") {
      return "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8pO9068jsukCJL0guT_dF7I5cjYMMIhsu7ah-1DkPxSMxnYFsSkuRgffvSUJKVZzQccQyJEOPxvvg/pubhtml?gid=0&single=true&range=A1:I100"
    } else {
      return "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8pO9068jsukCJL0guT_dF7I5cjYMMIhsu7ah-1DkPxSMxnYFsSkuRgffvSUJKVZzQccQyJEOPxvvg/pubhtml?gid=2030248910&single=true&range=A1:I100"
    }
  }

  const getEditLink = () => {
    if (selectedSheet === "tag") {
      return "https://docs.google.com/spreadsheets/d/1PjT38W2Zx7KV764yv9Vjwo9i0TJPacRI0iUGzP0ItAU/edit#gid=0"
    } else {
      return "https://docs.google.com/spreadsheets/d/1PjT38W2Zx7KV764yv9Vjwo9i0TJPacRI0iUGzP0ItAU/edit#gid=1"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={onBack}
            variant="outline"
            className="text-white border-white/30 hover:bg-white/10 hover:text-white bg-transparent backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับหน้าหลัก
          </Button>

          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              🛡️ เวรรักษาการณ์
            </h1>
            <p className="text-slate-300 mt-2">ระบบจัดการเวรยืนกลางคืน</p>
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="text-white border-white/30 hover:bg-white/10 bg-transparent backdrop-blur-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>

        {/* Status Bar */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className="bg-green-600 text-white">เชื่อมต่อแล้ว</Badge>
                <span className="text-slate-300 text-sm">ฐานข้อมูล: {sheetName}</span>
              </div>
              <div className="text-slate-400 text-sm">Google Sheets Integration</div>
            </div>
          </CardContent>
        </Card>

        {/* Sheet Selection */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">เลือกดูชีท</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={() => setSelectedSheet("tag")}
                variant={selectedSheet === "tag" ? "default" : "outline"}
                className={
                  selectedSheet === "tag"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "text-white border-white/30 hover:bg-white/10 bg-transparent"
                }
              >
                <Eye className="h-4 w-4 mr-2" />
                แท็กเวร
              </Button>
              <Button
                onClick={() => setSelectedSheet("summary")}
                variant={selectedSheet === "summary" ? "default" : "outline"}
                className={
                  selectedSheet === "summary"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "text-white border-white/30 hover:bg-white/10 bg-transparent"
                }
              >
                <Eye className="h-4 w-4 mr-2" />
                ใบเวร (สรุป)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Google Sheets Iframe */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="border-2 border-green-500/50 rounded-lg overflow-hidden">
              <iframe
                src={getIframeLink()}
                className="w-full h-[600px] border-none"
                style={{ zoom: 0.75 }}
                title="Google Sheets"
              />
            </div>
            <div className="p-4 bg-green-600/20 border-t border-green-500/50">
              <Button
                onClick={() => window.open(getEditLink(), "_blank")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                แก้ไข Google Sheets
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
