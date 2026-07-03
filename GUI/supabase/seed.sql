-- ============================================================
-- Emergency Response Platform — Seed Data
-- Run AFTER schema.sql
-- NOTE: Users must be created via Supabase Dashboard > Auth > Users
-- or via the Admin API. This file seeds all non-auth tables.
--
-- Default accounts to create manually in Supabase Auth:
--   admin@system.gov.sa        / password: Admin@ERP2024
--   responder@hospital.gov     / password: Resp@ERP2024
--   responder@police.gov       / password: Resp@ERP2024
--
-- After creating them, paste their UUIDs below where noted.
-- ============================================================

-- ─────────────────────────────────────────
-- PROFILES (replace UUIDs after creating users in Auth)
-- ─────────────────────────────────────────
-- INSERT INTO public.profiles (id, email, name, role, agency, agency_type, status)
-- VALUES
--   ('<admin-uuid>',     'admin@system.gov.sa',    'System Administrator',   'admin',     'System Administration',    NULL,           'active'),
--   ('<hospital-uuid>',  'responder@hospital.gov', 'Dr. Sarah Ahmed',        'responder', 'King Faisal Hospital',     'Hospital',     'active'),
--   ('<police-uuid>',    'responder@police.gov',   'Officer Mohammed Ali',   'responder', 'Riyadh Police Department', 'Police',       'active');

-- ─────────────────────────────────────────
-- CAMERAS
-- ─────────────────────────────────────────
-- stream_url stores a YouTube video ID for browser-playable embeds
INSERT INTO public.cameras (id, name, location, stream_url, status, lat, lng) VALUES
  ('CAM-001-RUH', 'King Fahd Road @ Olaya Junction',         'King Fahd Road, Olaya District, Riyadh',    'butK9aqBY1E', 'online',  24.7136, 46.6753),
  ('CAM-002-RUH', 'Northern Ring Road @ Exit 7',             'Northern Ring Road, Exit 7, Riyadh',        'IVa59mpPJTg', 'online',  24.7736, 46.7381),
  ('CAM-003-RUH', 'King Abdullah Road @ Al Muruj',           'King Abdullah Road, Al Muruj District',     'x396CVeU74Q', 'online',  24.6901, 46.6697),
  ('CAM-004-RUH', 'Eastern Ring Road @ Airport Junction',    'Eastern Ring Road, Near Airport',           'Sd9ZD8Vt8tQ', 'offline', 24.7208, 46.8028),
  ('CAM-005-RUH', 'Makkah Road @ Diplomatic Quarter',        'Makkah Road, Diplomatic Quarter',           'KpZ8vteYNOw', 'online',  24.6913, 46.6182),
  ('CAM-006-RUH', 'Al-Uruba Road @ Intersection',            'Al-Uruba Road, Riyadh',                     'OElMxy6wYxY', 'online',  24.7023, 46.6889)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────
