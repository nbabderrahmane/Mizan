-- ============================================================================
-- Security Patch: Secure updated_at Trigger - 20260107101500_secure_updated_at.sql
-- ============================================================================
-- Fixes "Function has a role mutable search_path" security warning.
-- Forces the function to execute with a fixed search_path (public).
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
