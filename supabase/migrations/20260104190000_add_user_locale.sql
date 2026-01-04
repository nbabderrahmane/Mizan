-- Add locale preference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale VARCHAR(5) DEFAULT 'en';

-- Update existing profiles to 'en'
UPDATE profiles SET locale = 'en' WHERE locale IS NULL;

-- Add a check constraint to ensure we only support certain locales (optional but recommended)
-- ALTER TABLE profiles ADD CONSTRAINT chk_profiles_locale CHECK (locale IN ('en', 'fr'));

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
