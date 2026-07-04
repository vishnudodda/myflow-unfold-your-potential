
-- Profile fields for PRD §5 personalization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS work_mode text,
  ADD COLUMN IF NOT EXISTS experience_level text;

-- Opportunity fields for PRD §10.7
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS posted_date date,
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS stipend text,
  ADD COLUMN IF NOT EXISTS required_skills text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS confidence text;

-- Power stats fields for PRD §11
ALTER TABLE public.power_stats
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS is_estimate boolean DEFAULT true;
