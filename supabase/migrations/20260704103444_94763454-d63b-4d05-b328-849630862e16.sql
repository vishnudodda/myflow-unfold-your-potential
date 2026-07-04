
CREATE TABLE public.traits (
  slug text PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_seed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.traits TO anon, authenticated;
GRANT ALL ON public.traits TO service_role;
ALTER TABLE public.traits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read traits" ON public.traits FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.question_option_traits (
  option_id uuid NOT NULL REFERENCES public.question_options(id) ON DELETE CASCADE,
  trait_slug text NOT NULL REFERENCES public.traits(slug) ON DELETE CASCADE,
  weight smallint NOT NULL CHECK (weight BETWEEN -3 AND 3),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (option_id, trait_slug)
);
GRANT SELECT ON public.question_option_traits TO anon, authenticated;
GRANT ALL ON public.question_option_traits TO service_role;
ALTER TABLE public.question_option_traits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read qot" ON public.question_option_traits FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.question_reasoning (
  question_id uuid PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  primary_trait text REFERENCES public.traits(slug),
  secondary_traits text[] NOT NULL DEFAULT '{}',
  dimensions text[] NOT NULL DEFAULT '{}',
  frameworks jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_note text,
  contributions jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_improvements text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_reasoning TO anon, authenticated;
GRANT ALL ON public.question_reasoning TO service_role;
ALTER TABLE public.question_reasoning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read qr" ON public.question_reasoning FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER trg_qr_updated BEFORE UPDATE ON public.question_reasoning FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.traits (slug, name, description, is_seed) VALUES
  ('creativity','Creativity','Generates novel ideas and original solutions',true),
  ('leadership','Leadership','Guides, influences, and mobilizes others',true),
  ('curiosity','Curiosity','Seeks to explore, learn, and understand',true),
  ('confidence','Confidence','Self-belief in ability to act and decide',true),
  ('emotional_intelligence','Emotional Intelligence','Understands and manages own and others'' emotions',true),
  ('adaptability','Adaptability','Adjusts effectively to change and ambiguity',true),
  ('growth_mindset','Growth Mindset','Belief that ability grows through effort',true),
  ('communication','Communication','Clarity in expressing and exchanging ideas',true),
  ('teamwork','Teamwork','Collaborates effectively with others',true),
  ('discipline','Discipline','Sustains effort and structure over time',true),
  ('resilience','Resilience','Recovers and persists through setbacks',true),
  ('risk_taking','Risk Taking','Willingness to act under uncertainty',true),
  ('decision_making','Decision Making','Chooses well among alternatives',true),
  ('critical_thinking','Critical Thinking','Evaluates evidence and reasoning',true),
  ('analytical_thinking','Analytical Thinking','Breaks problems into components',true),
  ('learning_agility','Learning Agility','Learns fast and applies new knowledge',true),
  ('time_management','Time Management','Allocates time to what matters',true),
  ('goal_orientation','Goal Orientation','Sets and pursues clear objectives',true),
  ('self_awareness','Self Awareness','Accurate insight into self',true),
  ('financial_intelligence','Financial Intelligence','Understands money and value',true),
  ('empathy','Empathy','Perceives and shares others'' feelings',true),
  ('problem_solving','Problem Solving','Finds workable answers to challenges',true),
  ('reflectiveness','Reflectiveness','Pauses to consider before acting',true),
  ('initiative','Initiative','Starts action without prompting',true),
  ('sociability','Sociability','Draws energy from social contact',true),
  ('altruism','Altruism','Motivated to benefit others',true),
  ('achievement_drive','Achievement Drive','Seeks accomplishment and recognition',true),
  ('openness','Openness','Open to new experiences and ideas',true),
  ('agreeableness','Agreeableness','Warm, cooperative disposition',true),
  ('authenticity','Authenticity','Consistency between inner self and outward behavior',true);
