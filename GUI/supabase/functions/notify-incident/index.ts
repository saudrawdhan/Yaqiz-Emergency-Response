// notify-incident Edge Function
//
// Central notification dispatcher for the Emergency Response Platform.
// Called asynchronously via pg_net from fire_notification() in Postgres,
// and directly from dispatch-units Edge Function for units.none_available.
//
// Security: verify_jwt is disabled. Requests are authenticated via the
// x-notify-secret header, which must match the NOTIFY_SECRET environment
// variable (same value stored in Supabase Vault as 'notify_secret').
//
// Flow:
//   1. Validate x-notify-secret header.
//   2. Fetch the notification_events row by event_id (service role).
//   3. Idempotency check: skip if already sent.
//   4. Format a Telegram MarkdownV2 message from the event type + payload.
//   5. Route to main group or admin group based on event type.
//   6. Send via Telegram Bot API.
//   7. Update notification_events.status (sent / failed).
//
// Secrets required:
//   NOTIFY_SECRET            – shared secret with the fire_notification SQL function
//   TELEGRAM_BOT_TOKEN       – from @BotFather
//   TELEGRAM_CHAT_ID         – main operations group (all standard events)
//   TELEGRAM_CHAT_ID_ADMIN   – admin / supervisor group (escalations + no-units alerts)
//                              Falls back to TELEGRAM_CHAT_ID if not set.
//
// Auto-provided by Supabase runtime:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  (used here to bypass RLS on notification_events)

import { createClient } from 'jsr:@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
//  MarkdownV2 escaping
// ---------------------------------------------------------------------------
const esc = (t: unknown): string =>
  String(t ?? '').replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`)

const severityIcon = (s: string): string =>
  s === 'high' ? '🔴' : s === 'moderate' ? '🟠' : s === 'low' ? '🟡' : '⚪'

const statusLabel = (s: string): string =>
  ({ new: 'Detected', acknowledged: 'Verified', on_scene: 'On Scene',
     scene_cleared: 'Scene Cleared', closed: 'Closed' }[s] ?? s)

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------
interface IncidentSnap {
  id: string
  case_id: string
  location: string
  severity: string
  status: string
  lat: number | null
  lng: number | null
  time: string
  ai_summary: string | null
}

interface EventPayload {
  event_type: string
  dedup_key: string
  incident: IncidentSnap
  actor_name?: string
  actor_role?: string
  assignee_name?: string
  note?: string
  from_status?: string
  stale_status?: string
  threshold_mins?: number
  stale_since?: string
  skipped_agencies?: string[]
}

interface NotificationEvent {
  id: string
  incident_id: string
  event_type: string
  severity: string | null
  payload: EventPayload
  status: string
  created_at: string
}

// ---------------------------------------------------------------------------
//  Message templates (MarkdownV2)
// ---------------------------------------------------------------------------
function formatMessage(event: NotificationEvent): string {
  const p = event.payload
  const inc = p.incident
  const icon = severityIcon(inc.severity)

  const mapLink =
    inc.lat != null && inc.lng != null
      ? `\n\n[📍 View on Maps](https://www.google.com/maps?q=${inc.lat},${inc.lng})`
      : ''

  const aiBlock =
    inc.ai_summary
      ? `\n\n_${esc(inc.ai_summary.slice(0, 220))}${inc.ai_summary.length > 220 ? '\\.\\.\\.' : ''}_`
      : ''

  const noteBlock = p.note ? `\n*Note:* ${esc(p.note)}` : ''

  const caseHeader =
    `*Case:* \`${esc(inc.case_id)}\`\n` +
    `*Severity:* ${esc(inc.severity.toUpperCase())}\n` +
    `*Location:* ${esc(inc.location)}`

  switch (event.event_type) {
    case 'incident.created':
      return (
        `🚨 *New Incident Detected*\n` +
        caseHeader + `\n` +
        `*Time:* ${esc(new Date(inc.time).toISOString())}` +
        aiBlock + mapLink
      )

    case 'incident.verified':
      return (
        `✅ *Incident Verified*\n` +
        caseHeader + `\n` +
        `*Verified by:* ${esc(p.actor_name ?? 'Unknown')}` +
        noteBlock + mapLink
      )

    case 'incident.on_scene':
      return (
        `🚑 *Responder On Scene*\n` +
        caseHeader + `\n` +
        `*Assigned to:* ${esc(p.assignee_name || p.actor_name || 'Unknown')}` +
        noteBlock + mapLink
      )

    case 'incident.assigned':
      return (
        `👤 *Incident Reassigned*\n` +
        caseHeader + `\n` +
        `*Assigned to:* ${esc(p.assignee_name ?? 'Unknown')}\n` +
        `*By:* ${esc(p.actor_name ?? 'Unknown')}` +
        noteBlock + mapLink
      )

    case 'incident.scene_cleared':
      return (
        `🏁 *Scene Cleared*\n` +
        caseHeader + `\n` +
        `*Cleared by:* ${esc(p.actor_name ?? 'Unknown')}` +
        noteBlock + mapLink
      )

    case 'incident.closed':
      return (
        `🔒 *Incident Closed*\n` +
        caseHeader + `\n` +
        `*Closed by:* ${esc(p.actor_name ?? 'Unknown')}` +
        noteBlock
        // No map link for closed incidents — they're done.
      )

    case 'incident.escalated': {
      const staleSince = p.stale_since ?? inc.time
      const staleMins = Math.floor(
        (Date.now() - new Date(staleSince).getTime()) / 60_000,
      )
      const threshold = p.threshold_mins ?? '?'
      return (
        `⚠️ *ESCALATION ALERT*\n` +
        caseHeader + `\n` +
        `*Stuck in:* ${esc(statusLabel(p.stale_status ?? inc.status))}\n` +
        `*For:* ${staleMins} min \\(SLA: ${esc(String(threshold))} min\\)\n` +
        `⚡ *Immediate action required*` +
        mapLink
      )
    }

    case 'units.none_available': {
      const agencies = (p.skipped_agencies ?? []).map(esc).join(', ') || 'Unknown'
      return (
        `🚫 *No Units Available — Manual Dispatch Required*\n` +
        caseHeader + `\n` +
        `*No units for:* ${agencies}\n` +
        `⚡ Assign units manually` +
        mapLink
      )
    }

    default:
      return (
        `ℹ️ *Incident Update* \\(${esc(event.event_type)}\\)\n` +
        caseHeader + `\n` +
        `*Status:* ${esc(statusLabel(inc.status))}`
      )
  }
}

