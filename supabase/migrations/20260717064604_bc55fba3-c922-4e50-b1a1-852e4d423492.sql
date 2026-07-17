
CREATE TABLE public.future_letters (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  letter text not null,
  years integer not null check (years in (1,3,5)),
  deliver_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
GRANT INSERT ON public.future_letters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.future_letters TO authenticated;
GRANT ALL ON public.future_letters TO service_role;
ALTER TABLE public.future_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert a future letter" ON public.future_letters FOR INSERT TO anon, authenticated WITH CHECK (true);
