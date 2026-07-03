import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Incident, IncidentStatus } from '../types/incident'
import {
  transitionIncident,
  assignIncident as orchestratorAssign,
  createIncident as orchestratorCreate,
  TransitionPayload,
  CreateIncidentPayload,
  OrchestratorError,
} from '../services/incidentOrchestrator'

interface IncidentContextType {
  incidents: Incident[]
  activeIncidents: Incident[]
  loading: boolean
  error: string | null
  getIncident: (id: string) => Incident | undefined
  acknowledgeIncident: (id: string, userId: string, userName: string) => Promise<void>
  updateIncidentStatus: (id: string, status: IncidentStatus, payload?: TransitionPayload) => Promise<void>
  assignIncident: (id: string, assigneeId: string, note?: string) => Promise<void>
  createIncident: (payload: CreateIncidentPayload) => Promise<void>
  addCollaborationMessage: (incidentId: string, user: string, agency: string, message: string) => Promise<void>
  refreshIncidents: () => Promise<void>
}

const IncidentContext = createContext<IncidentContextType | undefined>(undefined)

// Map flat Supabase rows into the nested Incident type
const mapRowToIncident = (row: Record<string, unknown>): Incident => ({
  id: row.id as string,
  caseId: row.case_id as string,
  location: row.location as string,
  coordinates: {
    latitude: (row.lat as number),
    longitude: (row.lng as number),
  },
  time: new Date(row.time as string),
  severity: row.severity as Incident['severity'],
  status: row.status as Incident['status'],
  aiSummary: row.ai_summary as string,
  llmHospital: row.llm_hospital as string | undefined,
  llmPolice: row.llm_police as string | undefined,
  llmNajm: row.llm_najm as string | undefined,
  estimatedInjuries: row.estimated_injuries as number | undefined,
  confidence: row.confidence as Incident['confidence'],
  weather: row.weather as Incident['weather'] | undefined,
  traffic: row.traffic as string | undefined,
  photos: ((row.incident_photos as Record<string, unknown>[]) ?? []).map((p) => ({
    id: p.id as string,
    uri: p.uri as string,
    timestamp: new Date(p.timestamp as string),
    verified: p.verified as boolean,
  })),
  actionLog: ((row.action_logs as Record<string, unknown>[]) ?? []).map((a) => ({
    timestamp: new Date(a.timestamp as string),
    user: a.user_name as string,
    action: a.action as string,
    ipAddress: a.ip_address as string | undefined,
  })),
  dispatchedUnits: ((row.dispatched_units as Record<string, unknown>[]) ?? []).map((u) => ({
    id: u.id as string,
    name: u.name as string,
    agency: u.agency as string,
    status: u.status as 'dispatched' | 'en_route' | 'on_scene' | 'cleared',
    dispatchedAt: new Date(u.dispatched_at as string),
    onSceneAt: u.on_scene_at ? new Date(u.on_scene_at as string) : undefined,
    clearedAt: u.cleared_at ? new Date(u.cleared_at as string) : undefined,
  })),
  collaborationLog: ((row.collaboration_messages as Record<string, unknown>[]) ?? []).map((m) => ({
    id: m.id as string,
    timestamp: new Date(m.timestamp as string),
    user: m.user_name as string,
    agency: m.agency as string,
    message: m.message as string,
  })),
})

const RETRY_DELAYS = [2000, 4000, 8000]
const FALLBACK_POLL_MS = 2 * 60 * 1000

export const IncidentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = async (): Promise<boolean> => {
    const { data, error: fetchError } = await supabase
      .from('incidents')
      .select(`
        *,
        incident_photos (*),
        action_logs (*),
        dispatched_units (*),
        collaboration_messages (*)
      `)
      .order('time', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch incidents:', fetchError.message)
      return false
    }

    setIncidents((data ?? []).map(mapRowToIncident))
    setError(null)
    return true
  }

  const refreshIncidents = async () => {
    setError(null)
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      const ok = await fetchOnce()
      if (ok) {
        setLoading(false)
        return
      }
      if (attempt < RETRY_DELAYS.length) {
        await new Promise(res => setTimeout(res, RETRY_DELAYS[attempt]))
      }
    }
    setError('Unable to load incidents. Check your connection and try again.')
    setLoading(false)
  }

  useEffect(() => {
    refreshIncidents()

    const channel = supabase
      .channel('incidents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchOnce())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_photos' }, () => fetchOnce())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_logs' }, () => fetchOnce())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatched_units' }, () => fetchOnce())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collaboration_messages' }, () => fetchOnce())
      .subscribe()

    // Fallback poll — catches missed realtime events or channel reconnections
    const fallback = setInterval(() => fetchOnce(), FALLBACK_POLL_MS)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(fallback)
    }
  }, [])

  const activeIncidents = incidents.filter(
    (incident) => incident.status !== 'closed' && incident.status !== 'scene_cleared'
  )

  const getIncident = (id: string) => incidents.find((inc) => inc.id === id)

  // All state-changing actions are routed through the Emergency Event
  // Orchestrator RPC. Direct table writes against `incidents` are blocked
  // by RLS for non-admins — see migrations/20260510000000_emergency_event_orchestrator.sql.
  const acknowledgeIncident = async (id: string, _userId: string, _userName: string) => {
    try {
      await transitionIncident(id, 'acknowledged')
      await refreshIncidents()
    } catch (e) {
      const err = e instanceof OrchestratorError ? e : new Error(String(e))
      console.error('Failed to acknowledge incident:', err.message)
      throw err
    }
  }

  const updateIncidentStatus = async (
    id: string,
    status: IncidentStatus,
    payload: TransitionPayload = {},
  ) => {
    try {
      await transitionIncident(id, status, payload)
      await refreshIncidents()
    } catch (e) {
      const err = e instanceof OrchestratorError ? e : new Error(String(e))
      console.error('Failed to transition incident:', err.message)
      throw err
    }
  }

  const assignIncident = async (id: string, assigneeId: string, note?: string) => {
    try {
      await orchestratorAssign(id, assigneeId, note)
      await refreshIncidents()
    } catch (e) {
      const err = e instanceof OrchestratorError ? e : new Error(String(e))
      console.error('Failed to assign incident:', err.message)
      throw err
    }
  }

  const createIncident = async (payload: CreateIncidentPayload) => {
    try {
      await orchestratorCreate(payload)
      await refreshIncidents()
    } catch (e) {
      const err = e instanceof OrchestratorError ? e : new Error(String(e))
      console.error('Failed to create incident:', err.message)
      throw err
    }
  }

  const addCollaborationMessage = async (
    incidentId: string,
    user: string,
    agency: string,
    message: string
  ) => {
    const { error } = await supabase.from('collaboration_messages').insert({
      incident_id: incidentId,
      timestamp: new Date().toISOString(),
      user_name: user,
      agency,
      message,
    })

    if (error) {
      console.error('Failed to send collaboration message:', error.message)
      return
    }

    await refreshIncidents()
  }

  return (
    <IncidentContext.Provider
      value={{
        incidents,
        activeIncidents,
        loading,
        error,
        getIncident,
        acknowledgeIncident,
        updateIncidentStatus,
        assignIncident,
        createIncident,
        addCollaborationMessage,
        refreshIncidents,
      }}
    >
      {children}
    </IncidentContext.Provider>
  )
}

export const useIncidents = () => {
  const context = useContext(IncidentContext)
  if (context === undefined) {
    throw new Error('useIncidents must be used within an IncidentProvider')
  }
  return context
}
