import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { DashboardResult } from "@/lib/guest.functions";
import { generateReport } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Your Dashboard — MyFlow" }] }),
  component: Dashboard,
});

type Session = {
  name: string;
  age: number;
  education?: string;
  skills?: string[];
  customSkills?: string[];
  goal?: string;
  selfDescription?: string;
  result?: DashboardResult;
  flatAnswers?: Array<{ moduleSlug: string; moduleTitle?: string; question: string; answer?: string; skipped?: boolean }>;
};

function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [downloading, setDownloading] = useState(false);
  const reportFn = useServerFn(generateReport);

  useEffect(() => {
    const raw = localStorage.getItem("myflow.session");
    if (!raw) { navigate({ to: "/" }); return; }
    const s = JSON.parse(raw) as Session;
    if (!s.result) { navigate({ to: "/pick" }); return; }
    setSession(s);
  }, [navigate]);

  if (!session?.result) return null;
  const r = session.result;

  async function onDownload() {
    if (!session) return;
    setDownloading(true);
    try {
      const res = await reportFn({
        data: {
          session: {
            name: session.name,
            age: session.age,
            education: session.education,
            skills: session.skills,
            customSkills: session.customSkills,
            goal: session.goal,
            selfDescription: session.selfDescription,
          },
          answers: session.flatAnswers ?? [],
          result: session.result,
        },
      });
      const bin = atob(res.pdfBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the report");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pastel-blue via-background to-pastel-lilac text-foreground px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <div className="flex items-center gap-2">
            <Button size="sm" className="rounded-full" onClick={onDownload} disabled={downloading}>
              {downloading ? "Preparing…" : "Download report ↓"}
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { localStorage.removeItem("myflow.session"); localStorage.removeItem("myflow.answers"); navigate({ to: "/" }); }}>
              Start over
            </Button>
          </div>
        </div>

        <header className="mt-10">
          <span className="inline-block text-[11px] font-mono uppercase tracking-widest bg-white/60 backdrop-blur px-3 py-1 rounded-full border border-border">
            Your snapshot ✦
          </span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
            {session.name}, here's your <span className="font-serif italic font-normal text-primary">map</span>.
          </h1>
        </header>

        {/* Row 1: Role Models + Opportunities (swapped to the top) */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="Role Models" tone="lilac" emoji="✨">
            <div className="space-y-4">
              {(r.roleModels ?? []).map((rm, i) => (
                <div key={i} className="rounded-xl bg-white/70 p-3 flex gap-3 items-start">
                  {rm.photoUrl && (
                    <img
                      src={rm.photoUrl}
                      alt={rm.name}
                      loading="lazy"
                      className="h-14 w-14 rounded-full object-cover border border-border shrink-0 bg-muted"
                      onError={(e) => {
                        const t = e.currentTarget;
                        t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rm.name)}&background=e0e7ff&color=1e3a8a&size=256&bold=true`;
                      }}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{rm.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{rm.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Opportunities" tone="mint" emoji="🌱">
            <div className="space-y-3">
              {(r.opportunities ?? []).map((o, i) => (
                <div key={i} className="rounded-xl bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">{o.title}</div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${o.confidence === "High" ? "bg-primary/15 text-primary" : o.confidence === "Medium" ? "bg-pastel-peach text-foreground" : "bg-muted text-muted-foreground"}`}>{o.confidence}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{o.org} · {o.stipend}</div>
                  {o.url && (
                    <a href={o.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-mono uppercase text-primary hover:underline">
                      Apply / Learn more ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Row 2: Summary (now below) */}
        <div className="mt-4">
          <Panel title="Summary" tone="blue" emoji="💫">
            <p className="font-display text-xl md:text-2xl font-semibold text-balance">{r.summary?.headline}</p>
            <ul className="mt-4 grid md:grid-cols-3 gap-3">
              {(r.summary?.bullets ?? []).map((b, i) => (
                <li key={i} className="rounded-xl bg-white/70 p-3 text-sm">{b}</li>
              ))}
            </ul>
            {r.summary?.motivation && (
              <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">A note for you ✧</div>
                <p className="text-sm italic text-foreground/90">{r.summary.motivation}</p>
              </div>
            )}
          </Panel>
        </div>

        {/* Deeper insights */}
        {(r.summary?.personalityPattern || r.summary?.learningStyle || r.summary?.strengths?.length || r.summary?.growthAreas?.length || r.summary?.blindSpots?.length || r.summary?.careerInsights?.length) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {r.summary?.strengths?.length ? (
              <Panel title="Strengths" tone="mint" emoji="💪">
                <ul className="space-y-2 text-sm">
                  {r.summary.strengths.map((s, i) => <li key={i} className="rounded-lg bg-white/70 p-3">{s}</li>)}
                </ul>
              </Panel>
            ) : null}
            {r.summary?.growthAreas?.length ? (
              <Panel title="Growth Areas" tone="peach" emoji="🌿">
                <ul className="space-y-2 text-sm">
                  {r.summary.growthAreas.map((s, i) => <li key={i} className="rounded-lg bg-white/70 p-3">{s}</li>)}
                </ul>
              </Panel>
            ) : null}
            {r.summary?.personalityPattern ? (
              <Panel title="Personality Pattern" tone="lilac" emoji="🧭">
                <p className="text-sm">{r.summary.personalityPattern}</p>
              </Panel>
            ) : null}
            {r.summary?.learningStyle ? (
              <Panel title="Learning Style" tone="blue" emoji="📚">
                <p className="text-sm">{r.summary.learningStyle}</p>
              </Panel>
            ) : null}
            {r.summary?.blindSpots?.length ? (
              <Panel title="Blind Spots" tone="lemon" emoji="👁️">
                <ul className="space-y-2 text-sm">
                  {r.summary.blindSpots.map((s, i) => <li key={i} className="rounded-lg bg-white/70 p-3">{s}</li>)}
                </ul>
              </Panel>
            ) : null}
            {r.summary?.careerInsights?.length ? (
              <Panel title="Career Insights" tone="mint" emoji="🚀">
                <ul className="space-y-2 text-sm">
                  {r.summary.careerInsights.map((s, i) => <li key={i} className="rounded-lg bg-white/70 p-3">{s}</li>)}
                </ul>
              </Panel>
            ) : null}
          </div>
        )}

        {r.summary?.conclusion && (
          <div className="mt-4">
            <Panel title="Conclusion" tone="lilac" emoji="✨">
              <p className="text-sm md:text-base">{r.summary.conclusion}</p>
            </Panel>
          </div>
        )}

        {/* Row 3: Roadmap + Podcasts */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="Roadmap" tone="peach" emoji="🛤️">
            <ol className="space-y-3">
              {(r.roadmap ?? []).map((m, i) => (
                <li key={i} className="rounded-xl bg-white/70 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-primary">{m.horizon}</div>
                  <div className="mt-0.5 text-sm">{m.action}</div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Podcasts" tone="lemon" emoji="🎧">
            <div className="space-y-3">
              {(r.podcasts ?? []).map((p, i) => (
                <div key={i} className="rounded-xl bg-white/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm">{p.title}</div>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-[10px] font-mono uppercase text-primary hover:underline shrink-0">Listen ↗</a>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">by {p.host}</div>
                  <div className="text-xs mt-1">{p.pitch}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Perspective — motivational stats */}
        {r.perspective && (
          <div className="mt-8">
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-pastel-lilac to-pastel-blue p-6 md:p-8 shadow-[0_20px_60px_-25px_rgba(30,58,138,0.35)]">
              <div className="text-[11px] font-mono uppercase tracking-widest text-primary">Perspective ✧</div>
              <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold tracking-tight text-balance">
                {r.perspective.headline}
              </h3>
              <div className="mt-8 flex flex-col items-center text-center gap-5">
                <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-b from-ink/90 to-ink px-10 py-8 md:px-16 md:py-10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)]">
                  <div className="font-mono text-7xl md:text-8xl font-bold text-paper leading-none tracking-tight">
                    <AnimatedCounter value={r.perspective.lessPrivileged?.number || r.perspective.statNumber} duration={2200} />
                  </div>
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                </div>
                <div className="text-xs md:text-sm font-mono uppercase tracking-widest text-primary max-w-xl">
                  {r.perspective.lessPrivileged?.label || r.perspective.stat}
                </div>
                <p className="text-sm md:text-base text-foreground/85 leading-relaxed max-w-2xl">
                  {stripNumbers(
                    r.perspective.lessPrivileged?.message ||
                      r.perspective.simpleMeaning ||
                      r.perspective.message
                  )}
                </p>
                {r.perspective.source && (
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Source · {r.perspective.source}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const TONE_BG: Record<string, string> = {
  blue: "bg-pastel-blue",
  mint: "bg-pastel-mint",
  peach: "bg-pastel-peach",
  lilac: "bg-pastel-lilac",
  lemon: "bg-pastel-lemon",
};

function Panel({ title, tone, emoji, children }: { title: string; tone: keyof typeof TONE_BG; emoji?: string; children: React.ReactNode }) {
  return (
    <section className={`${TONE_BG[tone]} rounded-3xl border border-border p-5 shadow-[0_10px_40px_-20px_rgba(30,58,138,0.25)] transition-transform hover:-translate-y-0.5`}>
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">{emoji}</span>
        <div className="text-xs font-mono uppercase tracking-widest text-foreground/70">{title}</div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Removes standalone numbers/percentages from a sentence so the Perspective
// panel shows exactly one figure — the big animated counter above.
function stripNumbers(text: string): string {
  return text
    .replace(/\d[\d,]*(?:\.\d+)?\s?(?:%|[KMB]\b|million|billion|thousand)?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}