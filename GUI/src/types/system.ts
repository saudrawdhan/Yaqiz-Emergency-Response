export interface SystemHealth {
  aiEngine: { status: 'online' | 'offline'; lastCheck: Date }
  alertingService: { status: 'online' | 'offline'; lastCheck: Date }
  database: { status: 'healthy' | 'unhealthy'; lastCheck: Date }
  cameras: {
    online: number
    offline: number
    total: number
  }
  performance: {
    eventsPerMinute: number
    avgDetectionTime: number
    cpuLoad: number
    gpuLoad: number
  }
  recentErrors: Array<{
    timestamp: Date
    message: string
    severity: 'info' | 'warning' | 'error'
  }>
}

export interface AuditLogEntry {
  id: string
  timestamp: Date
  user: string
  ipAddress: string | null
  action: string
  entityType: string | null
  entityId: string | null
}

