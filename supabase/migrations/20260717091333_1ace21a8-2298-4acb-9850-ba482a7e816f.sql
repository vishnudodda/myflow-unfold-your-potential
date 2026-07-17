
CREATE TABLE public.guest_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  education TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  custom_skill TEXT,
  goal TEXT,
  one_liner TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  email TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  completed BOOLEAN NOT NULL DEFAULT true,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.guest_sessions TO anon, authenticated;
GRANT SELECT ON public.guest_sessions TO authenticated;
GRANT ALL ON public.guest_sessions TO service_role;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert guest sessions" ON public.guest_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins can read guest sessions" ON public.guest_sessions
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX guest_sessions_created_at_idx ON public.guest_sessions (created_at DESC);

CREATE TABLE public.admin_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.admin_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.admin_requests TO authenticated;
GRANT ALL ON public.admin_requests TO service_role;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can request admin access" ON public.admin_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read admin requests" ON public.admin_requests
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins update admin requests" ON public.admin_requests
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
