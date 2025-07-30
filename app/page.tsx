"use client";
import { useState, useEffect } from 'react'
import { LoginPage } from '../components/login-page'
import { Dashboard } from '../components/dashboard'

// force rebuild: 2025-07-06

type UserKey = "oat" | "time" | "chai"

interface User {
  password: string
  sheet_name: string
}

const users: Record<UserKey, User> = {
  oat: {
    password: "crma74",
    sheet_name: "ชั้น4_พัน4"
  },
  time: {
    password: "crma74",
    sheet_name: "ชั้น4_พัน1"
  },
  chai: {
    password: "crma74",
    sheet_name: "ชั้น4_พัน3"
  }
}


// Session Management Functions
const SESSION_KEY = 'jarvis-session'
const SESSION_EXPIRY_HOURS = 24 // 24 ชั่วโมง

interface SessionData {
  username: UserKey
  loginTime: number
  expiryTime: number
}

function saveSession(username: UserKey, rememberMe: boolean = false) {
  const now = Date.now()
  const expiryHours = rememberMe ? 24 * 7 : SESSION_EXPIRY_HOURS // 7 วันถ้าติ๊ก Remember Me
  const sessionData: SessionData = {
    username,
    loginTime: now,
    expiryTime: now + (expiryHours * 60 * 60 * 1000)
  }
  
  if (rememberMe) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
  }
}

function loadSession(): SessionData | null {
  if (typeof window === 'undefined') return null
  
  // ลองจาก localStorage ก่อน (Remember Me)
  let sessionStr = localStorage.getItem(SESSION_KEY)
  let isFromLocalStorage = true
  
  // ถ้าไม่มีใน localStorage ลองจาก sessionStorage
  if (!sessionStr) {
    sessionStr = sessionStorage.getItem(SESSION_KEY)
    isFromLocalStorage = false
  }
  
  if (!sessionStr) return null
  
  try {
    const sessionData: SessionData = JSON.parse(sessionStr)
    const now = Date.now()
    
    // ตรวจสอบว่า session หมดอายุหรือยัง
    if (now > sessionData.expiryTime) {
      clearSession()
      return null
    }
    
    // ถ้า session ใกล้หมดอายุ (เหลือน้อยกว่า 2 ชั่วโมง) ให้ต่ออายุ
    if (sessionData.expiryTime - now < 2 * 60 * 60 * 1000) {
      const newExpiryTime = now + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
      sessionData.expiryTime = newExpiryTime
      
      if (isFromLocalStorage) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
      }
    }
    
    return sessionData
  } catch {
    clearSession()
    return null
  }
}

function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem('jarvis-page-state') // ลบ page state ด้วย
  
  // ลบ module states ทั้งหมด
  const keys = Object.keys(sessionStorage)
  keys.forEach(key => {
    if (key.startsWith('jarvis-module-state')) {
      sessionStorage.removeItem(key)
    }
  })
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserKey | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // ตรวจสอบ session เมื่อแอปเริ่มต้น
  useEffect(() => {
    const session = loadSession()
    if (session && users[session.username]) {
      setIsLoggedIn(true)
      setCurrentUser(session.username)
    }
    setIsInitializing(false)
  }, [])

  const handleLogin = (username: string, password: string, rememberMe: boolean = false) => {
    const userKey = username as UserKey
    if (users[userKey] && users[userKey].password === password) {
      setIsLoggedIn(true)
      setCurrentUser(userKey)
      saveSession(userKey, rememberMe)
      return true
    }
    return false
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
    clearSession()
  }
  
  // แสดง Loading จนกว่าจะตรวจสอบ session เสร็จ
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg">กำลังตรวจสอบ Session...</div>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  // สร้าง user object ให้ตรงกับ Dashboard ตัวเต็ม
  const userObj = currentUser
    ? {
        username: currentUser,
        displayName: currentUser,
        role: currentUser === "oat" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน",
        group: users[currentUser].sheet_name,
        sheetname: users[currentUser].sheet_name,
      }
    : null;

  return <Dashboard user={userObj} username={currentUser} onLogout={handleLogout} />
}
