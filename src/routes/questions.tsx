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

type AnswerVal = { optionId?: string; other?: string; skipped?: boolean };

function Questions() {
  const navigate = useNavigate();
  const loadFn = useServerFn(loadQuestions);
  const analyzeFn = useServerFn(analyzeGuest);
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerVal>>({});
  const [otherDraft, setOtherDraft] = useState<Record<string, string>>({});
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
    const savedAns = localStorage.getItem("myflow.answers");
    if (savedAns) {
      try { setAnswers(JSON.parse(savedAns)); } catch { /* ignore */ }
    }
  }, [navigate]);

  useEffect(() => {
    if (Object.keys(answers).length) {
      localStorage.setItem("myflow.answers", JSON.stringify(answers));
    }
  }, [answers]);

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
  const q = flatQs[current];
  const touchedCount = flatQs.filter((item) => {
    const a = answers[item.id];
    return a && (a.skipped || a.optionId || a.other);
  }).length;
  const hasCurrentAnswer = q ? Boolean(answers[q.id]?.optionId || answers[q.id]?.other || answers[q.id]?.skipped) : false;
  const complete = totalQs > 0 && touchedCount === totalQs;
  const isLast = current === totalQs - 1;

  function buildAnalyzePayload() {
    if (!session || !data) return null;
    const flat: Array<{ moduleSlug: string; question: string; answer?: string; skipped?: boolean }> = [];
    for (const m of data.modules) {
      for (const qq of m.questions) {
        const a = answers[qq.id];
        if (!a || a.skipped) {
          flat.push({ moduleSlug: m.slug, question: qq.text, skipped: true });
        } else if (a.other) {
          flat.push({ moduleSlug: m.slug, question: qq.text, answer: `Other: ${a.other}` });
        } else if (a.optionId) {
          const opt = qq.options.find((o) => o.id === a.optionId);
          if (opt) flat.push({ moduleSlug: m.slug, question: qq.text, answer: opt.label });
        }
      }
    }
    return {
      name: session.name,
      age: session.age,
      education: session.education,
      skills: session.skills,
      customSkills: session.customSkills,
      goal: session.goal,
      selfDescription: session.selfDescription,
      slugs: session.slugs,
      answers: flat,
    };
  }

  function pick(qid: string, oid: string) {
    setAnswers((prev) => ({ ...prev, [qid]: { optionId: oid } }));
    if (!isLast) setTimeout(() => setCurrent((c) => Math.min(c + 1, totalQs - 1)), 220);
  }
  function pickOther(qid: string) {
    setAnswers((prev) => ({ ...prev, [qid]: { other: otherDraft[qid] || "" } }));
  }
  function commitOther(qid: string, value: string) {
    setOtherDraft((p) => ({ ...p, [qid]: value }));
    setAnswers((prev) => ({ ...prev, [qid]: { other: value } }));
  }
  function skip(qid: string) {
    setAnswers((prev) => ({ ...prev, [qid]: { skipped: true } }));
    if (!isLast) setTimeout(() => setCurrent((c) => Math.min(c + 1, totalQs - 1)), 180);
  }

  async function onAnalyze() {
    if (!complete || !session || !data) return;
    const payload = buildAnalyzePayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      if (!analysisPromiseRef.current) {
        analysisPromiseRef.current = analyzeFn({ data: payload }) as Promise<{ result: unknown }>;
      }
      const res = (await analysisPromiseRef.current) as { result: unknown };
      const raw = localStorage.getItem("myflow.session");
      const sess = raw ? JSON.parse(raw) : {};
      // Also persist the flat answers + module titles for the downloadable report.
      const flatWithTitles = payload.answers.map((a) => {
        const mod = data.modules.find((m) => m.slug === a.moduleSlug);
        return { ...a, moduleTitle: mod?.title };
      });
      localStorage.setItem(
        "myflow.session",
        JSON.stringify({ ...sess, result: res.result, flatAnswers: flatWithTitles }),
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
              <div className="h-full bg-primary transition-all" style={{ width: `${((current + (hasCurrentAnswer ? 1 : 0)) / totalQs) * 100}%` }} />
            </div>

            <div key={q.id} className="mt-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{q.text}</h2>
              <div className="mt-6 grid gap-3">
                {q.options.map((o) => {
                  const on = answers[q.id]?.optionId === o.id;
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
                {(() => {
                  const otherOn = answers[q.id]?.other !== undefined;
                  return (
                    <button
                      type="button"
                      onClick={() => pickOther(q.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${otherOn ? "border-primary bg-primary/10" : "border-border hover:bg-muted hover:border-primary/40"}`}
                    >
                      <span className="text-sm">Other…</span>
                    </button>
                  );
                })()}
                {answers[q.id]?.other !== undefined && (
                  <input
                    autoFocus
                    type="text"
                    value={otherDraft[q.id] ?? answers[q.id]?.other ?? ""}
                    onChange={(e) => commitOther(q.id, e.target.value)}
                    placeholder="Type your own answer…"
                    className="w-full p-3 rounded-xl border border-primary/40 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                  <Button variant="ghost" onClick={() => skip(q.id)}>
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
                  {(isLast || complete) && (
                    <Button size="lg" disabled={!complete || submitting} onClick={onAnalyze}>
                      {submitting ? "Analyzing…" : complete ? "Analyze ✧" : "Answer or skip all to analyze"}
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