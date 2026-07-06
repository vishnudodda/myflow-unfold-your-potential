import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { DashboardResult } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Your Dashboard — MyFlow" }] }),
  component: Dashboard,
});

type Session = { name: string; age: number; result?: DashboardResult };

function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("myflow.session");
    if (!raw) { navigate({ to: "/" }); return; }
    const s = JSON.parse(raw) as Session;
    if (!s.result) { navigate({ to: "/pick" }); return; }
    setSession(s);
  }, [navigate]);

  if (!session?.result) return null;
  const r = session.result;

  return (
    <main className="min-h-screen bg-gradient-to-br from-pastel-blue via-background to-pastel-lilac text-foreground px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => { localStorage.removeItem("myflow.session"); navigate({ to: "/" }); }}>
            Start over
          </Button>
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
              <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <div className="shrink-0">
                  <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-b from-ink/90 to-ink p-4 md:p-5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)]">
                    <div className="font-mono text-5xl md:text-6xl font-bold text-paper leading-none tracking-tight">
                      <AnimatedCounter value={r.perspective.statNumber} />
                    </div>
                    <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                  </div>
                  {r.perspective.source && (
                    <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-2">
                      Source · {r.perspective.source}
                    </div>
                  )}
                </div>
                <p className="text-sm md:text-base text-foreground/85 leading-relaxed">
                  <AnimatedText text={r.perspective.stat} />
                </p>
              </div>

              {r.perspective.simpleMeaning && (
                <div className="mt-5 rounded-2xl bg-white/80 border border-primary/15 p-4 md:p-5">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80 mb-1">
                    What this means (in plain words)
                  </div>
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                    <AnimatedText text={r.perspective.simpleMeaning} />
                  </p>
                </div>
              )}

              {expanded && (
                <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="rounded-2xl bg-white/70 p-4 md:p-5">
                    <p className="text-sm italic text-foreground/90">{r.perspective.message}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {r.perspective.facts.map((f, i) => (
                      <div key={i} className="rounded-2xl bg-white/80 p-4 border border-border">
                        <div className="font-mono text-2xl font-bold text-primary">
                          <AnimatedCounter value={f.number} duration={1600} />
                        </div>
                        <div className="text-[11px] font-mono uppercase tracking-widest text-foreground/70 mt-1">{f.label}</div>
                        <div className="text-xs text-muted-foreground mt-2">{f.detail}</div>
                      </div>
                    ))}
                  </div>
                  {r.perspective.lessPrivileged && (
                    <div className="mt-5 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-pastel-peach via-white to-pastel-lilac p-5 md:p-6 shadow-[0_10px_40px_-20px_rgba(30,58,138,0.4)]">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
                        Your launchpad · Why your next step matters
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                        <div className="shrink-0 rounded-2xl bg-ink px-5 py-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)]">
                          <div className="font-mono text-4xl md:text-5xl font-bold text-paper leading-none">
                            <AnimatedCounter value={r.perspective.lessPrivileged.number} duration={1800} />
                          </div>
                          <div className="text-[10px] font-mono uppercase tracking-widest text-paper/70 mt-2">
                            {r.perspective.lessPrivileged.label}
                          </div>
                        </div>
                        <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                          {r.perspective.lessPrivileged.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-full bg-white/70 backdrop-blur border-primary/30 hover:bg-white"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? "Show less ↑" : "See more ↓"}
                </Button>
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

// Splits a paragraph into text + number tokens (e.g. "617M", "70%", "1.1B", "258 million")
// and animates each number with the odometer counter so stats like the UNESCO figure roll in.
function AnimatedText({ text }: { text: string }) {
  const splitRegex = /(\d[\d,]*(?:\.\d+)?\s?(?:%|[KMB]|million|billion|thousand)?)/gi;
  const testRegex = /^\d[\d,]*(?:\.\d+)?\s?(?:%|[KMB]|million|billion|thousand)?$/i;
  const parts = text.split(splitRegex);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (testRegex.test(part.trim())) {
          return (
            <AnimatedCounter
              key={i}
              value={part.trim()}
              className="font-mono font-semibold text-foreground"
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}