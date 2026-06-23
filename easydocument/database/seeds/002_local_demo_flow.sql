-- Local-only EasyDocument demo flow.
-- Run through scripts/seed-local-demo-data.sh so the local-only guard is set.

DO $$
BEGIN
  IF current_setting('app.easydocument_local_demo_seed', true) <> 'true' THEN
    RAISE EXCEPTION 'Refusing to seed demo data without local script guard.';
  END IF;
END $$;

BEGIN;

-- Stable demo IDs for rerunnable local seed data.
DELETE FROM notifications
WHERE id IN (
  '92000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000003',
  '92000000-0000-4000-8000-000000000004',
  '92000000-0000-4000-8000-000000000005',
  '92000000-0000-4000-8000-000000000006',
  '92000000-0000-4000-8000-000000000007',
  '92000000-0000-4000-8000-000000000008'
);

DELETE FROM dispute_mediation_notes
WHERE dispute_id = '87000000-0000-4000-8000-000000000001';
DELETE FROM dispute_status_history
WHERE dispute_id = '87000000-0000-4000-8000-000000000001';
DELETE FROM task_disputes
WHERE id = '87000000-0000-4000-8000-000000000001';
DELETE FROM task_reviews
WHERE id = '88000000-0000-4000-8000-000000000001';
DELETE FROM call_sessions
WHERE id = '85000000-0000-4000-8000-000000000001';
DELETE FROM communication_rooms
WHERE id = '83000000-0000-4000-8000-000000000001'
   OR task_id = '82000000-0000-4000-8000-000000000001';
DELETE FROM task_status_history
WHERE task_id = '82000000-0000-4000-8000-000000000001';
DELETE FROM document_tasks
WHERE id = '82000000-0000-4000-8000-000000000001';
DELETE FROM file_metadata
WHERE id IN (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
)
OR object_key LIKE 'local-demo/%';

INSERT INTO users (phone_number, full_name, address_text, role, status)
VALUES
  ('+9779800000001', 'Local Admin', 'EasyDocument local operations desk', 'ADMIN', 'ACTIVE'),
  ('+9779800000100', 'Sita Demo Customer', 'Kupondole, Lalitpur', 'CUSTOMER', 'ACTIVE'),
  ('+9779800000200', 'Bikash Demo Agent', 'New Baneshwor, Kathmandu', 'AGENT', 'ACTIVE')
ON CONFLICT (phone_number)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  address_text = EXCLUDED.address_text,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO file_metadata (
  id,
  uploaded_by_user_id,
  context,
  object_key,
  original_filename,
  mime_type,
  size_bytes,
  status
)
VALUES
  (
    '81000000-0000-4000-8000-000000000001',
    (SELECT id FROM users WHERE phone_number = '+9779800000200'),
    'KYC',
    'local-demo/kyc/bikash-citizenship-front.jpg',
    'bikash-citizenship-front.jpg',
    'image/jpeg',
    120000,
    'PLACEHOLDER'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    (SELECT id FROM users WHERE phone_number = '+9779800000200'),
    'KYC',
    'local-demo/kyc/bikash-citizenship-back.jpg',
    'bikash-citizenship-back.jpg',
    'image/jpeg',
    118000,
    'PLACEHOLDER'
  ),
  (
    '81000000-0000-4000-8000-000000000003',
    (SELECT id FROM users WHERE phone_number = '+9779800000200'),
    'KYC',
    'local-demo/kyc/bikash-selfie.jpg',
    'bikash-selfie.jpg',
    'image/jpeg',
    99000,
    'PLACEHOLDER'
  ),
  (
    '81000000-0000-4000-8000-000000000004',
    (SELECT id FROM users WHERE phone_number = '+9779800000100'),
    'CHAT_ATTACHMENT',
    'local-demo/chat/cdao-receipt-placeholder.pdf',
    'cdao-receipt-placeholder.pdf',
    'application/pdf',
    42000,
    'PLACEHOLDER'
  )