-- INCIDENTS
-- ─────────────────────────────────────────
INSERT INTO public.incidents (id, case_id, location, lat, lng, time, severity, status, ai_summary, llm_hospital, llm_police, llm_najm, estimated_injuries, confidence, weather, traffic) VALUES
(
  'INC-2024-001', 'ER-20240521-0012',
  'King Fahd Road @ Olaya Junction, Riyadh', 24.7136, 46.6753,
  NOW() - INTERVAL '2 minutes',
  'high', 'new',
  'Multi-vehicle collision involving a commercial truck and two passenger cars. Reports indicate significant front-end damage to one vehicle, with potential for fluid leaks. Emergency services are en route. Traffic is heavily impacted in the southbound lanes.',
  'Report of smoke from one vehicle. Prepare for potential extrication.',
  'Southbound King Fahd Road requires immediate traffic control. All lanes blocked.',
  NULL,
  3, 'high',
  '{"condition": "Clear", "temperature": 38, "visibility": "Good"}',
  'Heavy congestion - 4 lanes blocked'
),
(
  'INC-2024-002', 'ER-20240521-0011',
  'Northern Ring Road @ Exit 7, Riyadh', 24.7736, 46.7381,
  NOW() - INTERVAL '15 minutes',
  'moderate', 'acknowledged',
  'Single vehicle collision with highway barrier. White sedan appears to have lost control. Driver is conscious and moving. Minor debris on roadway. Right two lanes affected.',
  'Single patient, appears ambulatory. Standard trauma protocol.',
  'Traffic control needed for right lanes only.',
  NULL,
  1, 'high',
  '{"condition": "Clear", "temperature": 38, "visibility": "Good"}',
  'Moderate - 2 lanes affected'
),
(
  'INC-2024-003', 'ER-20240521-0010',
  'King Abdullah Road @ Al Muruj District', 24.6901, 46.6697,
  NOW() - INTERVAL '45 minutes',
  'low', 'scene_cleared',
  'Minor fender bender between two vehicles. No visible injuries. Drivers exchanging information. Minimal traffic impact.',
  NULL, NULL, NULL,
  0, 'high',
  '{"condition": "Clear", "temperature": 37, "visibility": "Good"}',
  'Normal flow'
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────
-- INCIDENT PHOTOS
-- ─────────────────────────────────────────
INSERT INTO public.incident_photos (id, incident_id, uri, timestamp, verified) VALUES
  ('photo-001-1', 'INC-2024-001', 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800', NOW(), TRUE),
  ('photo-001-2', 'INC-2024-001', 'https://images.pexels.com/photos/190574/pexels-photo-190574.jpeg?auto=compress&cs=tinysrgb&w=800',   NOW(), TRUE),
  ('photo-001-3', 'INC-2024-001', 'https://images.pexels.com/photos/163016/crash-test-collision-60-km-h-distraction-163016.jpeg?auto=compress&cs=tinysrgb&w=800', NOW(), TRUE),
  ('photo-001-4', 'INC-2024-001', 'https://images.pexels.com/photos/1409999/pexels-photo-1409999.jpeg?auto=compress&cs=tinysrgb&w=800', NOW(), FALSE),
  ('photo-002-1', 'INC-2024-002', 'https://images.pexels.com/photos/5800713/pexels-photo-5800713.jpeg?auto=compress&cs=tinysrgb&w=800', NOW(), TRUE),
  ('photo-002-2', 'INC-2024-002', 'https://images.pexels.com/photos/1445593/pexels-photo-1445593.jpeg?auto=compress&cs=tinysrgb&w=800', NOW(), TRUE),
  ('photo-002-3', 'INC-2024-002', 'https://images.pexels.com/photos/163016/crash-test-collision-60-km-h-distraction-163016.jpeg?auto=compress&cs=tinysrgb&w=800', NOW(), TRUE),
  ('photo-003-1', 'INC-2024-003', 'https://images.pexels.com/photos/1409999/pexels-photo-1409999.jpeg?auto=compress&cs=tinysrgb&w=800', NOW(), TRUE),
  ('photo-003-2', 'INC-2024-003', 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800', NOW(), TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────
-- ACTION LOGS
-- ─────────────────────────────────────────
INSERT INTO public.action_logs (incident_id, timestamp, user_name, action) VALUES
  ('INC-2024-001', NOW() - INTERVAL '2 minutes',   'System',           'Accident detected via AI Camera Analysis at King Fahd Road @ Olaya Junction'),
  ('INC-2024-001', NOW() - INTERVAL '108 seconds', 'System',           'Alert sent to King Faisal Hospital ER, Riyadh Police, Civil Defense'),
  ('INC-2024-001', NOW() - INTERVAL '90 seconds',  'System',           'Alert sent to Najm Dispatch Center'),
  ('INC-2024-002', NOW() - INTERVAL '15 minutes',  'System',           'Accident detected at Northern Ring Road @ Exit 7'),
  ('INC-2024-002', NOW() - INTERVAL '14 minutes',  'System',           'Alert sent to King Faisal Hospital ER'),
  ('INC-2024-002', NOW() - INTERVAL '13 minutes',  'Dr. Sarah Ahmed',  'Alert accepted by King Faisal Hospital ER'),
  ('INC-2024-002', NOW() - INTERVAL '12 minutes',  'System',           'Ambulance Unit 734 dispatched'),
  ('INC-2024-002', NOW() - INTERVAL '8 minutes',   'Police Unit 211',  'Police on scene, establishing traffic control'),
  ('INC-2024-003', NOW() - INTERVAL '45 minutes',  'System',           'Minor accident detected at King Abdullah Road'),
  ('INC-2024-003', NOW() - INTERVAL '44 minutes',  'System',           'Alert sent to Najm Dispatch'),
  ('INC-2024-003', NOW() - INTERVAL '43 minutes',  'Najm Officer',     'Alert acknowledged by Najm Dispatch'),
  ('INC-2024-003', NOW() - INTERVAL '35 minutes',  'Najm Unit 42',     'Najm team on scene, documenting accident'),
  ('INC-2024-003', NOW() - INTERVAL '20 minutes',  'Najm Unit 42',     'Documentation complete, scene cleared'),
  ('INC-2024-003', NOW() - INTERVAL '18 minutes',  'System',           'Incident marked as resolved');

-- ─────────────────────────────────────────
-- DISPATCHED UNITS
-- ─────────────────────────────────────────
INSERT INTO public.dispatched_units (id, incident_id, name, agency, status, dispatched_at, on_scene_at, cleared_at) VALUES
  ('unit-002-1', 'INC-2024-002', 'Ambulance 734',  'King Faisal Hospital', 'en_route', NOW() - INTERVAL '12 minutes', NULL, NULL),
  ('unit-002-2', 'INC-2024-002', 'Police Unit 211','Riyadh Police',        'on_scene', NOW() - INTERVAL '13 minutes', NOW() - INTERVAL '8 minutes', NULL),
  ('unit-003-1', 'INC-2024-003', 'Najm Unit 42',   'Najm Insurance',       'cleared',  NOW() - INTERVAL '43 minutes', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────
-- COLLABORATION MESSAGES
-- ─────────────────────────────────────────
INSERT INTO public.collaboration_messages (incident_id, timestamp, user_name, agency, message) VALUES
  ('INC-2024-002', NOW() - INTERVAL '10 minutes', 'Officer Mohammed Ali', 'Riyadh Police', 'Traffic control established. Right two lanes closed. Requesting tow truck.');

-- ─────────────────────────────────────────
-- AUDIT LOGS (replace user_id UUIDs after creating users)
-- ─────────────────────────────────────────
INSERT INTO public.audit_logs (timestamp, user_name, ip_address, action) VALUES
  (NOW() - INTERVAL '5 minutes',  'admin@system.gov.sa',      '192.168.1.100', 'Created new camera: CAM-005-RUH at Makkah Road'),
  (NOW() - INTERVAL '10 minutes', 'admin@system.gov.sa',      '192.168.1.100', 'Updated user permissions for sarah.ahmed@kfh.gov.sa'),
  (NOW() - INTERVAL '25 minutes', 'system',                   '127.0.0.1',     'System backup completed successfully'),
  (NOW() - INTERVAL '45 minutes', 'admin@system.gov.sa',      '192.168.1.100', 'Acknowledged system maintenance window for next week'),
  (NOW() - INTERVAL '60 minutes', 'sarah.ahmed@kfh.gov.sa',  '192.168.1.105', 'Acknowledged incident ER-20240521-0011');
