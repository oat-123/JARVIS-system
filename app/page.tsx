"use client";
import { useState } from 'react'
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


export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserKey | null>(null)

  const handleLogin = (username: string, password: string) => {
    const userKey = username as UserKey
    if (users[userKey] && users[userKey].password === password) {
      setIsLoggedIn(true)
      setCurrentUser(userKey)
      return true
    }
    return false
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
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
