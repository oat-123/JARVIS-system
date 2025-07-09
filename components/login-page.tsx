"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Checkbox } from "./ui/checkbox"
import { X } from "lucide-react"

interface LoginPageProps {
  onLogin: (username: string, password: string) => boolean
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate loading
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const success = onLogin(username, password)
    if (!success) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
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
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="text-white text-xl font-bold drop-shadow-lg">Logo</div>
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#" className="text-white/90 hover:text-white transition-colors drop-shadow-sm">
            Home
          </a>
          <a href="#" className="text-white/90 hover:text-white transition-colors drop-shadow-sm">
            About
          </a>
          <a href="#" className="text-white/90 hover:text-white transition-colors drop-shadow-sm">
            Services
          </a>
          <a href="#" className="text-white/90 hover:text-white transition-colors drop-shadow-sm">
            Contact
          </a>
          <Button
            variant="outline"
            className="text-white border-white/70 hover:bg-white hover:text-black bg-white/10 backdrop-blur-sm transition-all duration-300"
          >
            Login
          </Button>
        </nav>
      </header>

      {/* Login Modal */}
      <div className="relative z-20 flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="w-full max-w-md mx-4">
          <div className="bg-white/15 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 relative">
            {/* Close Button */}
            <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>

            {/* Login Form */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">Login</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90 font-medium drop-shadow-sm">
                  Email / Username
                </Label>
                <Input
                  id="email"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:ring-2 focus:ring-white/30 focus:border-white/40 focus:bg-white/20 transition-all duration-300"
                  placeholder="กรอกชื่อผู้ใช้หรืออีเมล"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90 font-medium drop-shadow-sm">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:ring-2 focus:ring-white/30 focus:border-white/40 focus:bg-white/20 transition-all duration-300"
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-white/40 data-[state=checked]:bg-white/20 data-[state=checked]:border-white/60"
                  />
                  <Label htmlFor="remember" className="text-sm text-white/80 drop-shadow-sm">
                    Remember me
                  </Label>
                </div>
                <a href="#" className="text-sm text-white/80 hover:text-white transition-colors drop-shadow-sm">
                  Forgot Password?
                </a>
              </div>

              {error && (
                <div className="text-red-200 text-sm text-center bg-red-500/20 backdrop-blur-sm p-3 rounded-lg border border-red-300/20">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white/15 hover:bg-white/25 text-white py-3 rounded-lg font-medium transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40"
              >
                {isLoading ? "กำลังเข้าสู่ระบบ..." : "Login"}
              </Button>

              <div className="text-center text-sm text-white/80 drop-shadow-sm">
                {"Don't have an account? "}
                <a href="#" className="text-white hover:text-white/80 font-medium transition-colors">
                  Register
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
