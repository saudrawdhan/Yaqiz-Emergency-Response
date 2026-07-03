-- ============================================================================
--  create_incident RPC
-- ----------------------------------------------------------------------------
--  Allows both admin and responder roles to manually create a new incident.
--  Direct INSERT into incidents is blocked by RLS for non-admins; this RPC
--  runs as SECURITY DEFINER and enforces its own role gate.
--
--  Responsibilities:
--    - Role gate: admin or responder only
--    - Validate severity / confidence values
--    - Auto-generate id and case_id in INC-YYYY-NNNN format
--    - Insert with status = 'new' (not caller-controlled)
--    - Write action_log + audit_log entries
--    - Return the new incident row as jsonb
--    - The incident.created Telegram notification fires automatically via
--      the on_incident_inserted trigger (see 20260511200000_notification_system.sql)
-- ============================================================================

create or replace function public.create_incident(
  p_location           text,
  p_lat                double precision,
  p_lng                double precision,
  p_time               timestamptz,
  p_severity           text,
  p_ai_summary         text,
  p_confidence         text,
  p_estimated_injuries integer  default null,
  p_weather            jsonb    default null,
  p_traffic            text     default null,
  p_camera_id          text     default null,
  p_llm_hospital       text     default null,
  p_llm_police         text     default null,
  p_llm_najm           text     default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id    uuid        := auth.uid();
  v_actor_name  text;
  v_actor_role  text;
  v_now         timestamptz := now();
  v_year        text        := to_char(coalesce(p_time, v_now), 'YYYY');
  v_seq         int;
  v_incident_id text;
  v_case_id     text;
  v_incident    public.incidents%rowtype;
begin
  -- 1. Auth gate
  if v_actor_id is null then
    raise exception 'ORCHESTRATOR_UNAUTHENTICATED: must be logged in to create an incident';
  end if;

  select name, role into v_actor_name, v_actor_role
  from public.profiles where id = v_actor_id;

  if v_actor_name is null then
    raise exception 'ORCHESTRATOR_NO_PROFILE: user has no profile row';
  end if;

  if v_actor_role not in ('admin', 'responder') then
    raise exception 'ORCHESTRATOR_FORBIDDEN: role % cannot create incidents', v_actor_role;
  end if;

  -- 2. Input validation
  if p_location is null or trim(p_location) = '' then
    raise exception 'ORCHESTRATOR_INVALID: location is required';
  end if;

  if p_lat is null or p_lat < -90 or p_lat > 90 then
    raise exception 'ORCHESTRATOR_INVALID: lat must be between -90 and 90';
  end if;

  if p_lng is null or p_lng < -180 or p_lng > 180 then
    raise exception 'ORCHESTRATOR_INVALID: lng must be between -180 and 180';
  end if;

  if p_time is null then
    raise exception 'ORCHESTRATOR_INVALID: time is required';
  end if;

  if p_severity not in ('high', 'moderate', 'low') then
    raise exception 'ORCHESTRATOR_INVALID: severity must be high, moderate, or low (got: %)', p_severity;
  end if;

  if p_confidence not in ('low', 'medium', 'high') then
    raise exception 'ORCHESTRATOR_INVALID: confidence must be low, medium, or high (got: %)', p_confidence;
  end if;

  if p_ai_summary is null or trim(p_ai_summary) = '' then
    raise exception 'ORCHESTRATOR_INVALID: ai_summary (description) is required';
  end if;

  if p_estimated_injuries is not null and p_estimated_injuries < 0 then
    raise exception 'ORCHESTRATOR_INVALID: estimated_injuries cannot be negative';
  end if;

  -- 3. Generate unique id / case_id in INC-YYYY-NNNN format.
  --    Count existing incidents for this year to get the next sequence number.
  --    A collision on the primary key (if two inserts race) will surface as a
  --    unique constraint error — acceptable for demo scale.
  select coalesce(max(
    case
      when id ~ ('^INC-' || v_year || '-[0-9]+$')
      then (regexp_match(id, '-([0-9]+)$'))[1]::int
      else 0
    end
  ), 0) + 1
  into v_seq
  from public.incidents;

  v_incident_id := 'INC-' || v_year || '-' || lpad(v_seq::text, 4, '0');
  v_case_id     := v_incident_id;   -- case_id mirrors id for manual reports

  -- 4. Insert the incident row (status always starts as 'new').
  insert into public.incidents(
    id, case_id, location, lat, lng, time,
    severity, status, ai_summary, confidence,
    estimated_injuries, weather, traffic, camera_id,
    llm_hospital, llm_police, llm_najm
  ) values (
    v_incident_id, v_case_id, trim(p_location), p_lat, p_lng, p_time,
    p_severity, 'new', trim(p_ai_summary), p_confidence,
    p_estimated_injuries, p_weather, p_traffic, p_camera_id,
    p_llm_hospital, p_llm_police, p_llm_najm
  )
  returning * into v_incident;

  -- 5. Action log (human timeline)
  insert into public.action_logs(incident_id, timestamp, user_id, user_name, action)
  values (
    v_incident_id, v_now, v_actor_id, v_actor_name,
    format('Incident created manually by %s', v_actor_name)
  );

  -- 6. Audit log (system trail)
  insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
  values (
    v_now, v_actor_id, v_actor_name,
    'CREATE', 'incident', v_incident_id
  );

  -- Note: the incident.created Telegram notification fires automatically via
  -- the on_incident_inserted trigger (fire_notification).

  return to_jsonb(v_incident);
end;
$$;

revoke all on function public.create_incident(
  text, double precision, double precision, timestamptz,
  text, text, text,
  integer, jsonb, text, text, text, text, text
) from public;

grant execute on function public.create_incident(
  text, double precision, double precision, timestamptz,
  text, text, text,
  integer, jsonb, text, text, text, text, text
) to authenticated;
