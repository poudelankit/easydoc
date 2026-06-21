-- Local-only admin identity. Authenticate by requesting local-mock OTP for this phone.
INSERT INTO users (phone_number, full_name, role, status)
VALUES ('+9779800000001', 'Local Admin', 'ADMIN', 'ACTIVE')
ON CONFLICT (phone_number)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();
