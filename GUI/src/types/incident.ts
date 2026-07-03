export type IncidentSeverity = 'high' | 'moderate' | 'low'
export type IncidentStatus = 'new' | 'acknowledged' | 'on_scene' | 'scene_cleared' | 'closed'
export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface Photo {
  id: string
  uri: string
  timestamp: Date
  verified?: boolean
}

export interface ActionLogEntry {
  timestamp: Date
  user: string
  action: string
  ipAddress?: string
}

export interface DispatchedUnit {
  id: string
  name: string
  agency: string
  status: 'dispatched' | 'en_route' | 'on_scene' | 'cleared'
  dispatchedAt: Date
  onSceneAt?: Date
  clearedAt?: Date
}

export interface CollaborationMessage {
  id: string
  timestamp: Date
  user: string
  agency: string
  message: string
}

export interface Incident {
  id: string
  caseId: string
  location: string
  coordinates: { latitude: number; longitude: number }
  time: Date
  severity: IncidentSeverity
  status: IncidentStatus
  aiSummary: string
  llmHospital?: string
  llmPolice?: string
  llmNajm?: string
  estimatedInjuries?: number
  confidence: ConfidenceLevel
  photos: Photo[]
  actionLog: ActionLogEntry[]
  dispatchedUnits: DispatchedUnit[]
  collaborationLog: CollaborationMessage[]
  weather?: {
    condition: string
    temperature: number
    visibility: string
  }
  traffic?: string
}

