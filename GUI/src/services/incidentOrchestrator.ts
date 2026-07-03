// Emergency Event Orchestrator — frontend service layer.
//
// This module is the SINGLE entry point through which the UI mutates an
// incident's lifecycle. Direct table writes from the UI are forbidden by RLS
// (see migrations/20260510000000_emergency_event_orchestrator.sql); all
// transitions go through the SECURITY DEFINER RPCs defined there.
//
//   Detected      = status 'new'
//   Verified      = status 'acknowledged'
//   Assigned/active = status 'on_scene' (with assigned_to_user_id set)
//   Resolved      = status 'scene_cleared'
//   Closed        = status 'closed' (terminal)

import { supabase } from './supabase'
import { Incident, IncidentStatus } from '../types/incident'
import { User } from '../types/user'

// The RPC returns the flat incident row from Postgres (snake_case columns,
// no joined photos/logs/units). Callers in this codebase typically discard
// the result and re-fetch via IncidentContext.refreshIncidents() so they
// pick up the joined relations. Surface this as a structural type — not as
// the nested `Incident` — to avoid lying about what the RPC actually returns.
export interface RawIncidentRow {
  id: string
  case_id: string
  status: IncidentStatus
  assigned_to_user_id: string | null
  // additional columns omitted; consumers should refetch for full data.
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
//  Workflow actions
// ---------------------------------------------------------------------------

export type WorkflowActionId =
  | 'verify'
  | 'assign'
  | 'mark_on_scene'
  | 'resolve'
  | 'close'
  | 'abort'

export interface WorkflowAction {
  id: WorkflowActionId
  label: string
  targetStatus: IncidentStatus
  description: string
  requiresAssignee?: boolean
  destructive?: boolean
  adminOnly?: boolean
}

const ACTIONS: Record<WorkflowActionId, WorkflowAction> = {
  verify: {
    id: 'verify',
    label: 'Verify Incident',
    targetStatus: 'acknowledged',
    description: 'Confirm this is a real incident and acknowledge the alert.',
  },
  assign: {
    id: 'assign',
    label: 'Assign Responder',
    targetStatus: 'on_scene',
    description: 'Assign a responder and move the incident into active handling.',
    requiresAssignee: true,
  },
  mark_on_scene: {
    id: 'mark_on_scene',
    label: 'Mark On Scene',
    targetStatus: 'on_scene',
    description: 'Confirm a responder has arrived on scene.',
  },
  resolve: {
    id: 'resolve',
    label: 'Resolve (Scene Cleared)',
    targetStatus: 'scene_cleared',
    description: 'The scene is cleared and the operational response is over.',
  },
  close: {
    id: 'close',
    label: 'Close Incident',
    targetStatus: 'closed',
    description: 'Move the incident to its terminal closed state.',
  },
  abort: {
    id: 'abort',
    label: 'Abort (False Positive)',
    targetStatus: 'closed',
    description: 'Admin-only: dismiss the incident as a false positive.',
    destructive: true,
    adminOnly: true,
  },
}

// ---------------------------------------------------------------------------
//  Transition table — must mirror the SQL RPC's source-of-truth rules.
//  The SQL is authoritative; this is for UI gating only.
// ---------------------------------------------------------------------------

const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  new: ['acknowledged'],
  acknowledged: ['on_scene'],
  on_scene: ['scene_cleared'],
  scene_cleared: ['closed'],
  closed: [],
}

export const isValidTransition = (
  from: IncidentStatus,
  to: IncidentStatus,
): boolean => TRANSITIONS[from]?.includes(to) ?? false

// ---------------------------------------------------------------------------
//  Action gating: which buttons should the UI show right now?
// ---------------------------------------------------------------------------

