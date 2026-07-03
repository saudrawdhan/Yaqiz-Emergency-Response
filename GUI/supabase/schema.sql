-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.action_logs (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  incident_id text NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  user_name text NOT NULL,
  action text NOT NULL,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  CONSTRAINT action_logs_pkey PRIMARY KEY (id),
  CONSTRAINT action_logs_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id),
  CONSTRAINT action_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.audit_logs (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  timestamp timestamp with time zone NOT NULL,
  user_id uuid,
  user_name text NOT NULL,
  ip_address text,
  action text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  entity_type text,
  entity_id text,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.cameras (
  id text NOT NULL,
  name text NOT NULL,
  location text NOT NULL,
  stream_url text NOT NULL,
  status text NOT NULL DEFAULT 'online'::text CHECK (status = ANY (ARRAY['online'::text, 'offline'::text, 'degraded'::text])),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  protocol text CHECK (protocol = ANY (ARRAY['rtsp'::text, 'http'::text, 'https'::text])),
  username text,
  port integer,
  path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  added_by_user_id uuid,
  CONSTRAINT cameras_pkey PRIMARY KEY (id),
  CONSTRAINT cameras_added_by_user_id_fkey FOREIGN KEY (added_by_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collaboration_messages (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  incident_id text NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  user_name text NOT NULL,
  agency text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  CONSTRAINT collaboration_messages_pkey PRIMARY KEY (id),
  CONSTRAINT collaboration_messages_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id),
  CONSTRAINT collaboration_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.dispatched_units (
  id text NOT NULL,
  incident_id text NOT NULL,
  name text NOT NULL,
  agency text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['dispatched'::text, 'en_route'::text, 'on_scene'::text, 'cleared'::text])),
  dispatched_at timestamp with time zone NOT NULL,
  on_scene_at timestamp with time zone,
  cleared_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dispatched_units_pkey PRIMARY KEY (id),
  CONSTRAINT dispatched_units_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id)
);
CREATE TABLE public.incident_photos (
  id text NOT NULL,
  incident_id text NOT NULL,
  uri text NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT incident_photos_pkey PRIMARY KEY (id),
  CONSTRAINT incident_photos_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id)
);
CREATE TABLE public.incidents (
  id text NOT NULL,
  case_id text NOT NULL UNIQUE,
  location text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  time timestamp with time zone NOT NULL,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['high'::text, 'moderate'::text, 'low'::text])),
  status text NOT NULL DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'acknowledged'::text, 'on_scene'::text, 'scene_cleared'::text, 'closed'::text])),
  ai_summary text NOT NULL,
  estimated_injuries integer,
  confidence text NOT NULL CHECK (confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  weather jsonb,
  traffic text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  camera_id text,
  assigned_to_user_id uuid,
  llm_hospital text,
  llm_police text,
  llm_najm text,
  CONSTRAINT incidents_pkey PRIMARY KEY (id),
  CONSTRAINT incidents_camera_id_fkey FOREIGN KEY (camera_id) REFERENCES public.cameras(id),
  CONSTRAINT incidents_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'responder'::text])),
  agency text,
  agency_type text CHECK (agency_type = ANY (ARRAY['Hospital'::text, 'Police'::text, 'Civil Defense'::text, 'Najm'::text])),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'disabled'::text])),
  contact_number text,
  last_login timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
