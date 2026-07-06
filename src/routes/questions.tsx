import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const analysisPromiseRef = useRef<Promise<{ result: unknown }> | null>(null);

  const LOADING_MESSAGES = [
    "Reading your answers…",
    "Matching role models to your age…",
    "Curating opportunities for you…",
    "Pulling real global stats…",
    "Building your personal roadmap…",
    "Almost there — polishing your dashboard…",
  ];

  useEffect(() => {
    if (!submitting) return;
    const id = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1600);
    return () => clearInterval(id);
  }, [submitting]);

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
    setAnswers((prev) => {
      const next = { ...prev, [qid]: oid };
      // Kick off analysis eagerly the moment the last answer is picked,
      // so it runs in the background while the user reaches for "Analyze".
      if (isLast && session && data && Object.keys(next).length === totalQs && !analysisPromiseRef.current) {
        const flat: Array<{ moduleSlug: string; question: string; answer: string }> = [];
        for (const m of data.modules) {
          for (const qq of m.questions) {
            const oidPick = next[qq.id];
            const opt = qq.options.find((o) => o.id === oidPick);
            if (opt) flat.push({ moduleSlug: m.slug, question: qq.text, answer: opt.label });
          }
        }
        analysisPromiseRef.current = analyzeFn({
          data: {
            name: session.name,
            age: session.age,
            education: session.education,
            skills: session.skills,
            slugs: session.slugs,
            answers: flat,
          },
        }) as Promise<{ result: unknown }>;
      }
      return next;
    });
    if (!isLast) {
      setTimeout(() => setCurrent((c) => Math.min(c + 1, totalQs - 1)), 220);
    }
  }

  async function onAnalyze() {
    if (!complete || !session || !data) return;
    setSubmitting(true);
    try {
      // Reuse the in-flight analysis started at pick-time when available.
      if (!analysisPromiseRef.current) {
        const flat: Array<{ moduleSlug: string; question: string; answer: string }> = [];
        for (const m of data.modules) {
          for (const qq of m.questions) {
            const oid = answers[qq.id];
            const opt = qq.options.find((o) => o.id === oid);
            if (opt) flat.push({ moduleSlug: m.slug, question: qq.text, answer: opt.label });
          }
        }
        analysisPromiseRef.current = analyzeFn({
          data: {
            name: session.name,
            age: session.age,
            education: session.education,
            skills: session.skills,
            slugs: session.slugs,
            answers: flat,
          },
        }) as Promise<{ result: unknown }>;
      }
      const res = (await analysisPromiseRef.current) as { result: unknown };
      const raw = localStorage.getItem("myflow.session");
      const sess = raw ? JSON.parse(raw) : {};
      localStorage.setItem("myflow.session", JSON.stringify({ ...sess, result: res.result }));
      navigate({ to: "/dashboard" });
    } catch (err) {
      analysisPromiseRef.current = null;
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-12">
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-pastel-lilac via-background to-pastel-blue backdrop-blur-sm">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <div className="relative mx-auto h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-3 rounded-full bg-primary/10 animate-pulse" />
            </div>
            <h2 className="mt-8 font-display text-2xl font-bold tracking-tight">
              Building your MyFlow ✧
            </h2>
            <p key={loadingMsgIdx} className="mt-3 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-500">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
            <div className="mt-6 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse" style={{ width: "70%" }} />
            </div>
            <p className="mt-4 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              This takes ~10–20 seconds
            </p>
          </div>
        </div>
      )}
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