/** Returns the workflow actions that are valid for the given incident + user. */
export const getValidActions = (
  incident: Incident,
  user: User | null,
): WorkflowAction[] => {
  if (!user) return []

  const isAdmin = user.role === 'admin'
  const actions: WorkflowAction[] = []

  // Note on assignee gating: the Incident type does not currently surface
  // assigned_to_user_id, so the UI shows the resolve action optimistically
  // for all responders viewing an on_scene incident. The server-side RPC
  // re-validates and rejects the call if the caller is not the assignee
  // (and not an admin), surfacing OrchestratorError('FORBIDDEN').
  switch (incident.status) {
    case 'new':
      actions.push(ACTIONS.verify)
      break
    case 'acknowledged':
      actions.push(ACTIONS.assign)
      break
    case 'on_scene':
      actions.push(ACTIONS.resolve)
      break
    case 'scene_cleared':
      actions.push(ACTIONS.close)
      break
    case 'closed':
      // terminal — no actions
      break
  }

  // Admin escape hatch: abort a false-positive at any non-terminal stage.
  if (isAdmin && incident.status !== 'closed') {
    actions.push(ACTIONS.abort)
  }

  return actions
}

// ---------------------------------------------------------------------------
//  RPC call wrappers
// ---------------------------------------------------------------------------

export interface TransitionPayload {
  assigneeId?: string
  note?: string
  message?: string
  dispatch?: { name: string; agency: string }
}

export class OrchestratorError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'OrchestratorError'
    this.code = code
  }
}

/**
 * Parses the structured `ORCHESTRATOR_<CODE>: <message>` exception we raise
 * from the SQL function so the UI can show a useful error.
 */
const parseRpcError = (raw: { message?: string } | null | undefined): OrchestratorError => {
  const text = raw?.message ?? 'Unknown orchestrator error'
  const match = text.match(/ORCHESTRATOR_([A-Z_]+):\s*(.*)$/)
  if (match) return new OrchestratorError(match[1], match[2])
  return new OrchestratorError('UNKNOWN', text)
}

/**
 * Drives the incident through the next lifecycle step.
 *
 *   await transitionIncident(id, 'acknowledged')          // verify
 *   await transitionIncident(id, 'on_scene', { assigneeId, note })
 *   await transitionIncident(id, 'scene_cleared')
 *   await transitionIncident(id, 'closed')
 *
 * The server validates the transition, role, and assignee. Errors are
 * thrown as OrchestratorError with a stable .code for the UI to branch on.
 */
export const transitionIncident = async (
  incidentId: string,
  targetStatus: IncidentStatus,
  payload: TransitionPayload = {},
): Promise<RawIncidentRow> => {
  const rpcPayload: Record<string, unknown> = {}
  if (payload.assigneeId) rpcPayload.assignee_id = payload.assigneeId
  if (payload.note) rpcPayload.note = payload.note
  if (payload.message) rpcPayload.message = payload.message
  if (payload.dispatch) rpcPayload.dispatch = payload.dispatch

  const { data, error } = await supabase.rpc('transition_incident_status', {
    p_incident_id: incidentId,
    p_target_status: targetStatus,
    p_payload: rpcPayload,
  })

  if (error) throw parseRpcError(error)
  return data as RawIncidentRow
}

/**
 * Reassign an active incident without changing its status.
 * Allowed while status is new/acknowledged/on_scene.
 */
export const assignIncident = async (
  incidentId: string,
  assigneeId: string,
  note?: string,
): Promise<RawIncidentRow> => {
  const { data, error } = await supabase.rpc('assign_incident', {
    p_incident_id: incidentId,
    p_assignee_id: assigneeId,
    p_note: note ?? null,
  })

  if (error) throw parseRpcError(error)
  return data as RawIncidentRow
}

// ---------------------------------------------------------------------------
//  Convenience wrappers — these are what the UI normally calls. They map a
//  user-friendly action onto a target status and forward the right payload.
// ---------------------------------------------------------------------------

export const verifyIncident = (incidentId: string, note?: string) =>
  transitionIncident(incidentId, 'acknowledged', { note })

export const dispatchToScene = (
  incidentId: string,
  opts: { assigneeId: string; note?: string; dispatch?: { name: string; agency: string } },
) => transitionIncident(incidentId, 'on_scene', opts)

