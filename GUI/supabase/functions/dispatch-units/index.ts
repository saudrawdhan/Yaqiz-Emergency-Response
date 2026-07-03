// Emergency Event Orchestrator — Assignment Engine + Telegram notifier.
//
// Flow:
//   1. Receive { incident_id, agency_types? } from the authenticated client.
//   2. Call public.dispatch_nearest_units RPC (runs as the user) which selects
//      nearest active units per agency, inserts dispatched_units rows, and
//      writes action_logs + audit_logs.
//   3. If at least one unit was dispatched, send a Telegram message via the
//      Bot API.
//   4. Log the notification result (success or failure) via
//      public.log_notification_result. Telegram failures NEVER undo the
//      assignment — they are recorded and surfaced in the response.
//
// Secrets required (set in Supabase Studio → Project Settings → Edge Functions):
//   TELEGRAM_BOT_TOKEN  — from @BotFather
//   TELEGRAM_CHAT_ID    — group/channel id, e.g. -1001234567890
//
// Auto-provided by the Supabase runtime:
//   SUPABASE_URL
//   SUPABASE_ANON_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DispatchedUnit {
  agency_type: string
  unit_id: string
  dispatched_id: string
  unit_name: string
  agency_name: string
  distance_km: number
  dispatched_at: string
}

interface SkippedAgency {
  agency_type: string
  reason: 'already_dispatched' | 'no_active_units' | string
}

interface DispatchResult {
  incident: {
    id: string
    case_id: string
    location: string
    severity: string
    status: string
    lat: number
    lng: number
    time: string
    ai_summary: string
  }
  dispatched: DispatchedUnit[]
  skipped: SkippedAgency[]
  count: number
}

// MarkdownV2 reserved characters that must be escaped.
const escapeMd = (text: string): string =>
  text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`)

const severityIcon = (s: string): string => {
  switch (s) {
    case 'high': return '🔴'
    case 'moderate': return '🟠'
    case 'low': return '🟡'
    default: return '⚪'
  }
}

const formatTelegramMessage = (result: DispatchResult): string => {
  const inc = result.incident
  const head = `${severityIcon(inc.severity)} *Incident dispatched*`
  const meta = [
    `*Case ID:* \`${escapeMd(inc.case_id)}\``,
    `*Severity:* ${escapeMd(inc.severity.toUpperCase())}`,
    `*Status:* ${escapeMd(inc.status.replace('_', ' '))}`,
    `*Location:* ${escapeMd(inc.location)}`,
    `*Coords:* \`${inc.lat.toFixed(5)}, ${inc.lng.toFixed(5)}\``,
    `*Time:* ${escapeMd(new Date(inc.time).toISOString())}`,
  ].join('\n')

  const summary = inc.ai_summary
    ? `\n\n_Summary_\n${escapeMd(inc.ai_summary.slice(0, 240))}${inc.ai_summary.length > 240 ? '\\.\\.\\.' : ''}`
    : ''

  const dispatchLines = result.dispatched.length
    ? result.dispatched
        .map((u) =>
          `• *${escapeMd(u.agency_type)}*: ${escapeMd(u.unit_name)} ` +
          `\\(${escapeMd(u.agency_name)}, ${escapeMd(u.distance_km.toString())} km\\)`,
        )
        .join('\n')
    : '_No units dispatched_'

  const skippedLines = result.skipped.length
    ? '\n\n_Skipped:_ ' +
      result.skipped
        .map((s) => `${escapeMd(s.agency_type)} \\(${escapeMd(s.reason)}\\)`)
        .join(', ')
    : ''

  const mapLink = `[Open in maps](https://www.google.com/maps?q=${inc.lat},${inc.lng})`

  return `${head}\n\n${meta}${summary}\n\n*Dispatched units:*\n${dispatchLines}${skippedLines}\n\n${mapLink}`
}

async function sendTelegram(text: string): Promise<{ ok: boolean; detail: string }> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

  if (!token) return { ok: false, detail: 'TELEGRAM_BOT_TOKEN not configured' }
  if (!chatId) return { ok: false, detail: 'TELEGRAM_CHAT_ID not configured' }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.ok) {
      return {
        ok: false,
        detail: `HTTP ${res.status}: ${body.description ?? 'unknown error'}`,
      }
    }
    return { ok: true, detail: `message_id=${body.result?.message_id ?? 'n/a'}` }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured: SUPABASE_URL/ANON_KEY missing' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  let payload: { incident_id?: string; agency_types?: string[] }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const incidentId = payload.incident_id?.trim()
  if (!incidentId) {
    return new Response(JSON.stringify({ error: 'incident_id is required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'dispatch_nearest_units',
    {
      p_incident_id: incidentId,
      p_agency_types: payload.agency_types ?? ['Hospital', 'Police', 'Najm'],
    },
  )

  if (rpcError) {
    return new Response(
      JSON.stringify({ error: rpcError.message, code: 'DISPATCH_FAILED' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  const result = rpcData as DispatchResult

  let telegram: { ok: boolean; detail: string } = { ok: true, detail: 'skipped' }
  if (result.count > 0) {
    const message = formatTelegramMessage(result)
    telegram = await sendTelegram(message)

    const { error: logError } = await supabase.rpc('log_notification_result', {
      p_incident_id: incidentId,
      p_channel: 'Telegram',
      p_success: telegram.ok,
      p_detail: telegram.detail,
    })
    if (logError) {
      console.error('[dispatch-units] log_notification_result failed:', logError.message)
    }
  }

  // Exception alert: every agency was skipped due to no active units.
  // Routes to the admin/supervisor group via notify-incident so supervisors
  // know manual dispatch is required. This fires at most once per UTC hour
  // per incident (dedup enforced in fire_notification via hour-bucket suffix).
  const noUnitsAgencies = result.skipped
    .filter((s) => s.reason === 'no_active_units')
    .map((s) => s.agency_type)

  if (noUnitsAgencies.length > 0 && result.count === 0) {
    const hourBucket = new Date().toISOString().slice(0, 13).replace('T', '-')
    const { error: notifyErr } = await supabase.rpc('fire_notification', {
      p_incident_id:  incidentId,
      p_event_type:   'units.none_available',
      p_extra:        { skipped_agencies: noUnitsAgencies },
      p_dedup_suffix: hourBucket,
    })
    if (notifyErr) {
      console.error('[dispatch-units] fire_notification(none_available) failed:', notifyErr.message)
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dispatched: result.dispatched,
      skipped: result.skipped,
      count: result.count,
      notification: { channel: 'Telegram', ...telegram },
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  )
})
