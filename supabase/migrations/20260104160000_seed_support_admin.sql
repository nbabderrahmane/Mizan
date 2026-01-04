-- Seed the SUPPORT_ADMIN role for the specific user
-- UUID provided: b8e37f5e-b3ba-46dd-90e7-e6d479bbe357

INSERT INTO app_admins (user_id, role)
VALUES ('b8e37f5e-b3ba-46dd-90e7-e6d479bbe357', 'SUPPORT_ADMIN')
ON CONFLICT (user_id) DO UPDATE
SET role = 'SUPPORT_ADMIN';
