import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { DashboardResult } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";

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
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem("myflow.session"); navigate({ to: "/" }); }}>
            Start over
          </Button>
        </div>

        <h1 className="mt-10 font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
          {session.name}, here's your map.
        </h1>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Summary */}
          <Panel title="Summary" span="md:col-span-4">
            <p className="font-display text-lg font-semibold">{r.summary?.headline}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {(r.summary?.bullets ?? []).map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </Panel>

          {/* Roadmap */}
          <Panel title="Roadmap" span="md:col-span-2">
            <ol className="space-y-3">
              {(r.roadmap ?? []).map((m, i) => (
                <li key={i} className="text-sm">
                  <div className="text-xs font-mono uppercase tracking-widest text-primary">{m.horizon}</div>
                  <div className="mt-0.5">{m.action}</div>
                </li>
              ))}
            </ol>
          </Panel>

          {/* Role Models */}
          <Panel title="Role Models" span="md:col-span-2">
            <div className="space-y-3">
              {(r.roleModels ?? []).map((rm, i) => (
                <div key={i}>
                  <div className="font-semibold text-sm">{rm.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{rm.why}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Opportunities */}
          <Panel title="Opportunities" span="md:col-span-2">
            <div className="space-y-3">
              {(r.opportunities ?? []).map((o, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">{o.title}</div>
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${o.confidence === "High" ? "bg-primary/10 text-primary" : o.confidence === "Medium" ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"}`}>{o.confidence}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{o.org} · {o.stipend}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Podcasts */}
          <Panel title="Podcasts" span="md:col-span-2">
            <div className="space-y-3">
              {(r.podcasts ?? []).map((p, i) => (
                <div key={i}>
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-xs text-muted-foreground">by {p.host}</div>
                  <div className="text-xs mt-0.5">{p.pitch}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, span, children }: { title: string; span: string; children: React.ReactNode }) {
  return (
    <section className={`${span} rounded-2xl border border-border bg-card p-5`}>
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}