ON CONFLICT (id)
DO UPDATE SET
  uploaded_by_user_id = EXCLUDED.uploaded_by_user_id,
  context = EXCLUDED.context,
  object_key = EXCLUDED.object_key,
  original_filename = EXCLUDED.original_filename,
  mime_type = EXCLUDED.mime_type,
  size_bytes = EXCLUDED.size_bytes,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO agent_profiles (
  id,
  user_id,
  citizenship_number,
  citizenship_front_url,
  citizenship_back_url,
  selfie_url,
  permanent_address_text,
  permanent_location,
  current_location,
  status,
  verification_notes,
  average_rating,
  completed_task_count,
  cancelled_task_count,
  is_available,
  verification_decision,
  verification_decided_by_user_id,
  verification_decided_at,
  verification_rejection_reason
)
VALUES (
  '80000000-0000-4000-8000-000000000001',
  (SELECT id FROM users WHERE phone_number = '+9779800000200'),
  'DEMO-KTM-2040',
  'local-demo/kyc/bikash-citizenship-front.jpg',
  'local-demo/kyc/bikash-citizenship-back.jpg',
  'local-demo/kyc/bikash-selfie.jpg',
  'New Baneshwor, Kathmandu',
  ST_SetSRID(ST_MakePoint(85.3420, 27.6906), 4326)::geography,
  ST_SetSRID(ST_MakePoint(85.3420, 27.6906), 4326)::geography,
  'VERIFIED',
  'Local demo verified agent near Kathmandu.',
  4.75,
  1,
  0,
  TRUE,
  'APPROVED',
  (SELECT id FROM users WHERE phone_number = '+9779800000001'),
  NOW() - INTERVAL '9 days',
  NULL
)
ON CONFLICT (user_id)
DO UPDATE SET
  citizenship_number = EXCLUDED.citizenship_number,
  citizenship_front_url = EXCLUDED.citizenship_front_url,
  citizenship_back_url = EXCLUDED.citizenship_back_url,
  selfie_url = EXCLUDED.selfie_url,
  permanent_address_text = EXCLUDED.permanent_address_text,
  permanent_location = EXCLUDED.permanent_location,
  current_location = EXCLUDED.current_location,
  status = EXCLUDED.status,
  verification_notes = EXCLUDED.verification_notes,
  average_rating = EXCLUDED.average_rating,
  completed_task_count = EXCLUDED.completed_task_count,
  cancelled_task_count = EXCLUDED.cancelled_task_count,
  is_available = EXCLUDED.is_available,
  verification_decision = EXCLUDED.verification_decision,
  verification_decided_by_user_id = EXCLUDED.verification_decided_by_user_id,
  verification_decided_at = EXCLUDED.verification_decided_at,
  verification_rejection_reason = EXCLUDED.verification_rejection_reason,
  updated_at = NOW();

INSERT INTO agent_service_tags (agent_id, tag)
VALUES
  ((SELECT id FROM agent_profiles WHERE user_id = (SELECT id FROM users WHERE phone_number = '+9779800000200')), 'citizenship'),
  ((SELECT id FROM agent_profiles WHERE user_id = (SELECT id FROM users WHERE phone_number = '+9779800000200')), 'government-office')
ON CONFLICT (agent_id, tag) DO NOTHING;

INSERT INTO document_tasks (
  id,
  customer_user_id,
  assigned_agent_user_id,
  task_name,
  document_type,
  organization_name,
  organization_address,
  organization_location,
  request_description,
  status,
  accepted_at,
  expected_completion_date,
  created_at,
  updated_at
)
VALUES (
  '82000000-0000-4000-8000-000000000001',
  (SELECT id FROM users WHERE phone_number = '+9779800000100'),
  (SELECT id FROM users WHERE phone_number = '+9779800000200'),
  'SITA DEMO CUSTOMER-CITIZENSHIP-CDAO KATHMANDU',
  'CITIZENSHIP',
  'CDAO KATHMANDU',
  'Babarmahal, Kathmandu',
  ST_SetSRID(ST_MakePoint(85.3220, 27.6964), 4326)::geography,
  'Local demo request for citizenship document collection and delivery.',
  'COMPLETED',
  NOW() - INTERVAL '8 days',
  CURRENT_DATE + INTERVAL '2 days',
  NOW() - INTERVAL '9 days',
  NOW() - INTERVAL '1 day'
);

INSERT INTO communication_rooms (
  id,
  task_id,
  customer_user_id,
  agent_user_id,
  created_at,
  updated_at
)
VALUES (
  '83000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  (SELECT id FROM users WHERE phone_number = '+9779800000100'),
  (SELECT id FROM users WHERE phone_number = '+9779800000200'),
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '6 days'
);

INSERT INTO communication_messages (
  id,
  room_id,
  sender_user_id,
  body,
  message_type,
  created_at
)
VALUES
  (
    '84000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    (SELECT id FROM users WHERE phone_number = '+9779800000100'),
    'Namaste, please keep me updated when you visit CDAO.',
    'TEXT',
    NOW() - INTERVAL '7 days 23 hours'
  ),
  (
    '84000000-0000-4000-8000-000000000002',
    '83000000-0000-4000-8000-000000000001',
    (SELECT id FROM users WHERE phone_number = '+9779800000200'),
    'Namaste, I accepted the task and attached the receipt placeholder.',
    'TEXT',
    NOW() - INTERVAL '7 days 22 hours'
  );

