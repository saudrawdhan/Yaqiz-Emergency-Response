-- ============================================================================
--  QUICK-APPLY: Emergency Event Orchestrator RPCs
-- ============================================================================
--
--  Run this ENTIRE file in Supabase Studio → SQL Editor → Run.
--  After it succeeds, go to Settings → API → "Reload" to refresh PostgREST's
--  schema cache immediately (without reloading, the function is usable but
--  may take up to 5 minutes to appear in auto-completion).
--
--  This script is ADDITIVE: it creates/replaces functions only.
--  It does NOT enable RLS or modify existing table policies.
--  Run the full migration (migrations/20260510000000_emergency_event_orchestrator.sql)
--  when you are ready to enforce server-side RLS on the incidents table.
-- ============================================================================

-- --------------------------------------------------------------------------
--  Helper used by the transition RPCs
-- --------------------------------------------------------------------------
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and role = 'admin'
      and status = 'active'
  );
$$;

-- --------------------------------------------------------------------------
--  transition_incident_status
--    p_incident_id   — incident PK (text)
--    p_target_status — requested next status (text)
--    p_payload       — optional jsonb with:
--                        assignee_id (uuid as text)
--                        note        (text)
--                        message     (text)
--                        dispatch    { name, agency }
-- --------------------------------------------------------------------------
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
begin
  -- 1. Caller identity
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'ORCHESTRATOR_UNAUTHENTICATED: no auth session';
  end if;

  select name, role, agency
    into v_actor_name, v_actor_role, v_actor_agency
  from public.profiles
  where id = v_actor_id;

  if v_actor_name is null then
    raise exception 'ORCHESTRATOR_NO_PROFILE: user % has no profile', v_actor_id;
  end if;

  -- 2. Lock the incident row (prevents concurrent transitions)
  select * into v_incident
  from public.incidents
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'ORCHESTRATOR_NOT_FOUND: incident % not found', p_incident_id;
  end if;

  v_current := v_incident.status;

  -- 3. Guard: already there / already terminal
  if v_current = p_target_status then
    raise exception 'ORCHESTRATOR_NOOP: incident already in status %', v_current;
  end if;

  if v_current = 'closed' then
    raise exception 'ORCHESTRATOR_TERMINAL: incident is closed, no transitions allowed';
  end if;

  -- 4. Transition table (mirrors incidentOrchestrator.ts TRANSITIONS)
  v_allowed := case
    when v_current = 'new'           and p_target_status = 'acknowledged'  then true
    when v_current = 'acknowledged'  and p_target_status = 'on_scene'      then true
    when v_current = 'on_scene'      and p_target_status = 'scene_cleared' then true
    when v_current = 'scene_cleared' and p_target_status = 'closed'        then true
    -- Admin abort: close a false-positive from any non-terminal state
    when p_target_status = 'closed'  and v_actor_role = 'admin'            then true
    else false
  end;

  if not v_allowed then
    -- Log the rejected attempt before raising
    insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
    values (v_now, v_actor_id, v_actor_name,
      format('REJECTED transition %s -> %s', v_current, p_target_status),
      'incident', p_incident_id);

    raise exception 'ORCHESTRATOR_INVALID_TRANSITION: % -> % not permitted (role=%)',
      v_current, p_target_status, coalesce(v_actor_role, 'unknown');
  end if;

  -- 5. Role gate
  if p_target_status in ('scene_cleared', 'closed') and v_actor_role <> 'admin' then
    if v_incident.assigned_to_user_id is null
       or v_incident.assigned_to_user_id <> v_actor_id then
      raise exception 'ORCHESTRATOR_FORBIDDEN: only the assigned responder or an admin may resolve/close';
    end if;
  end if;

  -- 6. Parse payload
  v_assignee_id := nullif(p_payload->>'assignee_id', '')::uuid;
  v_note        := p_payload->>'note';
  v_dispatch    := p_payload->'dispatch';
  v_message     := p_payload->>'message';

  -- Default assignee to actor when going on_scene
  if p_target_status = 'on_scene' then
    if v_assignee_id is null then
      v_assignee_id := v_actor_id;
    end if;

    select name into v_assignee_name
    from public.profiles
    where id = v_assignee_id and status = 'active';

    if v_assignee_name is null then
      raise exception 'ORCHESTRATOR_INVALID_ASSIGNEE: % is not an active profile', v_assignee_id;
    end if;
  end if;

  -- 7. Apply transition
  update public.incidents
     set status              = p_target_status,
         assigned_to_user_id = case
           when p_target_status = 'on_scene' then v_assignee_id
           else assigned_to_user_id
         end
   where id = p_incident_id
   returning * into v_incident;

  -- 8. Optional dispatch unit
  if v_dispatch is not null and v_dispatch ? 'name' and v_dispatch ? 'agency' then
    insert into public.dispatched_units(id, incident_id, name, agency, status, dispatched_at)
    values (
      'DU-' || replace(gen_random_uuid()::text, '-', ''),
      p_incident_id,
      v_dispatch->>'name',
      v_dispatch->>'agency',
      case when p_target_status = 'on_scene' then 'on_scene' else 'dispatched' end,
      v_now
    );
  end if;

  -- 9. Optional collaboration message
  if v_message is not null and length(trim(v_message)) > 0 then
    insert into public.collaboration_messages(incident_id, timestamp, user_id, user_name, agency, message)
    values (p_incident_id, v_now, v_actor_id, v_actor_name,
            coalesce(v_actor_agency, 'System'), v_message);
  end if;

  -- 10. Action log (human-readable timeline)
  v_action_text := case p_target_status
    when 'acknowledged'  then format('Incident verified by %s', v_actor_name)
    when 'on_scene'      then format('Assigned to %s; active on scene', coalesce(v_assignee_name, v_actor_name))
    when 'scene_cleared' then format('Scene cleared by %s', v_actor_name)
    when 'closed'        then format('Incident closed by %s', v_actor_name)
    else format('Status → %s by %s', p_target_status, v_actor_name)
  end;
  if v_note is not null and length(trim(v_note)) > 0 then
    v_action_text := v_action_text || ' — ' || v_note;
  end if;

  insert into public.action_logs(incident_id, timestamp, user_id, user_name, action)
  values (p_incident_id, v_now, v_actor_id, v_actor_name, v_action_text);

  -- 11. Audit log (system trail)
  insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
  values (v_now, v_actor_id, v_actor_name,
    format('TRANSITION %s -> %s', v_current, p_target_status),
    'incident', p_incident_id);

  return to_jsonb(v_incident);
