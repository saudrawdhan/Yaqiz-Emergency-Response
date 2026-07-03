-- ============================================================================
--  Notification System
-- ----------------------------------------------------------------------------
--  Extends the orchestrator with selective, role-aware, dedup-safe notifications
--  at meaningful workflow moments — not on every row change.
--
--  Architecture:
--    fire_notification()  →  notification_events (pending)
--                         →  pg_net async HTTP  →  notify-incident Edge Function
--                                                →  Telegram  →  update status
--
--  Events fired:
--    incident.created      DB trigger on incidents INSERT
--    incident.verified     new → acknowledged  (transition_incident_status)
--    incident.on_scene     acknowledged → on_scene
--    incident.assigned     assign_incident() — reassignment without status change
--    incident.scene_cleared on_scene → scene_cleared
--    incident.closed       scene_cleared → closed
--    units.none_available  dispatch-units Edge Function (no active units found)
--    incident.escalated    cron/5min — SLA thresholds: new>5m, ack>15m, on_scene>60m
--
--  NOT re-implemented here (already handled by dispatch-units Edge Function):
--    units.dispatched  — keeps existing direct Telegram send; no duplicate added.
--
--  Secrets needed BEFORE this works:
--    1. Supabase Vault:       select vault.create_secret('your-secret','notify_secret','');
--    2. Edge Function secret: NOTIFY_SECRET = same value as vault
--    3. Edge Function secret: TELEGRAM_BOT_TOKEN
--    4. Edge Function secret: TELEGRAM_CHAT_ID       (main ops group)
--    5. Edge Function secret: TELEGRAM_CHAT_ID_ADMIN (escalations / no-units alerts)
-- ============================================================================

-- pg_net is pre-installed on all Supabase projects (extensions schema).
-- pg_cron requires enabling via Studio > Database > Extensions (Pro+ plans).

