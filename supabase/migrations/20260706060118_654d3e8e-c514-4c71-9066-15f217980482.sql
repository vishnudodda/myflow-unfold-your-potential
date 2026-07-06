
-- 1) Move has_role out of the public (API-exposed) schema into a private schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Rewrite the only policy that referenced public.has_role
DROP POLICY IF EXISTS "prompts admin only" ON public.ai_prompts;
CREATE POLICY "prompts admin only" ON public.ai_prompts
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- Drop the public wrapper so it is no longer callable via the API
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 2) Hide question_options.trait_weights from regular clients (column-level grants)
REVOKE SELECT ON public.question_options FROM authenticated, anon;
GRANT SELECT (id, question_id, label, value, sort_order) ON public.question_options TO authenticated;
-- service_role keeps full access via existing GRANT ALL

-- 3) Explicit restrictive policies on user_roles: block self-writes
CREATE POLICY "no self insert user_roles" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "no self update user_roles" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "no self delete user_roles" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated, anon
  USING (false);