INSERT INTO communication_message_reads (message_id, user_id, read_at)
VALUES
  ('84000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000100'), NOW() - INTERVAL '7 days 23 hours'),
  ('84000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000200'), NOW() - INTERVAL '7 days 22 hours 50 minutes'),
  ('84000000-0000-4000-8000-000000000002', (SELECT id FROM users WHERE phone_number = '+9779800000200'), NOW() - INTERVAL '7 days 22 hours'),
  ('84000000-0000-4000-8000-000000000002', (SELECT id FROM users WHERE phone_number = '+9779800000100'), NOW() - INTERVAL '7 days 21 hours')
ON CONFLICT (message_id, user_id)
DO UPDATE SET read_at = EXCLUDED.read_at;

INSERT INTO communication_attachments (
  id,
  room_id,
  uploaded_by_user_id,
  file_metadata_id,
  attachment_type,
  created_at
)
VALUES (
  '86000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001',
  (SELECT id FROM users WHERE phone_number = '+9779800000200'),
  '81000000-0000-4000-8000-000000000004',
  'DOCUMENT',
  NOW() - INTERVAL '7 days 22 hours'
);

INSERT INTO communication_message_attachments (
  message_id,
  attachment_id,
  created_at
)
VALUES (
  '84000000-0000-4000-8000-000000000002',
  '86000000-0000-4000-8000-000000000001',
  NOW() - INTERVAL '7 days 22 hours'
)
ON CONFLICT (message_id, attachment_id) DO NOTHING;

INSERT INTO call_sessions (
  id,
  task_id,
  room_id,
  initiated_by_user_id,
  call_type,
  status,
  started_at,
  accepted_at,
  ended_at,
  created_at,
  updated_at
)
VALUES (
  '85000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001',
  (SELECT id FROM users WHERE phone_number = '+9779800000100'),
  'AUDIO',
  'ENDED',
  NOW() - INTERVAL '7 days 20 hours',
  NOW() - INTERVAL '7 days 19 hours 59 minutes',
  NOW() - INTERVAL '7 days 19 hours 53 minutes',
  NOW() - INTERVAL '7 days 20 hours',
  NOW() - INTERVAL '7 days 19 hours 53 minutes'
);

INSERT INTO call_status_history (
  id,
  call_session_id,
  task_id,
  actor_user_id,
  actor_role,
  from_status,
  to_status,
  note,
  signaling_event,
  created_at
)
VALUES
  (
    '85100000-0000-4000-8000-000000000001',
    '85000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    (SELECT id FROM users WHERE phone_number = '+9779800000100'),
    'CUSTOMER',
    NULL,
    'REQUESTED',
    'Customer requested a quick audio call.',
    'call:request',
    NOW() - INTERVAL '7 days 20 hours'
  ),
  (
    '85100000-0000-4000-8000-000000000002',
    '85000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    (SELECT id FROM users WHERE phone_number = '+9779800000200'),
    'AGENT',
    'REQUESTED',
    'ACCEPTED',
    'Agent accepted the audio call.',
    'call:accept',
    NOW() - INTERVAL '7 days 19 hours 59 minutes'
  ),
  (
    '85100000-0000-4000-8000-000000000003',
    '85000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    (SELECT id FROM users WHERE phone_number = '+9779800000100'),
    'CUSTOMER',
    'ACCEPTED',
    'ENDED',
    'Call ended after confirming next steps.',
    'call:end',
    NOW() - INTERVAL '7 days 19 hours 53 minutes'
  );

