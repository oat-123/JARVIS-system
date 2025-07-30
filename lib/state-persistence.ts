// State Persistence Utility สำหรับ JARVIS Modules
// บันทึกและโหลด form state ให้แต่ละ module

export interface ModuleState {
  [key: string]: any
}

const STATE_PREFIX = 'jarvis-module-state'

/**
 * บันทึก state ของ module
 */
export function saveModuleState(moduleName: string, state: ModuleState): void {
  if (typeof window === 'undefined') return
  
  try {
    const stateKey = `${STATE_PREFIX}-${moduleName}`
    const stateData = {
      ...state,
      timestamp: Date.now(),
      version: '1.0'
    }
    sessionStorage.setItem(stateKey, JSON.stringify(stateData))
  } catch (error) {
    console.warn(`Failed to save state for ${moduleName}:`, error)
  }
}

/**
 * โหลด state ของ module
 */
export function loadModuleState(moduleName: string): ModuleState | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stateKey = `${STATE_PREFIX}-${moduleName}`
    const stateStr = sessionStorage.getItem(stateKey)
    
    if (!stateStr) return null
    
    const stateData = JSON.parse(stateStr)
    
    // ตรวจสอบอายุของ state (เก็บไว้ 24 ชั่วโมง)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    if (Date.now() - stateData.timestamp > maxAge) {
      clearModuleState(moduleName)
      return null
    }
    
    // ลบ metadata ออก
    const { timestamp, version, ...actualState } = stateData
    return actualState
  } catch (error) {
    console.warn(`Failed to load state for ${moduleName}:`, error)
    return null
  }
}

/**
 * ลบ state ของ module
 */
export function clearModuleState(moduleName: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const stateKey = `${STATE_PREFIX}-${moduleName}`
    sessionStorage.removeItem(stateKey)
  } catch (error) {
    console.warn(`Failed to clear state for ${moduleName}:`, error)
  }
}

/**
 * ลบ state ทั้งหมด
 */
export function clearAllModuleStates(): void {
  if (typeof window === 'undefined') return
  
  try {
    const keys = Object.keys(sessionStorage)
    keys.forEach(key => {
      if (key.startsWith(STATE_PREFIX)) {
        sessionStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('Failed to clear all module states:', error)
  }
}

/**
 * Hook สำหรับใช้งาน state persistence
 */
import { useEffect, useRef } from 'react'

export function useModuleState<T extends ModuleState>(
  moduleName: string,
  initialState: T,
  dependencies: any[] = []
): [T, (newState: Partial<T>) => void] {
  const stateRef = useRef<T>(initialState)
  const isInitialized = useRef(false)

  // โหลด state เมื่อเริ่มต้น
  useEffect(() => {
    if (!isInitialized.current) {
      const savedState = loadModuleState(moduleName)
      if (savedState) {
        stateRef.current = { ...initialState, ...savedState }
      }
      isInitialized.current = true
    }
  }, [])

  // บันทึก state เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (isInitialized.current) {
      saveModuleState(moduleName, stateRef.current)
    }
  }, dependencies)

  const updateState = (newState: Partial<T>) => {
    stateRef.current = { ...stateRef.current, ...newState }
    saveModuleState(moduleName, stateRef.current)
  }

  return [stateRef.current, updateState]
}
