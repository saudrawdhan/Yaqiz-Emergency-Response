-- ============================================================================
--  Emergency Event Orchestrator
-- ----------------------------------------------------------------------------
--  Centralised workflow engine for the incident lifecycle.
--
--  Lifecycle mapping (project schema -> business meaning):
--    new            = Detected
--    acknowledged   = Verified
--    on_scene       = Assigned / actively handled
--    scene_cleared  = Resolved (operationally cleared)
--    closed         = Closed (final terminal state)
--
--  Valid transitions:
--    new            -> acknowledged | closed*
--    acknowledged   -> on_scene     | closed*
--    on_scene       -> scene_cleared| closed*
--    scene_cleared  -> closed
--    closed         -> (terminal)
--
--    *closed-from-non-terminal is restricted to admins (false-positive abort).
--
--  Every transition writes an action_logs row (human timeline) and an
--  audit_logs row (system trail). Invalid attempts are rejected with a clear
--  exception and ALSO logged to audit_logs as a rejected action.
--
--  This migration is additive: it does NOT alter or drop any existing
--  table or column. It only adds a function, a helper, and RLS policies
--  to keep the table writeable by privileged roles while forcing normal
--  responders to go through the RPC.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Helper: is the calling user an admin?
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
--  Core RPC: transition_incident_status
--    p_incident_id  : incident PK
--    p_target_status: requested next status
--    p_payload      : optional jsonb with any of:
--                       { "assignee_id": uuid,
--                         "note": text,
--                         "dispatch": { "name": text, "agency": text },
--                         "message": text }
--  Returns the updated incident row as jsonb.
-- ---------------------------------------------------------------------------
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
  -- 1. Identify the caller. RPCs invoked through the JS client run as the
  --    authenticated user; auth.uid() must be present.
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

  -- 3. Validate transition. Source-of-truth table.
  --    Skips like new -> closed are blocked for non-admins; admins may abort
  --    a false-positive at any non-terminal stage.
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
    -- Admin-only abort path: collapse a false-positive directly to closed.
    when p_target_status = 'closed' and v_actor_role = 'admin'             then true
    else false
  end;

  if not v_allowed then
    -- Persist the rejected attempt for auditability before raising.
    insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
    values (v_now, v_actor_id, v_actor_name,
      format('REJECTED transition %s -> %s', v_current, p_target_status),
      'incident', p_incident_id);

    raise exception 'ORCHESTRATOR_INVALID_TRANSITION: % -> % is not allowed (role=%)',
      v_current, p_target_status, coalesce(v_actor_role, 'unknown');
  end if;

  -- 4. Role gates per target status.
  --    Verification (acknowledged) and active handling (on_scene) require
  --    a responder or admin. Closure of a non-terminal requires admin (handled
  --    in the v_allowed branch above). scene_cleared/closed-from-cleared can
  --    be done by any responder assigned to the incident, or an admin.
  if p_target_status in ('acknowledged', 'on_scene') then
    if v_actor_role not in ('admin', 'responder') then
      raise exception 'ORCHESTRATOR_FORBIDDEN: role % cannot perform %',
        v_actor_role, p_target_status;
    end if;
  end if;

  if p_target_status in ('scene_cleared', 'closed') and v_actor_role <> 'admin' then
    -- Non-admins clearing/closing must be the assignee of the incident.
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

  -- 6. Assignment rules. acknowledged -> on_scene must result in a valid
  --    assignee; if none was supplied, default to the actor (a responder
  --    self-assigning when they go on scene).
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

  -- 8. Optional side-effects: dispatch unit, collaboration message.
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

  -- 11. Return the updated incident row to the caller.
  return to_jsonb(v_incident);
end;
$$;

revoke all on function public.transition_incident_status(text, text, jsonb) from public;
grant execute on function public.transition_incident_status(text, text, jsonb) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
--  Companion RPC: assign_incident
--    Used to change assignment without moving status. Useful when
--    dispatchers reassign while still in 'acknowledged'.
-- ---------------------------------------------------------------------------
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

  return to_jsonb(v_incident);
end;
$$;

revoke all on function public.assign_incident(text, uuid, text) from public;
grant execute on function public.assign_incident(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
--  RLS: keep direct UPDATEs restricted so the UI must go through the RPCs.
--  The RPCs run with SECURITY DEFINER and bypass RLS, so they continue to work.
-- ---------------------------------------------------------------------------
alter table public.incidents enable row level security;

-- Read access: any authenticated user can see incidents (matches existing
-- product behaviour where every responder sees the queue). Admins may also
-- read everything via this same policy.
drop policy if exists incidents_select_authenticated on public.incidents;
create policy incidents_select_authenticated
  on public.incidents
  for select
  to authenticated
  using (true);

-- Direct INSERT is reserved for admins / detection pipeline running as
-- service role. Service role bypasses RLS entirely, so this only affects
-- regular logged-in users.
drop policy if exists incidents_insert_admin on public.incidents;
create policy incidents_insert_admin
  on public.incidents
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

-- Direct UPDATE is admin-only. Responders MUST go through
-- transition_incident_status / assign_incident, which run as definer.
drop policy if exists incidents_update_admin on public.incidents;
create policy incidents_update_admin
  on public.incidents
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists incidents_delete_admin on public.incidents;
create policy incidents_delete_admin
  on public.incidents
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- action_logs and audit_logs: writes only via RPC (definer); reads open to
-- authenticated users so the timeline UI works.
alter table public.action_logs enable row level security;
drop policy if exists action_logs_select on public.action_logs;
create policy action_logs_select on public.action_logs for select to authenticated using (true);
drop policy if exists action_logs_insert_admin on public.action_logs;
create policy action_logs_insert_admin on public.action_logs for insert to authenticated
  with check (public.is_admin(auth.uid()));

alter table public.audit_logs enable row level security;
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select to authenticated using (true);
drop policy if exists audit_logs_insert_admin on public.audit_logs;
create policy audit_logs_insert_admin on public.audit_logs for insert to authenticated
  with check (public.is_admin(auth.uid()));

-- collaboration_messages: any authenticated user can post a chat message
-- as themselves; the RPC also uses this table for system-routed messages.
alter table public.collaboration_messages enable row level security;
drop policy if exists collab_select on public.collaboration_messages;
create policy collab_select on public.collaboration_messages for select to authenticated using (true);
drop policy if exists collab_insert_self on public.collaboration_messages;
create policy collab_insert_self on public.collaboration_messages for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- dispatched_units: managed by the orchestrator + admins.
alter table public.dispatched_units enable row level security;
drop policy if exists dispatched_select on public.dispatched_units;
create policy dispatched_select on public.dispatched_units for select to authenticated using (true);
drop policy if exists dispatched_insert_admin on public.dispatched_units;
create policy dispatched_insert_admin on public.dispatched_units for insert to authenticated
  with check (public.is_admin(auth.uid()));
drop policy if exists dispatched_update_admin on public.dispatched_units;
create policy dispatched_update_admin on public.dispatched_units for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