INSERT INTO task_status_history (
  id,
  task_id,
  actor_user_id,
  actor_role,
  event_type,
  from_status,
  to_status,
  note,
  expected_completion_date,
  created_at
)
VALUES
  ('89000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000100'), 'CUSTOMER', 'STATUS_CHANGE', NULL, 'CREATED', 'Task created by customer.', NULL, NOW() - INTERVAL '9 days'),
  ('89000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'AGENT', 'STATUS_CHANGE', 'CREATED', 'ACCEPTED', 'Agent accepted nearby Kathmandu request.', NULL, NOW() - INTERVAL '8 days'),
  ('89000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000100'), 'CUSTOMER', 'STATUS_CHANGE', 'ACCEPTED', 'DEAL_CONFIRMED', 'Customer confirmed the deal.', NULL, NOW() - INTERVAL '7 days 21 hours'),
  ('89000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'AGENT', 'EXPECTED_DATE_UPDATED', 'DEAL_CONFIRMED', 'DEAL_CONFIRMED', 'Expected delivery date set.', CURRENT_DATE + INTERVAL '2 days', NOW() - INTERVAL '7 days 20 hours'),
  ('89000000-0000-4000-8000-000000000005', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'AGENT', 'STATUS_CHANGE', 'DEAL_CONFIRMED', 'IN_PROGRESS', 'Office work started.', NULL, NOW() - INTERVAL '7 days 18 hours'),
  ('89000000-0000-4000-8000-000000000006', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'AGENT', 'STATUS_CHANGE', 'IN_PROGRESS', 'DOCUMENT_REQUESTED', 'Requested supporting copy at CDAO.', NULL, NOW() - INTERVAL '6 days'),
  ('89000000-0000-4000-8000-000000000007', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'AGENT', 'STATUS_CHANGE', 'DOCUMENT_REQUESTED', 'VISITED_ORGANIZATION', 'Visited CDAO Kathmandu.', NULL, NOW() - INTERVAL '5 days'),
  ('89000000-0000-4000-8000-000000000008', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'AGENT', 'STATUS_CHANGE', 'VISITED_ORGANIZATION', 'DOCUMENT_COLLECTED', 'Document collected successfully.', NULL, NOW() - INTERVAL '4 days'),
  ('89000000-0000-4000-8000-000000000009', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'AGENT', 'STATUS_CHANGE', 'DOCUMENT_COLLECTED', 'READY_FOR_DELIVERY', 'Ready for delivery.', NULL, NOW() - INTERVAL '3 days'),
  ('89000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'AGENT', 'STATUS_CHANGE', 'READY_FOR_DELIVERY', 'DELIVERED', 'Delivered to customer.', NULL, NOW() - INTERVAL '2 days'),
  ('89000000-0000-4000-8000-000000000011', '82000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000100'), 'CUSTOMER', 'STATUS_CHANGE', 'DELIVERED', 'COMPLETED', 'Customer completed the task.', NULL, NOW() - INTERVAL '1 day');

INSERT INTO task_disputes (
  id,
  task_id,
  customer_user_id,
  agent_user_id,
  room_id,
  reason,
  description,
  opened_by_user_id,
  opened_by_role,
  status,
  resolution_summary,
  resolved_by_admin_user_id,
  resolved_at,
  created_at,
  updated_at
)
VALUES (
  '87000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  (SELECT id FROM users WHERE phone_number = '+9779800000100'),
  (SELECT id FROM users WHERE phone_number = '+9779800000200'),
  '83000000-0000-4000-8000-000000000001',
  'Timing clarification',
  'Customer asked admin to confirm whether the CDAO visit was still on schedule.',
  (SELECT id FROM users WHERE phone_number = '+9779800000100'),
  'CUSTOMER',
  'RESOLVED',
  'Admin confirmed the agent had visited CDAO and the task continued normally.',
  (SELECT id FROM users WHERE phone_number = '+9779800000001'),
  NOW() - INTERVAL '4 days 12 hours',
  NOW() - INTERVAL '5 days 12 hours',
  NOW() - INTERVAL '4 days 12 hours'
);

INSERT INTO dispute_status_history (
  id,
  dispute_id,
  actor_user_id,
  actor_role,
  old_status,
  new_status,
  note,
  created_at
)
VALUES
  ('87100000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000100'), 'CUSTOMER', NULL, 'OPEN', 'Customer opened timing clarification.', NOW() - INTERVAL '5 days 12 hours'),
  ('87100000-0000-4000-8000-000000000002', '87000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000001'), 'ADMIN', 'OPEN', 'UNDER_REVIEW', 'Admin reviewed task timeline and communication audit.', NOW() - INTERVAL '5 days 6 hours'),
  ('87100000-0000-4000-8000-000000000003', '87000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000001'), 'ADMIN', 'UNDER_REVIEW', 'RESOLVED', 'Resolved after confirming the visit.', NOW() - INTERVAL '4 days 12 hours');

INSERT INTO dispute_mediation_notes (
  id,
  dispute_id,
  admin_user_id,
  note,
  created_at
)
VALUES (
  '87200000-0000-4000-8000-000000000001',
  '87000000-0000-4000-8000-000000000001',
  (SELECT id FROM users WHERE phone_number = '+9779800000001'),
  'Local demo internal note: checked timeline and communication metadata only.',
  NOW() - INTERVAL '5 days'
);

