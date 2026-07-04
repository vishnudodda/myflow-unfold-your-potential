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

type Session = { name: string; age: number; slugs: string[] };

function Questions() {
  const navigate = useNavigate();
  const loadFn = useServerFn(loadQuestions);
  const analyzeFn = useServerFn(analyzeGuest);
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const totalQs = useMemo(
    () => (data?.modules ?? []).reduce((s, m) => s + m.questions.length, 0),
    [data],
  );
  const answeredCount = Object.keys(answers).length;
  const complete = totalQs > 0 && answeredCount === totalQs;

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
        data: { name: session.name, age: session.age, slugs: session.slugs, answers: flat },
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
        <h1 className="mt-8 font-display text-3xl md:text-4xl font-bold tracking-tight">A few questions.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Answered {answeredCount} of {totalQs}</p>
        <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: totalQs ? `${(answeredCount / totalQs) * 100}%` : "0%" }} />
        </div>

        {isLoading ? (
          <p className="mt-12 text-muted-foreground">Loading questions…</p>
        ) : (
          <div className="mt-10 space-y-10">
            {(data?.modules ?? []).map((m) => (
              <section key={m.slug}>
                <h2 className="font-display text-xl font-bold border-b border-border pb-2">{m.title}</h2>
                <div className="mt-6 space-y-8">
                  {m.questions.map((q, i) => (
                    <div key={q.id}>
                      <div className="font-medium">{i + 1}. {q.text}</div>
                      <div className="mt-3 grid gap-2">
                        {q.options.map((o) => {
                          const on = answers[q.id] === o.id;
                          return (
                            <label
                              key={o.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${on ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                            >
                              <input
                                type="radio"
                                className="accent-primary"
                                name={q.id}
                                checked={on}
                                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                              />
                              <span className="text-sm">{o.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 flex justify-end">
          <Button size="lg" disabled={!complete || submitting} onClick={onAnalyze}>
            {submitting ? "Analyzing…" : "Analyze"}
          </Button>
        </div>
      </div>
    </main>
  );
}