-- ----------------------------------------------------------------------------
--  notification_events: dedup anchor + delivery audit trail
-- ----------------------------------------------------------------------------
create table if not exists public.notification_events (
  id            uuid        primary key default gen_random_uuid(),
  incident_id   text        references public.incidents(id) on delete cascade,
  event_type    text        not null,
  severity      text,
  payload       jsonb       not null default '{}',
  status        text        not null default 'pending'
                            check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  dedup_key     text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- Partial unique index: only one active (pending or sent) record per dedup_key.
-- Failed events don't block retries with the same key.
create unique index if not exists notification_events_active_dedup_idx
  on public.notification_events(dedup_key)
  where dedup_key is not null and status in ('pending', 'sent');

create index if not exists notification_events_incident_idx
  on public.notification_events(incident_id, created_at desc);

create index if not exists notification_events_pending_idx
  on public.notification_events(created_at)
  where status = 'pending';

alter table public.notification_events enable row level security;

drop policy if exists notif_events_admin_select on public.notification_events;
create policy notif_events_admin_select on public.notification_events
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
--  fire_notification(incident_id, event_type, extra?, dedup_suffix?)
--
--  Queues a notification event and dispatches it asynchronously via pg_net.
--  Returns the event UUID, or NULL if suppressed as a duplicate.
--  Non-blocking: the HTTP call is enqueued by pg_net and does not delay the
--  caller's transaction.
-- ----------------------------------------------------------------------------
create or replace function public.fire_notification(
  p_incident_id  text,
  p_event_type   text,
  p_extra        jsonb    default '{}'::jsonb,
  p_dedup_suffix text     default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dedup_key     text;
  v_event_id      uuid;
  v_incident      public.incidents%rowtype;
  v_notify_secret text;
  v_notify_url    constant text :=
    'https://wtheslxthulgwlsyktxz.supabase.co/functions/v1/notify-incident';
begin
  -- 1. Build deterministic dedup key.
  v_dedup_key := p_incident_id || ':' || p_event_type;
  if p_dedup_suffix is not null then
    v_dedup_key := v_dedup_key || ':' || p_dedup_suffix;
  end if;

  -- 2. Idempotency gate: suppress if already pending or sent.
  if exists (
    select 1 from public.notification_events
    where dedup_key = v_dedup_key
      and status in ('pending', 'sent')
  ) then
    return null;  -- suppressed duplicate; caller is not informed
  end if;

  -- 3. Enrich payload with a fresh snapshot of the incident.
  select * into v_incident from public.incidents where id = p_incident_id;
  if not found then return null; end if;

  -- 4. Insert event record as pending.
  insert into public.notification_events(
    incident_id, event_type, severity, payload, dedup_key, status
  ) values (
    p_incident_id,
    p_event_type,
    v_incident.severity,
    jsonb_build_object(
      'event_type', p_event_type,
      'dedup_key',  v_dedup_key,
      'incident', jsonb_build_object(
        'id',         v_incident.id,
        'case_id',    v_incident.case_id,
        'location',   v_incident.location,
        'severity',   v_incident.severity,
        'status',     v_incident.status,
        'lat',        v_incident.lat,
        'lng',        v_incident.lng,
        'time',       v_incident.time,
        'ai_summary', v_incident.ai_summary
      )
    ) || coalesce(p_extra, '{}'),
    v_dedup_key,
    'pending'
  )
  returning id into v_event_id;

  -- 5. Retrieve notify secret from Vault (pre-installed on all Supabase projects).
  begin
    select decrypted_secret into v_notify_secret
    from vault.decrypted_secrets
    where name = 'notify_secret'
    limit 1;
  exception when others then
    v_notify_secret := null;
  end;

  if v_notify_secret is null then
    -- Secret not configured — mark failed so it's visible in the audit table.
    update public.notification_events
       set status        = 'failed',
           error_message = 'notify_secret not found in vault — see setup instructions'
     where id = v_event_id;
    return v_event_id;
  end if;

  -- 6. Async HTTP call via pg_net. Returns immediately; does not block transaction.
  perform net.http_post(
    url     := v_notify_url,
    body    := jsonb_build_object('event_id', v_event_id),
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-notify-secret', v_notify_secret
    )
  );

  return v_event_id;
end;
$$;

revoke all on function public.fire_notification(text, text, jsonb, text) from public;
grant execute on function public.fire_notification(text, text, jsonb, text) to authenticated;

-- ----------------------------------------------------------------------------
--  Trigger: incident.created — fires when the AI pipeline / admin inserts a row
-- ----------------------------------------------------------------------------
create or replace function public.on_incident_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.fire_notification(
    NEW.id,
    'incident.created',
    '{}'::jsonb
    -- no suffix: one notification per incident, ever
  );
  return NEW;
end;
$$;

drop trigger if exists incident_created_notify on public.incidents;
create trigger incident_created_notify
  after insert on public.incidents
  for each row
  execute function public.on_incident_inserted();

-- ----------------------------------------------------------------------------
--  Updated transition_incident_status — step 11 fires lifecycle notifications
-- ----------------------------------------------------------------------------
create or replace function public.transition_incident_status(
  p_incident_id   text,
  p_target_status text,
  p_payload       jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id      uuid;
  v_actor_name    text;
  v_actor_role    text;
  v_actor_agency  text;
  v_incident      public.incidents%rowtype;
  v_current       text;
  v_allowed       boolean := false;
  v_assignee_id   uuid;
  v_assignee_name text;
  v_note          text;
  v_dispatch      jsonb;
  v_message       text;
  v_action_text   text;
  v_now           timestamptz := now();
  v_event_type    text;
begin
  -- 1. Identify the caller.
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'ORCHESTRATOR_UNAUTHENTICATED: no auth.uid() in session';
  end if;

  select name, role, agency
    into v_actor_name, v_actor_role, v_actor_agency
  from public.profiles
  where id = v_actor_id;

  if v_actor_name is null then
    raise exception 'ORCHESTRATOR_NO_PROFILE: user % has no profile row', v_actor_id;
  end if;

  -- 2. Lock the incident row to prevent concurrent transitions racing.
  select * into v_incident
  from public.incidents
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'ORCHESTRATOR_NOT_FOUND: incident % does not exist', p_incident_id;
  end if;

  v_current := v_incident.status;

  -- 3. Validate transition.
  if v_current = p_target_status then
    raise exception 'ORCHESTRATOR_NOOP: incident % already in status %',
      p_incident_id, v_current;
  end if;

  if v_current = 'closed' then
    raise exception 'ORCHESTRATOR_TERMINAL: incident % is closed and cannot transition',
      p_incident_id;
  end if;

  v_allowed := case
    when v_current = 'new'           and p_target_status = 'acknowledged'  then true
    when v_current = 'acknowledged'  and p_target_status = 'on_scene'      then true
    when v_current = 'on_scene'      and p_target_status = 'scene_cleared' then true
    when v_current = 'scene_cleared' and p_target_status = 'closed'        then true
    when p_target_status = 'closed' and v_actor_role = 'admin'             then true
    else false
  end;

  if not v_allowed then
    insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
    values (v_now, v_actor_id, v_actor_name,
      format('REJECTED transition %s -> %s', v_current, p_target_status),
      'incident', p_incident_id);

    raise exception 'ORCHESTRATOR_INVALID_TRANSITION: % -> % is not allowed (role=%)',
      v_current, p_target_status, coalesce(v_actor_role, 'unknown');
  end if;

  -- 4. Role gates per target status.
  if p_target_status in ('acknowledged', 'on_scene') then
    if v_actor_role not in ('admin', 'responder') then
      raise exception 'ORCHESTRATOR_FORBIDDEN: role % cannot perform %',
        v_actor_role, p_target_status;
    end if;
  end if;

  if p_target_status in ('scene_cleared', 'closed') and v_actor_role <> 'admin' then
    if v_incident.assigned_to_user_id is null
       or v_incident.assigned_to_user_id <> v_actor_id then
      raise exception 'ORCHESTRATOR_FORBIDDEN: only the assigned responder or an admin may move % -> %',
        v_current, p_target_status;
    end if;
  end if;

  -- 5. Extract optional payload fields.
  v_assignee_id := nullif(p_payload->>'assignee_id', '')::uuid;
  v_note        := p_payload->>'note';
  v_dispatch    := p_payload->'dispatch';
  v_message     := p_payload->>'message';

  -- 6. Assignment rules: on_scene must have an assignee; default to actor.
  if p_target_status = 'on_scene' then
    if v_assignee_id is null then
      v_assignee_id := v_actor_id;
    end if;

    select name into v_assignee_name
    from public.profiles
    where id = v_assignee_id and status = 'active';

    if v_assignee_name is null then
      raise exception 'ORCHESTRATOR_INVALID_ASSIGNEE: % is not an active profile',
        v_assignee_id;
    end if;
  end if;

  -- 7. Apply the transition atomically.
  update public.incidents
     set status              = p_target_status,
         assigned_to_user_id = case
           when p_target_status = 'on_scene' then v_assignee_id
           else assigned_to_user_id
         end
   where id = p_incident_id
   returning * into v_incident;

  -- 8. Optional side-effects: dispatch unit record, collaboration message.
  if v_dispatch is not null and v_dispatch ? 'name' and v_dispatch ? 'agency' then
    insert into public.dispatched_units(id, incident_id, name, agency, status, dispatched_at)
    values (
      'DU-' || replace((gen_random_uuid())::text, '-', ''),
      p_incident_id,
      v_dispatch->>'name',
      v_dispatch->>'agency',
      case when p_target_status = 'on_scene' then 'on_scene' else 'dispatched' end,
      v_now
    );
  end if;

  if v_message is not null and length(trim(v_message)) > 0 then
    insert into public.collaboration_messages(incident_id, timestamp, user_id, user_name, agency, message)
    values (
      p_incident_id, v_now, v_actor_id, v_actor_name,
      coalesce(v_actor_agency, 'System'),
      v_message
    );
  end if;

  -- 9. Action log: human-readable timeline entry.
  v_action_text := case p_target_status
    when 'acknowledged'  then format('Verified by %s', v_actor_name)
    when 'on_scene'      then format('Assigned to %s; on scene', coalesce(v_assignee_name, v_actor_name))
    when 'scene_cleared' then format('Scene cleared by %s', v_actor_name)
    when 'closed'        then format('Incident closed by %s', v_actor_name)
    else format('Status changed to %s by %s', p_target_status, v_actor_name)
  end;

  if v_note is not null and length(trim(v_note)) > 0 then
    v_action_text := v_action_text || ' — ' || v_note;
  end if;

  insert into public.action_logs(incident_id, timestamp, user_id, user_name, action)
  values (p_incident_id, v_now, v_actor_id, v_actor_name, v_action_text);

  -- 10. Audit log: system trail entry.
  insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
  values (
    v_now, v_actor_id, v_actor_name,
    format('TRANSITION %s -> %s', v_current, p_target_status),
    'incident', p_incident_id
  );

  -- 11. Queue lifecycle notification (non-blocking via pg_net).
  --     Map target status to semantic event type names.
  --     No dedup suffix: each lifecycle transition fires at most once.
  v_event_type := case p_target_status
    when 'acknowledged'  then 'incident.verified'
    when 'on_scene'      then 'incident.on_scene'
    when 'scene_cleared' then 'incident.scene_cleared'
    when 'closed'        then 'incident.closed'
    else 'incident.' || p_target_status
  end;

  perform public.fire_notification(
    p_incident_id,
    v_event_type,
    jsonb_build_object(
      'actor_name',    v_actor_name,
      'actor_role',    v_actor_role,
      'assignee_name', coalesce(v_assignee_name, ''),
      'note',          coalesce(v_note, ''),
      'from_status',   v_current
    )
    -- no dedup suffix: one-time lifecycle event
  );

  -- 12. Return the updated incident row to the caller.
  return to_jsonb(v_incident);
end;
$$;

revoke all on function public.transition_incident_status(text, text, jsonb) from public;
grant execute on function public.transition_incident_status(text, text, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
--  Updated assign_incident — fires incident.assigned on every reassignment.
--  Uses minute-level dedup suffix so each distinct assignment fires once.
-- ----------------------------------------------------------------------------
create or replace function public.assign_incident(
  p_incident_id text,
  p_assignee_id uuid,
  p_note        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id      uuid := auth.uid();
  v_actor_name    text;
  v_actor_role    text;
  v_assignee_name text;
  v_incident      public.incidents%rowtype;
  v_now           timestamptz := now();
  v_action_text   text;
begin
  if v_actor_id is null then
    raise exception 'ORCHESTRATOR_UNAUTHENTICATED';
  end if;

  select name, role into v_actor_name, v_actor_role
  from public.profiles where id = v_actor_id;

  if v_actor_role not in ('admin', 'responder') then
    raise exception 'ORCHESTRATOR_FORBIDDEN: role % cannot assign', v_actor_role;
  end if;

  select * into v_incident from public.incidents where id = p_incident_id for update;
  if not found then
    raise exception 'ORCHESTRATOR_NOT_FOUND: incident % does not exist', p_incident_id;
  end if;

  if v_incident.status in ('scene_cleared', 'closed') then
    raise exception 'ORCHESTRATOR_TERMINAL: cannot reassign an incident in status %',
      v_incident.status;
  end if;

  select name into v_assignee_name
  from public.profiles where id = p_assignee_id and status = 'active';

  if v_assignee_name is null then
    raise exception 'ORCHESTRATOR_INVALID_ASSIGNEE: % is not an active profile',
      p_assignee_id;
  end if;

  update public.incidents
     set assigned_to_user_id = p_assignee_id
   where id = p_incident_id
   returning * into v_incident;

  v_action_text := format('Assigned to %s by %s', v_assignee_name, v_actor_name);
  if p_note is not null and length(trim(p_note)) > 0 then
    v_action_text := v_action_text || ' — ' || p_note;
  end if;

  insert into public.action_logs(incident_id, timestamp, user_id, user_name, action)
  values (p_incident_id, v_now, v_actor_id, v_actor_name, v_action_text);

  insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
  values (v_now, v_actor_id, v_actor_name,
    format('ASSIGN -> %s', p_assignee_id), 'incident', p_incident_id);

  -- Fire notification with minute-level dedup suffix.
  -- This allows re-notification on every distinct reassignment (not suppressed across calls).
  perform public.fire_notification(
    p_incident_id,
    'incident.assigned',
    jsonb_build_object(
      'actor_name',    v_actor_name,
      'assignee_name', v_assignee_name,
      'note',          coalesce(p_note, '')
    ),
    to_char(v_now, 'YYYY-MM-DD-HH24-MI')  -- one notification per minute per incident
  );

  return to_jsonb(v_incident);
end;
$$;

revoke all on function public.assign_incident(text, uuid, text) from public;
grant execute on function public.assign_incident(text, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
--  Escalation checker: stale-incident SLA monitor
--
--  SLA thresholds (demo-appropriate, adjust for production):
--    new          > 5 minutes  → escalate
--    acknowledged > 15 minutes → escalate
--    on_scene     > 60 minutes → escalate
--
--  Dedup: hour-bucket suffix ensures at most one escalation per hour per incident.
--  Called by pg_cron every 5 minutes.
-- ----------------------------------------------------------------------------
create or replace function public.check_incident_escalations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident  record;
  v_threshold interval;
  v_hour_key  text;
begin
  for v_incident in
    select id, status, severity, time
    from public.incidents
    where status in ('new', 'acknowledged', 'on_scene')
  loop
    v_threshold := case v_incident.status
      when 'new'          then interval '5 minutes'
      when 'acknowledged' then interval '15 minutes'
      when 'on_scene'     then interval '60 minutes'
    end;

    -- Skip incidents still within SLA
    continue when v_incident.time >= (now() - v_threshold);

    -- One escalation notification per UTC hour per incident
    v_hour_key := to_char(now() at time zone 'UTC', 'YYYY-MM-DD-HH24');

    perform public.fire_notification(
      v_incident.id,
      'incident.escalated',
      jsonb_build_object(
        'stale_status',   v_incident.status,
        'threshold_mins', extract(epoch from v_threshold) / 60,
        'stale_since',    v_incident.time
      ),
      v_hour_key
    );
  end loop;
end;
$$;

-- Schedule via pg_cron (requires pg_cron extension).
-- To enable: Studio > Database > Extensions > pg_cron
-- This block is wrapped in a DO to fail gracefully if pg_cron is not available.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Remove old job if it exists, then re-create
    begin
      perform cron.unschedule('incident-escalation-check');
    exception when others then
      null;
    end;

    perform cron.schedule(
      'incident-escalation-check',
      '*/5 * * * *',
      'select public.check_incident_escalations()'
    );
    raise notice 'Escalation cron job scheduled (every 5 minutes).';
  else
    raise notice
      'pg_cron not installed. Enable it in Studio > Database > Extensions, then run: '
      'select cron.schedule(''incident-escalation-check'', ''*/5 * * * *'', '
      '''select public.check_incident_escalations()'');';
  end if;
end;
$$;
