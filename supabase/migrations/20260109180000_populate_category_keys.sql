-- Script SQL pour mettre à jour les données existantes avec les clés i18n
-- Exécuter dans Supabase SQL Editor

-- ==========================================
-- 1. METTRE À JOUR LES CATÉGORIES
-- ==========================================
UPDATE categories SET key = 'essentials' WHERE name ILIKE '%Essential%' AND key IS NULL;
UPDATE categories SET key = 'lifestyle' WHERE name ILIKE '%Lifestyle%' AND key IS NULL;
UPDATE categories SET key = 'income' WHERE name ILIKE '%Income%' AND key IS NULL;
UPDATE categories SET key = 'financial' WHERE name ILIKE '%Financial%' AND key IS NULL;
UPDATE categories SET key = 'misc' WHERE name ILIKE '%Misc%' AND key IS NULL;

-- ==========================================
-- 2. METTRE À JOUR LES SOUS-CATÉGORIES
-- ==========================================

-- Essentials
UPDATE subcategories SET key = 'home' WHERE name ILIKE '%Home%' AND key IS NULL;
UPDATE subcategories SET key = 'rent' WHERE (name ILIKE '%Rent%' OR name ILIKE '%Mortgage%') AND key IS NULL;
UPDATE subcategories SET key = 'groceries' WHERE name ILIKE '%Groceries%' AND key IS NULL;
UPDATE subcategories SET key = 'food' WHERE name ILIKE '%Food%' AND key IS NULL;
UPDATE subcategories SET key = 'transport' WHERE (name ILIKE '%Transport%') AND key IS NULL;
UPDATE subcategories SET key = 'utilities' WHERE (name ILIKE '%Utilities%' OR name ILIKE '%Internet%') AND key IS NULL;
UPDATE subcategories SET key = 'health' WHERE name ILIKE '%Health%' AND key IS NULL;

-- Lifestyle
UPDATE subcategories SET key = 'eating_out' WHERE (name ILIKE '%Eating Out%' OR name ILIKE '%Restaurant%') AND key IS NULL;
UPDATE subcategories SET key = 'subscriptions' WHERE name ILIKE '%Subscription%' AND key IS NULL;
UPDATE subcategories SET key = 'entertainment' WHERE name ILIKE '%Entertainment%' AND key IS NULL;
UPDATE subcategories SET key = 'shopping' WHERE name ILIKE '%Shopping%' AND key IS NULL;
UPDATE subcategories SET key = 'holidays' WHERE (name ILIKE '%Holiday%' OR name ILIKE '%Vacation%') AND key IS NULL;
UPDATE subcategories SET key = 'hobbies' WHERE (name ILIKE '%Hobbies%' OR name ILIKE '%Hobby%' OR name ILIKE '%Loisirs%') AND key IS NULL;
UPDATE subcategories SET key = 'other' WHERE (name ILIKE '%Other%' OR name ILIKE '%Autre%') AND key IS NULL;

-- Financial
UPDATE subcategories SET key = 'debt' WHERE (name ILIKE '%Debt%' OR name ILIKE '%Loan%') AND key IS NULL;
UPDATE subcategories SET key = 'savings' WHERE name ILIKE '%Saving%' AND key IS NULL;
UPDATE subcategories SET key = 'investments' WHERE name ILIKE '%Investment%' AND key IS NULL;

-- Income
UPDATE subcategories SET key = 'salary' WHERE name ILIKE '%Salary%' AND key IS NULL;
UPDATE subcategories SET key = 'freelance' WHERE name ILIKE '%Freelance%' AND key IS NULL;
UPDATE subcategories SET key = 'dividends' WHERE name ILIKE '%Dividend%' AND key IS NULL;
UPDATE subcategories SET key = 'gifts' WHERE (name ILIKE '%Gift%' OR name ILIKE '%Cadeau%') AND key IS NULL;
UPDATE subcategories SET key = 'refunds' WHERE (name ILIKE '%Refund%' OR name ILIKE '%Remboursement%') AND key IS NULL;

-- Misc
UPDATE subcategories SET key = 'misc' WHERE (name ILIKE '%Misc%' OR name ILIKE '%Buffer%' OR name ILIKE '%Divers%') AND key IS NULL;

-- ==========================================
-- 3. VÉRIFICATION
-- ==========================================
SELECT 'Categories avec key' as info, count(*) FROM categories WHERE key IS NOT NULL;
SELECT 'Categories sans key' as info, count(*) FROM categories WHERE key IS NULL;
SELECT 'Subcategories avec key' as info, count(*) FROM subcategories WHERE key IS NOT NULL;
SELECT 'Subcategories sans key' as info, count(*) FROM subcategories WHERE key IS NULL;

-- Voir les sous-catégories sans key (à traiter manuellement si besoin)
SELECT id, name, key FROM subcategories WHERE key IS NULL;
