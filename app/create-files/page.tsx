"use client"

import React from 'react'
import { CreateFiles } from '@/components/modules/create-files'

export default function CreateFilesPage() {
  return (
      <CreateFiles onBack={() => {
        if (typeof window !== 'undefined') {
          // navigate to dashboard and request opening duty-433 overview
          window.location.href = '/?open=duty-433'
        }
      }} />
  )
}
