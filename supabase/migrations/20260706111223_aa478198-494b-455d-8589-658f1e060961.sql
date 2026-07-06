
CREATE TABLE public.industry_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  statistic TEXT NOT NULL,
  source_name TEXT NOT NULL,
  publication_year INT NOT NULL,
  source_url TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT ARRAY['general']::TEXT[],
  icon TEXT,
  last_verified DATE NOT NULL DEFAULT CURRENT_DATE,
  sort_weight INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.industry_insights TO anon, authenticated;
GRANT ALL ON public.industry_insights TO service_role;

ALTER TABLE public.industry_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "industry_insights public read"
  ON public.industry_insights FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.industry_insights
  (title, description, statistic, source_name, publication_year, source_url, categories, icon)
VALUES
  (
    'Core skills are shifting fast',
    '44% of workers'' core skills are expected to change in the next five years — continuous learning is now table stakes.',
    '44%',
    'World Economic Forum — Future of Jobs Report',
    2023,
    'https://www.weforum.org/publications/the-future-of-jobs-report-2023/',
    ARRAY['general','skills','learning','career-compass','unlock-potential','purpose-ambition'],
    'trending-up'
  ),
  (
    'Analytical thinking leads the pack',
    'Analytical thinking is ranked the #1 core skill by employers, followed closely by creative thinking.',
    '#1',
    'World Economic Forum — Future of Jobs Report',
    2023,
    'https://www.weforum.org/publications/the-future-of-jobs-report-2023/',
    ARRAY['general','skills','deep-insights','self-identity','values-mindset'],
    'brain'
  ),
  (
    'Reskilling is the near-term reality',
    '6 in 10 workers will need training before 2027 — but only half currently have access to adequate learning opportunities.',
    '60%',
    'World Economic Forum — Future of Jobs Report',
    2023,
    'https://www.weforum.org/publications/the-future-of-jobs-report-2023/',
    ARRAY['general','learning','career','career-discovery','unlock-potential'],
    'graduation-cap'
  ),
  (
    'AI is already in daily work',
    '75% of knowledge workers report using generative AI at work — nearly half started in the last six months.',
    '75%',
    'Microsoft & LinkedIn — Work Trend Index Annual Report',
    2024,
    'https://www.microsoft.com/en-us/worklab/work-trend-index/ai-at-work-is-here-now-comes-the-hard-part',
    ARRAY['general','tech','ai','career-compass','purpose-ambition'],
    'sparkles'
  ),
  (
    'Generative AI could reshape the economy',
    'Generative AI could add $2.6–$4.4 trillion annually to the global economy — the equivalent of adding a new UK to world GDP.',
    '$4.4T',
    'McKinsey Global Institute',
    2023,
    'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier',
    ARRAY['general','tech','ai','career','purpose-ambition','career-compass'],
    'dollar-sign'
  ),
  (
    'The job skillset is rewriting itself',
    'The skills needed for the average job have already changed ~25% since 2015 and are projected to change 65% by 2030.',
    '65%',
    'LinkedIn Economic Graph — Future of Work Report',
    2023,
    'https://economicgraph.linkedin.com/research',
    ARRAY['general','skills','career','learning','career-discovery','unlock-potential'],
    'refresh-cw'
  ),
  (
    'Automation exposure is uneven',
    'About 27% of jobs across OECD countries rely on skills that could be highly automated in the coming years.',
    '27%',
    'OECD Employment Outlook',
    2023,
    'https://www.oecd.org/en/publications/oecd-employment-outlook-2023_08785bba-en.html',
    ARRAY['general','career','tech','career-compass','deep-insights'],
    'cpu'
  ),
  (
    'Employers rank people-skills highest',
    'Employers now rank problem-solving, teamwork, and communication among the top skills sought in new hires — above most technical skills.',
    'Top 3',
    'World Economic Forum — Future of Jobs Report',
    2023,
    'https://www.weforum.org/publications/the-future-of-jobs-report-2023/',
    ARRAY['general','skills','self-identity','values-mindset','career-discovery'],
    'users'
  );
