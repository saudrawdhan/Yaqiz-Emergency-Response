-- ============================================================================
--  Assignment Engine + Notification Logging
-- ----------------------------------------------------------------------------
--  Adds:
--    - public.response_units : dispatchable units with live lat/lng
--    - public.dispatch_nearest_units(incident_id, agency_types) RPC
--    - public.log_notification_result(...) helper for the Edge Function
--
--  Already applied to production via the Supabase MCP on 2026-05-11.
--  This file is the source-of-truth checkpoint in git.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  response_units : roster of dispatchable units with location & status
-- ----------------------------------------------------------------------------
create table if not exists public.response_units (
  id            text primary key,
  name          text not null,
  agency_type   text not null check (agency_type in ('Hospital', 'Police', 'Civil Defense', 'Najm')),
  agency_name   text,
  lat           double precision not null,
  lng           double precision not null,
  status        text not null default 'active'
                check (status in ('active', 'unavailable', 'offline')),
  contact       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists response_units_status_agency_idx
  on public.response_units(status, agency_type);

create index if not exists response_units_active_lat_lng_idx
  on public.response_units(lat, lng) where status = 'active';

alter table public.response_units enable row level security;

drop policy if exists response_units_select on public.response_units;
create policy response_units_select on public.response_units
  for select to authenticated using (true);

drop policy if exists response_units_admin_write on public.response_units;
create policy response_units_admin_write on public.response_units
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
--  dispatch_nearest_units(p_incident_id, p_agency_types)
-- ----------------------------------------------------------------------------
create or replace function public.dispatch_nearest_units(
  p_incident_id   text,
  p_agency_types  text[] default array['Hospital','Police','Najm']
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id     uuid := auth.uid();
  v_actor_name   text;
  v_actor_role   text;
  v_incident     public.incidents%rowtype;
  v_agency       text;
  v_unit         record;
  v_dispatched   jsonb := '[]'::jsonb;
  v_skipped      jsonb := '[]'::jsonb;
  v_now          timestamptz := now();
  v_du_id        text;
  v_summary      text;
  v_count        integer := 0;
begin
  if v_actor_id is null then
    raise exception 'DISPATCH_UNAUTHENTICATED';
  end if;

  select name, role into v_actor_name, v_actor_role
  from public.profiles where id = v_actor_id;

  if v_actor_role not in ('admin', 'responder') then
    raise exception 'DISPATCH_FORBIDDEN: role % may not dispatch', v_actor_role;
  end if;

  select * into v_incident
  from public.incidents
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'DISPATCH_NOT_FOUND: incident %', p_incident_id;
  end if;

  if v_incident.lat is null or v_incident.lng is null then
    raise exception 'DISPATCH_MISSING_COORDS: incident has no coordinates';
  end if;

  if v_incident.status = 'closed' then
    raise exception 'DISPATCH_TERMINAL: cannot dispatch on a closed incident';
  end if;

  foreach v_agency in array p_agency_types loop
    -- Idempotency: skip agencies that already have an active dispatch.
    if exists (
      select 1 from public.dispatched_units du
      where du.incident_id = p_incident_id
        and du.agency = v_agency
        and du.status <> 'cleared'
    ) then
      v_skipped := v_skipped || jsonb_build_object(
        'agency_type', v_agency,
        'reason', 'already_dispatched'
      );
      continue;
    end if;

    -- Nearest active unit for this agency_type via Haversine (km)
    select
      ru.id, ru.name, ru.agency_name, ru.lat, ru.lng,
      2 * 6371 * asin(sqrt(
        pow(sin(radians((ru.lat - v_incident.lat) / 2)), 2)
        + cos(radians(v_incident.lat)) * cos(radians(ru.lat))
          * pow(sin(radians((ru.lng - v_incident.lng) / 2)), 2)
      )) as distance_km
    into v_unit
    from public.response_units ru
    where ru.status = 'active'
      and ru.agency_type = v_agency
    order by distance_km asc
    limit 1;

    if v_unit.id is null then
      v_skipped := v_skipped || jsonb_build_object(
        'agency_type', v_agency,
        'reason', 'no_active_units'
      );
      continue;
    end if;

    v_du_id := 'DU-' || replace(gen_random_uuid()::text, '-', '');

    insert into public.dispatched_units(
      id, incident_id, name, agency, status, dispatched_at
    )
    values (
      v_du_id,
      p_incident_id,
      v_unit.name,
      coalesce(v_unit.agency_name, v_agency),
      'dispatched',
      v_now
    );

    v_dispatched := v_dispatched || jsonb_build_object(
      'agency_type',   v_agency,
      'unit_id',       v_unit.id,
      'dispatched_id', v_du_id,
      'unit_name',     v_unit.name,
      'agency_name',   coalesce(v_unit.agency_name, v_agency),
      'distance_km',   round(v_unit.distance_km::numeric, 2),
      'dispatched_at', v_now
    );

    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    select string_agg(
      format('%s (%s, %s km)',
        d->>'unit_name',
        d->>'agency_name',
        d->>'distance_km'),
      ', '
    ) into v_summary
    from jsonb_array_elements(v_dispatched) as d;

    insert into public.action_logs(incident_id, timestamp, user_id, user_name, action)
    values (p_incident_id, v_now, v_actor_id, v_actor_name,
      format('Dispatched %s unit(s): %s', v_count, v_summary));

    insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
    values (v_now, v_actor_id, v_actor_name,
      format('DISPATCH x%s', v_count), 'incident', p_incident_id);
  else
    insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
    values (v_now, v_actor_id, v_actor_name,
      'DISPATCH skipped (no eligible units)', 'incident', p_incident_id);
  end if;

  return jsonb_build_object(
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
    ),
    'dispatched', v_dispatched,
    'skipped',    v_skipped,
    'count',      v_count
  );
end;
$$;

revoke all on function public.dispatch_nearest_units(text, text[]) from public;
grant execute on function public.dispatch_nearest_units(text, text[]) to authenticated;

-- ----------------------------------------------------------------------------
--  log_notification_result : called by the Edge Function to record Telegram
--  delivery success/failure into action_logs + audit_logs.
-- ----------------------------------------------------------------------------
create or replace function public.log_notification_result(
  p_incident_id text,
  p_channel     text,
  p_success     boolean,
  p_detail      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id   uuid := auth.uid();
  v_actor_name text := 'System';
  v_now        timestamptz := now();
  v_action     text;
begin
  if v_actor_id is not null then
    select name into v_actor_name from public.profiles where id = v_actor_id;
    if v_actor_name is null then v_actor_name := 'System'; end if;
  end if;

  v_action := case
    when p_success then format('%s notification sent', p_channel)
    else format('%s notification FAILED: %s', p_channel, coalesce(p_detail, 'unknown error'))
  end;

  insert into public.action_logs(incident_id, timestamp, user_id, user_name, action)
  values (p_incident_id, v_now, v_actor_id, v_actor_name, v_action);

  insert into public.audit_logs(timestamp, user_id, user_name, action, entity_type, entity_id)
  values (v_now, v_actor_id, v_actor_name,
    case when p_success
         then format('NOTIFY %s ok', p_channel)
         else format('NOTIFY %s fail: %s', p_channel, coalesce(p_detail, 'unknown'))
    end,
    'incident', p_incident_id);
end;
$$;

revoke all on function public.log_notification_result(text, text, boolean, text) from public;
grant execute on function public.log_notification_result(text, text, boolean, text) to authenticated;

-- ----------------------------------------------------------------------------
--  Demo seed: Riyadh-area response units. Idempotent via ON CONFLICT.
-- ----------------------------------------------------------------------------
insert into public.response_units (id, name, agency_type, agency_name, lat, lng, status) values
  ('RU-HOSP-001', 'King Faisal Specialist Hospital - Ambulance 1', 'Hospital', 'King Faisal Specialist Hospital', 24.6852, 46.6217, 'active'),
  ('RU-HOSP-002', 'King Saud Medical City - Ambulance 2',          'Hospital', 'King Saud Medical City',          24.6477, 46.7138, 'active'),
  ('RU-HOSP-003', 'King Khalid University Hospital - Ambulance 3', 'Hospital', 'King Khalid University Hospital', 24.7257, 46.6203, 'active'),
  ('RU-HOSP-004', 'King Fahd Medical City - Ambulance 4',          'Hospital', 'King Fahd Medical City',          24.6921, 46.7028, 'active'),
  ('RU-HOSP-005', 'Prince Sultan Cardiac Center - Ambulance 5',    'Hospital', 'Prince Sultan Cardiac Center',    24.7440, 46.6290, 'active'),
  ('RU-POL-001',  'Riyadh Central Police - Patrol 211', 'Police', 'Riyadh Central Police',  24.7136, 46.6753, 'active'),
  ('RU-POL-002',  'Olaya District Police - Patrol 318', 'Police', 'Riyadh Police',          24.6917, 46.6850, 'active'),
  ('RU-POL-003',  'Northern Riyadh Police - Patrol 412','Police', 'Riyadh Police',          24.7820, 46.7301, 'active'),
  ('RU-POL-004',  'Al Muruj Police - Patrol 522',       'Police', 'Riyadh Police',          24.6733, 46.6610, 'active'),
  ('RU-NAJM-001', 'Najm Unit 42',  'Najm', 'Najm Insurance', 24.7009, 46.6790, 'active'),
  ('RU-NAJM-002', 'Najm Unit 87',  'Najm', 'Najm Insurance', 24.6520, 46.7155, 'active'),
  ('RU-NAJM-003', 'Najm Unit 119', 'Najm', 'Najm Insurance', 24.7651, 46.6924, 'active'),
  ('RU-CD-001',   'Civil Defense Unit 5', 'Civil Defense', 'Saudi Civil Defense', 24.6840, 46.6920, 'active'),
  ('RU-CD-002',   'Civil Defense Unit 8', 'Civil Defense', 'Saudi Civil Defense', 24.7345, 46.6580, 'active')
on conflict (id) do nothing;
