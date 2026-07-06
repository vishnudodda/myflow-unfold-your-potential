import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { loadQuestions, analyzeGuest } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/questions")({
  ssr: false,
  head: () => ({ meta: [{ title: "Your questions — MyFlow" }] }),
  component: Questions,
});

type Session = { name: string; age: number; slugs: string[]; education?: string; skills?: string[] };

function Questions() {
  const navigate = useNavigate();
  const loadFn = useServerFn(loadQuestions);
  const analyzeFn = useServerFn(analyzeGuest);
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem("myflow.session");
    if (!raw) { navigate({ to: "/" }); return; }
    const s = JSON.parse(raw) as Session;
    if (!s.slugs?.length) { navigate({ to: "/pick" }); return; }
    setSession(s);
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["questions", session?.slugs],
    queryFn: () => loadFn({ data: { slugs: session!.slugs } }),
    enabled: !!session,
  });

  const flatQs = useMemo(() => {
    const out: Array<{ moduleSlug: string; moduleTitle: string; id: string; text: string; options: Array<{ id: string; label: string }> }> = [];
    for (const m of data?.modules ?? []) {
      for (const q of m.questions) {
        out.push({ moduleSlug: m.slug, moduleTitle: m.title, id: q.id, text: q.text, options: q.options });
      }
    }
    return out;
  }, [data]);
  const totalQs = flatQs.length;
  const answeredCount = Object.keys(answers).length;
  const complete = totalQs > 0 && answeredCount === totalQs;
  const q = flatQs[current];
  const isLast = current === totalQs - 1;

  function pick(qid: string, oid: string) {
    setAnswers((prev) => ({ ...prev, [qid]: oid }));
    if (!isLast) {
      setTimeout(() => setCurrent((c) => Math.min(c + 1, totalQs - 1)), 220);
    }
  }

  async function onAnalyze() {
    if (!complete || !session || !data) return;
    setSubmitting(true);
    try {
      const flat: Array<{ moduleSlug: string; question: string; answer: string }> = [];
      for (const m of data.modules) {
        for (const q of m.questions) {
          const oid = answers[q.id];
          const opt = q.options.find((o) => o.id === oid);
          if (opt) flat.push({ moduleSlug: m.slug, question: q.text, answer: opt.label });
        }
      }
      const res = await analyzeFn({
        data: {
          name: session.name,
          age: session.age,
          education: session.education,
          skills: session.skills,
          slugs: session.slugs,
          answers: flat,
        },
      });
      const raw = localStorage.getItem("myflow.session");
      const sess = raw ? JSON.parse(raw) : {};
      localStorage.setItem("myflow.session", JSON.stringify({ ...sess, result: res.result }));
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <span className="font-display text-xl font-bold tracking-tighter">MYFLOW</span>

        {isLoading || !q ? (
          <p className="mt-16 text-muted-foreground">Loading questions…</p>
        ) : (
          <>
            <div className="mt-8 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground">
              <span>{q.moduleTitle}</span>
              <span>{current + 1} / {totalQs}</span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${((current + (answers[q.id] ? 1 : 0)) / totalQs) * 100}%` }} />
            </div>

            <div key={q.id} className="mt-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{q.text}</h2>
              <div className="mt-6 grid gap-3">
                {q.options.map((o) => {
                  const on = answers[q.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => pick(q.id, o.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${on ? "border-primary bg-primary/10 scale-[1.01]" : "border-border hover:bg-muted hover:border-primary/40"}`}
                    >
                      <span className="text-sm">{o.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <Button
                  variant="ghost"
                  disabled={current === 0}
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                >
                  ← Back
                </Button>
                {isLast ? (
                  <Button size="lg" disabled={!complete || submitting} onClick={onAnalyze}>
                    {submitting ? "Analyzing…" : "Analyze"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={!answers[q.id]}
                    onClick={() => setCurrent((c) => Math.min(totalQs - 1, c + 1))}
                  >
                    Next →
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}