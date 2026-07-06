CREATE POLICY "questions anon read" ON public.questions FOR SELECT TO anon USING (true);
CREATE POLICY "options anon read" ON public.question_options FOR SELECT TO anon USING (true);
GRANT SELECT ON public.questions TO anon;
GRANT SELECT ON public.question_options TO anon;