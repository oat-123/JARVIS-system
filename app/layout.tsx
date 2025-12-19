import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from '@/components/ui/tooltip'
import InactivityTimeout from '../components/modules/inactivity-timeout-client'
import { FetchInterceptor } from '@/components/fetch-interceptor'

import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "J.A.R.V.I.S - ระบบผู้ช่วย ฝอ.1",
  description: "ระบบผู้ช่วยอัจฉริยะสำหรับการจัดการงานต่างๆ ของ ฝอ.1",
  generator: "v0.dev",
  icons: {
    icon: "/jarvis-favicon.png",
    shortcut: "/jarvis-favicon.png",
    apple: "/jarvis-favicon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className="dark">
      <head>
        <link rel="icon" href="/jarvis-favicon.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <FetchInterceptor />
        <InactivityTimeout />
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}