end;
$$;

-- --------------------------------------------------------------------------
--  assign_incident — change assignee without moving status
-- --------------------------------------------------------------------------
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
    raise exception 'ORCHESTRATOR_NOT_FOUND: incident % not found', p_incident_id;
  end if;

  if v_incident.status in ('scene_cleared', 'closed') then
    raise exception 'ORCHESTRATOR_TERMINAL: cannot reassign in status %', v_incident.status;
  end if;

  select name into v_assignee_name
  from public.profiles where id = p_assignee_id and status = 'active';

  if v_assignee_name is null then
    raise exception 'ORCHESTRATOR_INVALID_ASSIGNEE: % is not an active profile', p_assignee_id;
  end if;

  update public.incidents
     set assigned_to_user_id = p_assignee_id
   where id = p_incident_id
   returning * into v_incident;

  -- Build action log entry
  v_action_text := format('Assigned to %s by %s', v_assignee_name, v_actor_name);
  if p_note is not null and length(trim(p_note)) > 0 then
    v_action_text := v_action_text || ' — ' || p_note;
  end if;

  insert into public.action_logs(incident_id, timestamp, user_id, user_name, action)
  values (p_incident_id, v_now, v_actor_id, v_actor_name, v_action_text);

  insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
  values (v_now, v_actor_id, v_actor_name,
    format('ASSIGN -> %s', p_assignee_id), 'incident', p_incident_id);

  return to_jsonb(v_incident);
end;
$$;

-- --------------------------------------------------------------------------
--  Grant execute to authenticated users
-- --------------------------------------------------------------------------
revoke all on function public.transition_incident_status(text, text, jsonb) from public;
grant execute on function public.transition_incident_status(text, text, jsonb) to authenticated;

revoke all on function public.assign_incident(text, uuid, text) from public;
grant execute on function public.assign_incident(text, uuid, text) to authenticated;

grant execute on function public.is_admin(uuid) to authenticated;

-- --------------------------------------------------------------------------
--  Verify the functions were created
-- --------------------------------------------------------------------------
select
  routine_name,
  routine_type,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('transition_incident_status', 'assign_incident', 'is_admin')
order by routine_name;
