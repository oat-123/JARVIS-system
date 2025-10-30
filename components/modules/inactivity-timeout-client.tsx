"use client"

import React from "react"
import { InactivityTimeout as InactivityTimeoutInner } from "@/components/modules/inactivity-timeout"

export default function InactivityTimeout() {
  // Simple client-only wrapper. The real logic lives in
  // `components/modules/inactivity-timeout.tsx` which already has `"use client"`.
  return <InactivityTimeoutInner />
}
