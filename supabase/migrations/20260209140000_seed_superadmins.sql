-- Seed Superadmins / Support Admins
-- Users: abderrahmanenaciribennani@gmail.com, naciribennani.abderrahmane@gmail.com

DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
BEGIN
    -- 1. Find User IDs from auth.users
    SELECT id INTO user1_id FROM auth.users WHERE email = 'abderrahmanenaciribennani@gmail.com';
    SELECT id INTO user2_id FROM auth.users WHERE email = 'naciribennani.abderrahmane@gmail.com';

    -- 2. Insert or Update User 1
    IF user1_id IS NOT NULL THEN
        RAISE NOTICE 'Seeding admin: abderrahmanenaciribennani@gmail.com (ID: %)', user1_id;
        INSERT INTO public.app_admins (user_id, role)
        VALUES (user1_id, 'SUPPORT_ADMIN')
        ON CONFLICT (user_id) DO UPDATE SET role = 'SUPPORT_ADMIN';
    ELSE
        RAISE NOTICE 'User not found: abderrahmanenaciribennani@gmail.com';
    END IF;

    -- 3. Insert or Update User 2
    IF user2_id IS NOT NULL THEN
        RAISE NOTICE 'Seeding admin: naciribennani.abderrahmane@gmail.com (ID: %)', user2_id;
        INSERT INTO public.app_admins (user_id, role)
        VALUES (user2_id, 'SUPPORT_ADMIN')
        ON CONFLICT (user_id) DO UPDATE SET role = 'SUPPORT_ADMIN';
    ELSE
        RAISE NOTICE 'User not found: naciribennani.abderrahmane@gmail.com';
    END IF;

END $$;
