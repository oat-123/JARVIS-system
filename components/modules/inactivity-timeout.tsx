"use client"

import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes

export function InactivityTimeout() {
  const router = useRouter()

  const logout = useCallback(() => {
    fetch("/api/auth/logout").then(() => {
      router.push("/")
    })
  }, [router])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const resetTimeout = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(logout, INACTIVITY_TIMEOUT)
    }

    const events = ["mousemove", "keydown", "mousedown", "touchstart"]

    const resetTimeoutOnActivity = () => resetTimeout()

    events.forEach(event => {
      window.addEventListener(event, resetTimeoutOnActivity)
    })

    resetTimeout()

    return () => {
      clearTimeout(timeoutId)
      events.forEach(event => {
        window.removeEventListener(event, resetTimeoutOnActivity)
      })
    }
  }, [logout])

  return null
}
