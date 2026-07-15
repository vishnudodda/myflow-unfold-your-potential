import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { loadQuestions, analyzeGuest } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/questions")({
  ssr: false,
  head: () => ({ meta: [{ title: "Your questions — MyFlow" }] }),
  component: Questions,
});

type Session = { name: string; age: number; slugs: string[]; education?: string; skills?: string[]; customSkill?: string; goal?: string; oneLiner?: string };

const OTHER_ID = "__other__";
const SKIP_ID = "__skip__";

function Questions() {
  const navigate = useNavigate();
  const loadFn = useServerFn(loadQuestions);
  const analyzeFn = useServerFn(analyzeGuest);
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customText, setCustomText] = useState<Record<string, string>>({});
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
  const isAnswered = (qid: string) => {
    const v = answers[qid];
    if (!v || v === SKIP_ID) return false;
    if (v === OTHER_ID) return (customText[qid] ?? "").trim().length > 0;
    return true;
  };
  const isResolved = (qid: string) => {
    const v = answers[qid];
    if (!v) return false;
    if (v === SKIP_ID) return true;
    if (v === OTHER_ID) return (customText[qid] ?? "").trim().length > 0;
    return true;
  };
  const answeredCount = flatQs.filter((item) => isAnswered(item.id)).length;
  const resolvedCount = flatQs.filter((item) => isResolved(item.id)).length;
  const hasCurrentAnswer = q ? isAnswered(q.id) : false;
  const complete = totalQs > 0 && resolvedCount === totalQs;
  const isLast = current === totalQs - 1;

  function buildFlatAnswers(ans: Record<string, string>, custom: Record<string, string>) {
    const flat: Array<{ moduleSlug: string; question: string; answer?: string; custom?: string; skipped?: boolean }> = [];
    for (const m of data?.modules ?? []) {
      for (const qq of m.questions) {
        const oid = ans[qq.id];
        if (!oid || oid === SKIP_ID) {
          flat.push({ moduleSlug: m.slug, question: qq.text, skipped: true });
          continue;
        }
        if (oid === OTHER_ID) {
          flat.push({ moduleSlug: m.slug, question: qq.text, answer: "Other", custom: custom[qq.id]?.trim() || undefined });
          continue;
        }
        const opt = qq.options.find((o) => o.id === oid);
        if (opt) flat.push({ moduleSlug: m.slug, question: qq.text, answer: opt.label });
      }
    }
    return flat;
  }

  function maybeKickoffAnalysis(nextAnswers: Record<string, string>, nextCustom: Record<string, string>) {
    if (!session || !data) return;
    const allDone = flatQs.every((item) => {
      const v = nextAnswers[item.id];
      if (!v || v === SKIP_ID) return false;
      if (v === OTHER_ID) return (nextCustom[item.id] ?? "").trim().length > 0;
      return true;
    });
    if (!allDone) return;
    if (analysisPromiseRef.current) return;
    analysisPromiseRef.current = analyzeFn({
      data: {
        name: session.name,
        age: session.age,
        education: session.education,
        skills: session.skills,
        customSkill: session.customSkill,
        goal: session.goal,
        oneLiner: session.oneLiner,
        slugs: session.slugs,
        answers: buildFlatAnswers(nextAnswers, nextCustom),
      },
    }) as Promise<{ result: unknown }>;
  }

  function pick(qid: string, oid: string) {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: oid };
      if (isLast && oid !== OTHER_ID) maybeKickoffAnalysis(next, customText);
      return next;
    });
    if (!isLast && oid !== OTHER_ID) {
      setTimeout(() => setCurrent((c) => Math.min(c + 1, totalQs - 1)), 220);
    }
  }

  function goToUnanswered() {
    const idx = flatQs.findIndex((item) => !isResolved(item.id));
    if (idx >= 0) {
      setCurrent(idx);
      toast.error("Please answer or skip every question before continuing.");
    }
  }

  async function onAnalyze() {
    if (!session || !data) return;
    if (!complete) { goToUnanswered(); return; }
    setSubmitting(true);
    try {
      if (!analysisPromiseRef.current) {
        analysisPromiseRef.current = analyzeFn({
          data: {
            name: session.name,
            age: session.age,
            education: session.education,
            skills: session.skills,
            customSkill: session.customSkill,
            goal: session.goal,
            oneLiner: session.oneLiner,
            slugs: session.slugs,
            answers: buildFlatAnswers(answers, customText),
          },
        }) as Promise<{ result: unknown }>;
      }
      const res = (await analysisPromiseRef.current) as { result: unknown };
      const raw = localStorage.getItem("myflow.session");
      const sess = raw ? JSON.parse(raw) : {};
      const flatAns = buildFlatAnswers(answers, customText);
      localStorage.setItem("myflow.session", JSON.stringify({ ...sess, result: res.result, answersFlat: flatAns }));
      navigate({ to: "/dashboard" });
    } catch (err) {
      analysisPromiseRef.current = null;
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen text-foreground px-6 py-12">
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-pastel-lilac via-background to-pastel-blue backdrop-blur-sm">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <div className="relative mx-auto h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-3 rounded-full bg-primary/10 animate-pulse" />
            </div>
            <h2 className="mt-8 font-display text-2xl font-bold tracking-tight">
              Building your flow…
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
      <div className="mx-auto max-w-6xl">
        <span className="font-display text-xl font-bold tracking-tighter">MYFLOW</span>

        {isLoading || !q ? (
          <p className="mt-16 text-muted-foreground">Loading questions…</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
            <div>
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground">
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
                    value={customText[q.id] ?? ""}
                    onChange={(e) => setCustomText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Type your own answer…"
                    className="min-h-24"
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
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAnswers((prev) => {
                        const next = { ...prev, [q.id]: SKIP_ID };
                        if (isLast) maybeKickoffAnalysis(next, customText);
                        return next;
                      });
                      if (!isLast) setTimeout(() => setCurrent((c) => Math.min(c + 1, totalQs - 1)), 180);
                    }}
                  >
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
            </div>

            {/* Right-side progress panel */}
            <aside className="hidden lg:block">
              <div className="sticky top-8 rounded-2xl border border-border bg-card p-5">
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Progress
                </div>
                <div className="mt-2 font-display text-lg font-semibold">
                  Answered: {answeredCount}/{totalQs} Questions
                </div>
                <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(resolvedCount / totalQs) * 100}%` }}
                  />
                </div>
                <div className="mt-5 grid grid-cols-5 gap-1.5">
                  {flatQs.map((item, i) => {
                    const answered = isAnswered(item.id);
                    const skipped = answers[item.id] === SKIP_ID;
                    const active = i === current;
                    const base = "h-8 rounded-md text-[10px] font-mono flex items-center justify-center transition-all border";
                    const cls = active
                      ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/40"
                      : answered
                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40"
                      : skipped
                      ? "bg-amber-500/10 text-amber-700 border-amber-500/40"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/30";
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrent(i)}
                        title={item.text}
                        className={`${base} ${cls}`}
                      >
                        Q{i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Answered</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Skipped</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Pending</span>
                </div>
                {!complete && (
                  <p className="mt-4 text-[11px] text-muted-foreground">
                    Answer or skip every question to unlock <span className="text-primary font-semibold">Analyze ✧</span>.
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}