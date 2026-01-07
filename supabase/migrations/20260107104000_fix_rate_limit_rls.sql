-- ============================================================================
-- Security Patch: Fix Rate Limit RLS - 20260107104000_fix_rate_limit_rls.sql
-- ============================================================================
-- Fixes "Table has RLS enabled, but no policies exist" security warning.
-- Adds an explicit policy to allow Support Admins to view rate limits.
-- ============================================================================

CREATE POLICY "rate_limits_admin_select"
ON rate_limits FOR SELECT
USING (is_support_admin());
