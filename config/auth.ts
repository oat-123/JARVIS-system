// User configuration with sheet mapping
export const users = {
  oat: { 
    password: "crma74", 
    displayName: "ผู้ใช้ OAT", 
    role: "ผู้ดูแลระบบ", 
    group: "ชั้น4_พัน4",
    sheetname: "ชั้น4พัน4"
  },
  time: { 
    password: "crma74", 
    displayName: "ผู้ใช้ TIME", 
    role: "ผู้ใช้งาน", 
    group: "ชั้น4_พัน1",
    sheetname: "ชั้น4พัน1"
  },
  chai: { 
    password: "crma74", 
    displayName: "ผู้ใช้ CHAI", 
    role: "ผู้ใช้งาน", 
    group: "ชั้น4_พัน3",
    sheetname: "ชั้น4พัน3"
  },
} as const

// Sheet mapping for statistics module
export const userSheetMap = {
  "ชั้น4_พัน4": {
    name: "ชั้น4_พัน4",
    gid: "0",
    url: "https://docs.google.com/spreadsheets/d/1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk/edit#gid=0",
  },
  "ชั้น4_พัน1": {
    name: "ชั้น4_พัน1",
    gid: "589142731",
    url: "https://docs.google.com/spreadsheets/d/1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk/edit#gid=589142731",
  },
  "ชั้น4_พัน3": {
    name: "ชั้น4_พัน3",
    gid: "258225546",
    url: "https://docs.google.com/spreadsheets/d/1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk/edit#gid=258225546",
  },
} as const

// Type definitions
export type UserKey = keyof typeof users
export type SheetName = keyof typeof userSheetMap

export interface User {
  password: string
  displayName: string
  role: string
  group: string
  sheetname: string
}

export interface SheetConfig {
  name: string
  gid: string
  url: string
} 