INSERT INTO task_reviews (
  id,
  task_id,
  customer_user_id,
  agent_user_id,
  overall_rating,
  communication_rating,
  timeliness_rating,
  professionalism_rating,
  review_text,
  created_at,
  updated_at
)
VALUES (
  '88000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  (SELECT id FROM users WHERE phone_number = '+9779800000100'),
  (SELECT id FROM users WHERE phone_number = '+9779800000200'),
  5,
  5,
  4,
  5,
  'Clear communication, careful handling, and a smooth local demo delivery.',
  NOW() - INTERVAL '20 hours',
  NOW() - INTERVAL '20 hours'
);

INSERT INTO notifications (
  id,
  recipient_user_id,
  actor_user_id,
  type,
  delivery_channel,
  title,
  body,
  related_task_id,
  related_dispute_id,
  related_review_id,
  read_at,
  created_at
)
VALUES
  ('92000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE phone_number = '+9779800000100'), (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'TASK_ACCEPTED', 'IN_APP', 'Task accepted', 'Bikash Demo Agent accepted your CDAO task.', '82000000-0000-4000-8000-000000000001', NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '8 days'),
  ('92000000-0000-4000-8000-000000000002', (SELECT id FROM users WHERE phone_number = '+9779800000200'), (SELECT id FROM users WHERE phone_number = '+9779800000100'), 'DEAL_CONFIRMED', 'IN_APP', 'Deal confirmed', 'Sita Demo Customer confirmed the deal.', '82000000-0000-4000-8000-000000000001', NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days 21 hours'),
  ('92000000-0000-4000-8000-000000000003', (SELECT id FROM users WHERE phone_number = '+9779800000100'), (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'MESSAGE_RECEIVED', 'IN_APP', 'New message', 'Your demo task has a new message.', '82000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NOW() - INTERVAL '7 days 22 hours'),
  ('92000000-0000-4000-8000-000000000004', (SELECT id FROM users WHERE phone_number = '+9779800000100'), (SELECT id FROM users WHERE phone_number = '+9779800000200'), 'ATTACHMENT_RECEIVED', 'IN_APP', 'New attachment', 'A receipt placeholder was added.', '82000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NOW() - INTERVAL '7 days 22 hours'),
  ('92000000-0000-4000-8000-000000000005', (SELECT id FROM users WHERE phone_number = '+9779800000200'), (SELECT id FROM users WHERE phone_number = '+9779800000100'), 'CALL_REQUESTED', 'IN_APP', 'Call requested', 'Customer requested an audio call.', '82000000-0000-4000-8000-000000000001', NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days 20 hours'),
  ('92000000-0000-4000-8000-000000000006', (SELECT id FROM users WHERE phone_number = '+9779800000001'), (SELECT id FROM users WHERE phone_number = '+9779800000100'), 'DISPUTE_OPENED', 'IN_APP', 'Dispute opened', 'A local demo timing clarification was opened.', '82000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', NULL, NULL, NOW() - INTERVAL '5 days 12 hours'),
  ('92000000-0000-4000-8000-000000000007', (SELECT id FROM users WHERE phone_number = '+9779800000100'), (SELECT id FROM users WHERE phone_number = '+9779800000001'), 'DISPUTE_RESOLVED', 'IN_APP', 'Dispute resolved', 'Admin resolved the timing clarification.', '82000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', NULL, NULL, NOW() - INTERVAL '4 days 12 hours'),
  ('92000000-0000-4000-8000-000000000008', (SELECT id FROM users WHERE phone_number = '+9779800000200'), (SELECT id FROM users WHERE phone_number = '+9779800000100'), 'REVIEW_RECEIVED', 'IN_APP', 'New review received', 'You received a 5-star local demo review.', '82000000-0000-4000-8000-000000000001', NULL, '88000000-0000-4000-8000-000000000001', NULL, NOW() - INTERVAL '20 hours');

COMMIT;

SELECT
  'EasyDocument local demo seed complete' AS result,
  '+9779800000100' AS customer_phone,
  '+9779800000200' AS agent_phone,
  '+9779800000001' AS admin_phone,
  '123456' AS local_mock_otp,
  '82000000-0000-4000-8000-000000000001' AS task_id,
  '87000000-0000-4000-8000-000000000001' AS dispute_id,
  '88000000-0000-4000-8000-000000000001' AS review_id;
