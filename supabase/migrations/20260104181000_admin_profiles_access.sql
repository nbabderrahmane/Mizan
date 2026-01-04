DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

CREATE POLICY "profiles_select_admin"
ON profiles FOR SELECT
USING (is_support_admin());
