import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { SystemHealth, AuditLogEntry } from '../types/system'
import { Camera } from '../types/camera'
import { getSystemHealth } from '../services/dataService'

interface SystemContextType {
  systemHealth: SystemHealth | null
  cameras: Camera[]
  auditLog: AuditLogEntry[]
  refreshSystemHealth: () => void
  refreshCameras: () => Promise<void>
  refreshAuditLog: () => Promise<void>
  isLoadingCameras: boolean
}

const SystemContext = createContext<SystemContextType | undefined>(undefined)

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [cameras, setCameras] = useState<Camera[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [isLoadingCameras, setIsLoadingCameras] = useState(false)

  const refreshSystemHealth = () => {
    const health = getSystemHealth(cameras)
    setSystemHealth(health)
  }

  const refreshCameras = async () => {
    setIsLoadingCameras(true)
    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch cameras:', error.message)
      setIsLoadingCameras(false)
      return
    }

    const mapped: Camera[] = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      streamUrl: c.stream_url,
      status: c.status,
      coordinates: { latitude: c.lat, longitude: c.lng },
      protocol: c.protocol ?? undefined,
      username: c.username ?? undefined,
      port: c.port ?? undefined,
      path: c.path ?? undefined,
    }))

    setCameras(mapped)
    setIsLoadingCameras(false)
  }

  const refreshAuditLog = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch audit log:', error.message)
      return
    }

    const mapped: AuditLogEntry[] = (data ?? []).map((entry) => ({
      id: entry.id,
      timestamp: new Date(entry.timestamp),
      user: entry.user_name,
      ipAddress: entry.ip_address ?? null,
      action: entry.action,
      entityType: entry.entity_type ?? null,
      entityId: entry.entity_id ?? null,
    }))

    setAuditLog(mapped)
  }

  useEffect(() => {
    const init = async () => {
      await refreshCameras()
      await refreshAuditLog()
      refreshSystemHealth()
    }

    init()

    // Refresh cameras + health every 60 s; audit log every 30 s so new entries
    // are visible reasonably quickly without a manual page reload.
    const cameraInterval = setInterval(async () => {
      await refreshCameras()
      refreshSystemHealth()
    }, 60000)

    const auditInterval = setInterval(() => {
      refreshAuditLog()
    }, 30000)

    // Real-time subscription: refresh audit log whenever a row is inserted.
    const channel = supabase
      .channel('audit-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        refreshAuditLog()
      })
      .subscribe()

    return () => {
      clearInterval(cameraInterval)
      clearInterval(auditInterval)
      supabase.removeChannel(channel)
    }
  }, [])

  // Re-compute system health whenever cameras change
  useEffect(() => {
    if (cameras.length > 0) refreshSystemHealth()
  }, [cameras])

  return (
    <SystemContext.Provider
      value={{
        systemHealth,
        cameras,
        auditLog,
        refreshSystemHealth,
        refreshCameras,
        refreshAuditLog,
        isLoadingCameras,
      }}
    >
      {children}
    </SystemContext.Provider>
  )
}

export const useSystem = () => {
  const context = useContext(SystemContext)
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider')
  }
  return context
}
