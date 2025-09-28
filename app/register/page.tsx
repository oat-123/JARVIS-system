"use client"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function RegisterPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/forest-background.png')`,
        }}
      />

      {/* Subtle Dark Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6">
        <div className="text-white text-xl font-bold drop-shadow-lg">CRMA@74</div>
      </header>

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="bg-white/15 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center mb-2 drop-shadow-lg">ติดต่อผู้ดูแลระบบ</CardTitle>
            <CardDescription className="text-center text-white/80 drop-shadow-sm">
              สำหรับลงทะเบียนเข้าใช้งานระบบ หรือแจ้งปัญหา
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="drop-shadow-sm">กรุณาติดต่อที่:</p>
            <p className="font-bold text-lg drop-shadow-md">Line ID: @0615583971</p>
            <p className="font-bold text-lg drop-shadow-md">เบอร์โทรศัพท์: 061-558-3971</p>
            <div className="flex justify-center pt-4">
              <Image
                src="/QRcode.jpg"
                alt="QR Code for contact"
                width={150}
                height={150}
                className="rounded-lg"
              />
            </div>
            <div className="pt-6">
              <Link href="/" passHref>
                <Button
                  variant="outline"
                  className="w-full bg-white/15 hover:bg-white/25 text-white py-3 rounded-lg font-medium transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  กลับไปหน้า Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
