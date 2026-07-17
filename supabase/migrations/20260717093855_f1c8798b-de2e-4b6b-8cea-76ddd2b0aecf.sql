
-- Helper: is_admin (any admin flavor)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

-- admin_requests: add full_name
ALTER TABLE public.admin_requests ADD COLUMN IF NOT EXISTS full_name text;

-- Tighten policies: allow anyone (anon+authenticated) to insert a request; only admins read/update/delete
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='admin_requests'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_requests', p.policyname);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_requests TO authenticated;
GRANT INSERT ON public.admin_requests TO anon;
GRANT ALL ON public.admin_requests TO service_role;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can request admin access"
  ON public.admin_requests FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins read all requests"
  ON public.admin_requests FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "admins update requests"
  ON public.admin_requests FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins delete requests"
  ON public.admin_requests FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit logs"
  ON public.admin_audit_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Seed the Primary Super Admin
DO $$
DECLARE new_uid uuid;
BEGIN
  SELECT id INTO new_uid FROM auth.users WHERE email = 'kallerenuka793@gmail.com';
  IF new_uid IS NULL THEN
    new_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated','authenticated',
      'kallerenuka793@gmail.com', crypt('Renu@123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"],"must_reset_password":true}'::jsonb,
      '{"full_name":"Primary Super Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_uid, new_uid::text, jsonb_build_object('sub', new_uid::text, 'email','kallerenuka793@gmail.com'), 'email', now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (new_uid, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
