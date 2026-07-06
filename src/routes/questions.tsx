import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { loadQuestions, analyzeGuest } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/questions")({
  ssr: false,
  head: () => ({ meta: [{ title: "Your questions — MyFlow" }] }),
  component: Questions,
});

type Session = {
  name: string;
  age: number;
  slugs: string[];
  education?: string;
  skills?: string[];
  customSkills?: string[];
  goal?: string;
  selfDescription?: string;
};

const OTHER_ID = "__other__";
const SKIP_ID = "__skip__";

function Questions() {
  const navigate = useNavigate();
  const loadFn = useServerFn(loadQuestions);
  const analyzeFn = useServerFn(analyzeGuest);
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
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
        out.push({
          moduleSlug: m.slug,
          moduleTitle: m.title,
          id: q.id,
          text: q.text,
          options: [...q.options, { id: OTHER_ID, label: "Other (type your own)" }],
        });
      }
    }
    return out;
  }, [data]);
  const totalQs = flatQs.length;
  const q = flatQs[current];
  const answeredCount = flatQs.filter((item) => answers[item.id]).length;
  const hasCurrentAnswer = q ? Boolean(answers[q.id]) : false;
  const complete = totalQs > 0 && answeredCount === totalQs;
  const isLast = current === totalQs - 1;

  function pick(qid: string, oid: string) {
    setAnswers((prev) => ({ ...prev, [qid]: oid }));
    if (oid !== OTHER_ID && !isLast) {
      setTimeout(() => setCurrent((c) => Math.min(c + 1, totalQs - 1)), 220);
    }
  }

  function skip() {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: SKIP_ID }));
    if (!isLast) {
      setTimeout(() => setCurrent((c) => Math.min(c + 1, totalQs - 1)), 180);
    }
  }

  function buildFlatAnswers(): Array<{ moduleSlug: string; question: string; answer: string; skipped?: boolean; custom?: boolean }> {
    if (!data) return [];
    const out: Array<{ moduleSlug: string; question: string; answer: string; skipped?: boolean; custom?: boolean }> = [];
    for (const m of data.modules) {
      for (const qq of m.questions) {
        const oid = answers[qq.id];
        if (!oid || oid === SKIP_ID) {
          out.push({ moduleSlug: m.slug, question: qq.text, answer: "(skipped)", skipped: true });
          continue;
        }
        if (oid === OTHER_ID) {
          const txt = (otherText[qq.id] || "").trim();
          out.push({ moduleSlug: m.slug, question: qq.text, answer: txt || "(other — no detail)", custom: true });
          continue;
        }
        const opt = qq.options.find((o) => o.id === oid);
        if (opt) out.push({ moduleSlug: m.slug, question: qq.text, answer: opt.label });
      }
    }
    return out;
  }

  async function onAnalyze() {
    if (!session || !data) return;
    setSubmitting(true);
    try {
      const flat = buildFlatAnswers();
      analysisPromiseRef.current = analyzeFn({
        data: {
          name: session.name,
          age: session.age,
          education: session.education,
          skills: session.skills,
          customSkills: session.customSkills,
          goal: session.goal,
          selfDescription: session.selfDescription,
          slugs: session.slugs,
          answers: flat,
        },
      }) as Promise<{ result: unknown }>;
      const res = (await analysisPromiseRef.current) as { result: unknown };
      const raw = localStorage.getItem("myflow.session");
      const sess = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        "myflow.session",
        JSON.stringify({ ...sess, result: res.result, flatAnswers: flat }),
      );
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
                {answers[q.id] === OTHER_ID && (
                  <Textarea
                    autoFocus
                    value={otherText[q.id] || ""}
                    onChange={(e) => setOtherText((p) => ({ ...p, [q.id]: e.target.value }))}
                    placeholder="Type your own answer…"
                    className="min-h-[90px]"
                  />
                )}
              </div>

              <div className="mt-8 sticky bottom-0 -mx-6 px-6 py-4 bg-background/95 backdrop-blur border-t border-border sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:backdrop-blur-0 sm:border-t-0 flex items-center justify-between">
                <Button
                  variant="ghost"
                  disabled={current === 0}
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                >
                  ← Back
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={skip}>
                    Skip
                  </Button>
                  {!isLast && (
                    <Button
                      variant="outline"
                      disabled={!hasCurrentAnswer}
                      onClick={() => setCurrent((c) => Math.min(totalQs - 1, c + 1))}
                    >
                      Next →
                    </Button>
                  )}
                  {isLast && (
                    <Button size="lg" disabled={submitting} onClick={onAnalyze}>
                      {submitting ? "Analyzing…" : "Analyze ✧"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}