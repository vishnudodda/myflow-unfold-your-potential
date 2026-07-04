import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { DashboardResult } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, FileText, Map, Headphones } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Your Dashboard — MyFlow" }] }),
  component: Dashboard,
});

type Session = { name: string; age: number; result?: DashboardResult };

function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

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
    <main className="min-h-screen bg-background text-foreground px-6 py-10 relative overflow-hidden">
      {/* pastel blobs */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full blur-3xl opacity-60" style={{ background: "var(--pastel-blue)" }} />
      <div aria-hidden className="pointer-events-none absolute top-40 -right-24 h-96 w-96 rounded-full blur-3xl opacity-50" style={{ background: "var(--pastel-lilac)" }} />
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full blur-3xl opacity-40" style={{ background: "var(--pastel-mint)" }} />

      <div className="mx-auto max-w-6xl relative">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem("myflow.session"); navigate({ to: "/" }); }}>
            Start over
          </Button>
        </div>

        <div className="mt-10">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono uppercase tracking-widest" style={{ background: "var(--pastel-sky)", color: "var(--blue-ink)" }}>
            <Sparkles className="h-3.5 w-3.5" /> Your snapshot
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
            {session.name}, here's your <span style={{ color: "var(--blue-ink)" }}>map</span>.
          </h1>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-6 gap-5">
          {/* Row 1: Role Models + Opportunities (were where Summary was) */}
          <Panel title="Role Models" span="md:col-span-3" tint="var(--pastel-blue)" icon={<Users className="h-4 w-4" />}>
            <div className="space-y-4">
              {(r.roleModels ?? []).map((rm, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display font-bold text-sm" style={{ background: "var(--pastel-sky)", color: "var(--blue-ink)" }}>
                    {rm.name?.[0] ?? "?"}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{rm.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{rm.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Opportunities" span="md:col-span-3" tint="var(--pastel-mint)" icon={<Sparkles className="h-4 w-4" />}>
            <div className="space-y-3">
              {(r.opportunities ?? []).map((o, i) => (
                <div key={i} className="rounded-xl bg-white/70 backdrop-blur p-3 border border-white">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">{o.title}</div>
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full ${o.confidence === "High" ? "bg-primary/15 text-primary" : o.confidence === "Medium" ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"}`}>{o.confidence}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{o.org} · {o.stipend}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Row 2: Summary (wide) + Roadmap */}
          <Panel title="Summary" span="md:col-span-4" tint="var(--pastel-peach)" icon={<FileText className="h-4 w-4" />}>
            <p className="font-display text-xl font-semibold leading-snug">{r.summary?.headline}</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground/80">
              {(r.summary?.bullets ?? []).map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--blue-ink)" }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Roadmap" span="md:col-span-2" tint="var(--pastel-lilac)" icon={<Map className="h-4 w-4" />}>
            <ol className="space-y-3 relative">
              {(r.roadmap ?? []).map((m, i) => (
                <li key={i} className="text-sm pl-4 relative">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full" style={{ background: "var(--blue-ink)" }} />
                  <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--blue-ink)" }}>{m.horizon}</div>
                  <div className="mt-0.5">{m.action}</div>
                </li>
              ))}
            </ol>
          </Panel>

          {/* Row 3: Podcasts full width */}
          <Panel title="Podcasts" span="md:col-span-6" tint="var(--pastel-lemon)" icon={<Headphones className="h-4 w-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(r.podcasts ?? []).map((p, i) => (
                <div key={i} className="rounded-xl bg-white/70 backdrop-blur p-3 border border-white">
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-xs text-muted-foreground">by {p.host}</div>
                  <div className="text-xs mt-1 text-foreground/80">{p.pitch}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, span, tint, icon, children }: { title: string; span: string; tint: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      className={`${span} rounded-3xl border border-white/60 p-6 shadow-[0_10px_30px_-15px_rgba(30,60,120,0.15)] transition-transform hover:-translate-y-0.5`}
      style={{ background: tint }}
    >
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground/70">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70">{icon}</span>
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}