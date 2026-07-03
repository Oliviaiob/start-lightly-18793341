
-- 1. Rewrite RLS policies that use USING (true) or WITH CHECK (true) for non-SELECT commands
-- Replace `true` with `auth.uid() IS NOT NULL` so only authenticated sessions match.
DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  cmd_kw TEXT;
  roles_txt TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check, roles, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd <> 'SELECT'
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    new_qual  := CASE WHEN r.qual  = 'true' THEN 'auth.uid() IS NOT NULL' ELSE r.qual END;
    new_check := CASE WHEN r.with_check = 'true' THEN 'auth.uid() IS NOT NULL' ELSE r.with_check END;

    cmd_kw := CASE r.cmd
      WHEN 'ALL' THEN 'ALL'
      WHEN 'SELECT' THEN 'SELECT'
      WHEN 'INSERT' THEN 'INSERT'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
    END;

    roles_txt := array_to_string(r.roles, ', ');

    EXECUTE format('DROP POLICY %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      r.policyname,
      r.schemaname,
      r.tablename,
      r.permissive,
      cmd_kw,
      roles_txt,
      CASE WHEN new_qual  IS NOT NULL THEN ' USING (' || new_qual  || ')' ELSE '' END,
      CASE WHEN new_check IS NOT NULL THEN ' WITH CHECK (' || new_check || ')' ELSE '' END
    );
  END LOOP;
END $$;

-- 2. Lock down SECURITY DEFINER functions.
-- Trigger functions never need direct EXECUTE from client roles.
REVOKE EXECUTE ON FUNCTION public.sync_profile_role_to_user_roles()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_default_admin_role()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_created_by_from_auth()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_email()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_change()  FROM PUBLIC, anon, authenticated;

-- has_role is invoked from RLS policies; authenticated must retain EXECUTE. Revoke from anon/public only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