// ---------------------------------------------------------------------------
//  Chat ID routing
//  Single-group fallback: if TELEGRAM_CHAT_ID_ADMIN is not configured,
//  all events go to the main group. The routing abstraction is in place
//  so adding a second group later only requires setting the secret.
// ---------------------------------------------------------------------------
function routeChatId(eventType: string): string {
  const main  = Deno.env.get('TELEGRAM_CHAT_ID') ?? ''
  const admin = Deno.env.get('TELEGRAM_CHAT_ID_ADMIN') ?? main   // fallback to main

  switch (eventType) {
    case 'incident.escalated':
    case 'units.none_available':
      return admin  // only supervisor/admin needs these
    default:
      return main   // all standard lifecycle events → ops group
  }
}

// ---------------------------------------------------------------------------
//  Telegram sender
// ---------------------------------------------------------------------------
async function sendTelegram(
  chatId: string,
  text: string,
): Promise<{ ok: boolean; detail: string }> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!token) return { ok: false, detail: 'TELEGRAM_BOT_TOKEN not configured' }
  if (!chatId) return { ok: false, detail: 'TELEGRAM_CHAT_ID not configured' }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: false,
        }),
      },
    )
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.ok) {
      return {
        ok: false,
        detail: `HTTP ${res.status}: ${body.description ?? 'unknown Telegram error'}`,
      }
    }
    return { ok: true, detail: `message_id=${body.result?.message_id ?? 'n/a'}` }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

// ---------------------------------------------------------------------------
//  Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (req.method !== 'POST') {
    return new Response('POST required', { status: 405 })
  }

  // Authenticate via shared secret (not user JWT — this is a system call).
  const notifySecret = Deno.env.get('NOTIFY_SECRET')
  const incoming     = req.headers.get('x-notify-secret')
  if (!notifySecret || incoming !== notifySecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: { event_id?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const eventId = body.event_id
  if (!eventId) {
    return new Response(
      JSON.stringify({ error: 'event_id is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Service-role client: bypasses RLS so we can read/update notification_events.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Fetch the event.
  const { data: event, error: fetchErr } = await supabase
    .from('notification_events')
    .select('*')
    .eq('id', eventId)
    .single<NotificationEvent>()

  if (fetchErr || !event) {
    console.error('[notify-incident] event not found:', eventId, fetchErr?.message)
    return new Response(
      JSON.stringify({ error: 'event not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Idempotency: pg_net may retry on transient failures — skip if already sent.
  if (event.status === 'sent') {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: 'already sent' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Format + route + send.
  const message = formatMessage(event)
  const chatId  = routeChatId(event.event_type)
  const result  = await sendTelegram(chatId, message)

  // Persist delivery result.
  const { error: updateErr } = await supabase
    .from('notification_events')
    .update({
      status:        result.ok ? 'sent' : 'failed',
      error_message: result.ok ? null : result.detail,
      sent_at:       result.ok ? new Date().toISOString() : null,
    })
    .eq('id', eventId)

  if (updateErr) {
    console.error('[notify-incident] failed to update event status:', updateErr.message)
  }

  console.log(
    `[notify-incident] ${event.event_type} | ${result.ok ? '✓ sent' : '✗ failed'}: ${result.detail}`,
  )

  return new Response(
    JSON.stringify({
      ok:         true,
      event_type: event.event_type,
      telegram:   result,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