export const resolveIncident = (incidentId: string, note?: string) =>
  transitionIncident(incidentId, 'scene_cleared', { note })

export const closeIncident = (incidentId: string, note?: string) =>
  transitionIncident(incidentId, 'closed', { note })

/** Admin-only: abort a false-positive from any non-terminal state. */
export const abortIncident = (incidentId: string, note: string) =>
  transitionIncident(incidentId, 'closed', { note })

// ---------------------------------------------------------------------------
//  Manual incident creation
// ---------------------------------------------------------------------------

export interface CreateIncidentPayload {
  location: string
  lat: number
  lng: number
  /** ISO-8601 timestamp string */
  time: string
  severity: import('../types/incident').IncidentSeverity
  aiSummary: string
  confidence: import('../types/incident').ConfidenceLevel
  estimatedInjuries?: number
  weather?: { condition: string; temperature: number; visibility: string }
  traffic?: string
  cameraId?: string
  llmHospital?: string
  llmPolice?: string
  llmNajm?: string
}

/**
 * Creates a new incident via the create_incident SECURITY DEFINER RPC.
 * Available to both admin and responder roles.
 * Auto-generates id / case_id server-side; status is always initialised to 'new'.
 * The on_incident_inserted trigger fires the incident.created Telegram notification.
 */
export const createIncident = async (
  payload: CreateIncidentPayload,
): Promise<RawIncidentRow> => {
  const { data, error } = await supabase.rpc('create_incident', {
    p_location:            payload.location,
    p_lat:                 payload.lat,
    p_lng:                 payload.lng,
    p_time:                payload.time,
    p_severity:            payload.severity,
    p_ai_summary:          payload.aiSummary,
    p_confidence:          payload.confidence,
    p_estimated_injuries:  payload.estimatedInjuries ?? null,
    p_weather:             payload.weather ?? null,
    p_traffic:             payload.traffic ?? null,
    p_camera_id:           payload.cameraId ?? null,
    p_llm_hospital:        payload.llmHospital ?? null,
    p_llm_police:          payload.llmPolice ?? null,
    p_llm_najm:            payload.llmNajm ?? null,
  })

  if (error) throw parseRpcError(error)
  return data as RawIncidentRow
}

// ---------------------------------------------------------------------------
//  Assignment engine + Telegram notifier
// ---------------------------------------------------------------------------

export interface DispatchedUnitResult {
  agency_type: string
  unit_id: string
  dispatched_id: string
  unit_name: string
  agency_name: string
  distance_km: number
  dispatched_at: string
}

export interface SkippedAgencyResult {
  agency_type: string
  reason: 'already_dispatched' | 'no_active_units' | string
}

export interface DispatchUnitsResponse {
  ok: true
  dispatched: DispatchedUnitResult[]
  skipped: SkippedAgencyResult[]
  count: number
  notification: { channel: string; ok: boolean; detail: string }
}

/**
 * Calls the `dispatch-units` Edge Function: assignment engine picks the
 * nearest active unit per agency type, persists dispatched_units rows,
 * and sends a Telegram notification. Telegram failures do NOT undo the
 * assignment — they are surfaced in the response so the UI can warn.
 */
export const dispatchNearestUnits = async (
  incidentId: string,
  agencyTypes?: string[],
): Promise<DispatchUnitsResponse> => {
  const { data, error } = await supabase.functions.invoke<DispatchUnitsResponse>(
    'dispatch-units',
    {
      body: {
        incident_id: incidentId,
        ...(agencyTypes ? { agency_types: agencyTypes } : {}),
      },
    },
  )

  if (error) {
    throw new OrchestratorError(
      'DISPATCH_FAILED',
      error.message || 'Edge function invocation failed',
    )
  }

  if (!data?.ok) {
    throw new OrchestratorError(
      'DISPATCH_FAILED',
      'Edge function returned no data',
    )
  }

  return data
}
