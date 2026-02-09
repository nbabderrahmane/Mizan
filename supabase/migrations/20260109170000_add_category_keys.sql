-- Migration: Add key column for i18n support on categories and subcategories
-- Keys are canonical identifiers (e.g., 'groceries', 'transport') used for translation

-- Add key to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS key TEXT;

-- Add key to subcategories  
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS key TEXT;

-- Note: Keys are optional. User-created categories will have NULL key and use name directly.
-- System-seeded categories will have keys for i18n translation.
