import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { analyzeAssessment } from "@/lib/assessments.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assessments/$slug")({
  head: () => ({ meta: [{ title: "Assessment — MyFlow" }] }),
  component: AssessmentPage,
});

type Q = {
  id: string;
  text: string;
  sort_order: number;
  question_options: { id: string; label: string; sort_order: number }[];
};

function AssessmentPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeAssessment);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase.from("assessments").select("id, title").eq("slug", slug).maybeSingle();
      if (!a) return;
      setAssessmentId(a.id);
      setTitle(a.title);
      const { data: qs } = await supabase
        .from("questions")
        .select("id, text, sort_order, question_options(id, label, sort_order)")
        .eq("assessment_id", a.id)
        .order("sort_order");
      const sorted = (qs ?? []).map((q) => ({
        ...q,
        question_options: [...q.question_options].sort((x, y) => x.sort_order - y.sort_order),
      })) as Q[];
      setQuestions(sorted);
    })();
  }, [slug]);

  const current = questions[idx];
  const pct = questions.length ? ((idx + 1) / questions.length) * 100 : 0;

  async function submit() {
    if (!assessmentId) return;
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const rows = Object.entries(answers).map(([question_id, option_id]) => ({
        user_id: userData.user!.id,
        assessment_id: assessmentId,
        question_id,
        option_id,
      }));
      const { error } = await supabase.from("user_responses").upsert(rows, { onConflict: "user_id,question_id" });
      if (error) throw error;
      toast.info("Analyzing your answers with AI…");
      const result = (await analyze({ data: { assessmentSlug: slug } })) as { resultId: string };
      navigate({ to: "/results/$id", params: { id: result.resultId } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!current) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  const answered = answers[current.id];
  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <span className="text-xs font-mono text-muted-foreground">{idx + 1} / {questions.length}</span>
        </div>
        <Progress value={pct} className="h-1 rounded-none" />
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full px-6 py-16">
        <span className="text-xs font-mono text-primary tracking-widest uppercase">{title}</span>
        <h1 className="mt-4 font-display text-3xl md:text-4xl font-bold text-balance leading-tight">
          {current.text}
        </h1>

        <div className="mt-10 space-y-3">
          {current.question_options.map((o) => {
            const selected = answers[current.id] === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setAnswers((a) => ({ ...a, [current.id]: o.id }))}
                className={`w-full text-left p-5 rounded-2xl border transition-all ${
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-foreground/40 bg-background"
                }`}
              >
                <span className="font-medium">{o.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-12 flex justify-between">
          <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
            Back
          </Button>
          {idx < questions.length - 1 ? (
            <Button disabled={!answered} onClick={() => setIdx((i) => i + 1)}>
              Continue
            </Button>
          ) : (
            <Button disabled={!allAnswered || submitting} onClick={submit}>
              {submitting ? "Analyzing…" : "Submit & analyze"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}