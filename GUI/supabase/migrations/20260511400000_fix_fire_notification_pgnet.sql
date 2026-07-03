-- ============================================================================
--  Fix: fire_notification() — enable pg_net + decouple from incident creation
-- ----------------------------------------------------------------------------
--  Root cause:
--    fire_notification() calls net.http_post() (pg_net API).
--    The `net` schema only exists when the pg_net extension is ENABLED.
--    pg_net was not enabled on this project, so every INSERT into `incidents`
--    triggered the `incident_created_notify` trigger → on_incident_inserted()
--    → fire_notification() → net.http_post() → transaction aborted with:
--        ERROR: schema "net" does not exist
--
--  Fix (two parts):
--    1. Enable pg_net so net.http_post() is available going forward.
--    2. Wrap the net.http_post() call in BEGIN...EXCEPTION so any future
--       pg_net failure NEVER prevents incident creation from completing.
--       On error the notification_events row stays 'pending' (retryable).
-- ============================================================================

-- Part 1: Enable pg_net.
--   pg_net is bundled with all Supabase Postgres instances.
--   IF NOT EXISTS makes this safe to re-run (idempotent).
create extension if not exists pg_net;

-- Part 2: Replace fire_notification() — body is jsonb (not text),
--   and the net.http_post() call is wrapped in an exception block.
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

  -- 2. Idempotency gate: suppress if a pending or sent record already exists.
  if exists (
    select 1 from public.notification_events
    where dedup_key = v_dedup_key
      and status in ('pending', 'sent')
  ) then
    return null;  -- suppressed duplicate; caller is not informed
  end if;

  -- 3. Snapshot the incident row to enrich the payload.
  select * into v_incident from public.incidents where id = p_incident_id;
  if not found then return null; end if;

  -- 4. Insert a 'pending' event record (the delivery audit trail).
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

  -- 5. Read the shared notify secret from Vault.
  begin
    select decrypted_secret into v_notify_secret
    from vault.decrypted_secrets
    where name = 'notify_secret'
    limit 1;
  exception when others then
    v_notify_secret := null;
  end;

  if v_notify_secret is null then
    -- Secret not yet configured: mark failed, return — do NOT error.
    update public.notification_events
       set status        = 'failed',
           error_message = 'notify_secret not found in vault — see setup instructions'
     where id = v_event_id;
    return v_event_id;
  end if;

  -- 6. Fire async HTTP call via pg_net.
  --    CRITICAL: this block MUST NOT propagate exceptions to the caller.
  --    net.http_post body parameter is jsonb — do not cast to text.
  --    On any failure the event stays 'pending' (retryable); incident INSERT
  --    succeeds regardless.
  begin
    perform net.http_post(
      url     := v_notify_url,
      body    := jsonb_build_object('event_id', v_event_id),
      headers := jsonb_build_object(
        'Content-Type',    'application/json',
        'x-notify-secret', v_notify_secret
      )
    );
  exception when others then
    -- pg_net error, network issue, or schema problem.
    -- Leave event as 'pending' for retry; do NOT re-raise.
    update public.notification_events
       set error_message = 'pg_net dispatch failed: ' || sqlerrm
     where id = v_event_id;
  end;

  return v_event_id;
end;
$$;

revoke all on function public.fire_notification(text, text, jsonb, text) from public;
grant execute on function public.fire_notification(text, text, jsonb, text) to authenticated;
grant execute on function public.fire_notification(text, text, jsonb, text) to service_role;
