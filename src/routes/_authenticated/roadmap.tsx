import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { generateRoadmap, getRoadmap, toggleMilestone } from "@/lib/roadmap.functions";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Growth Roadmap — MyFlow" },
      { name: "description", content: "A personalized 30-day, 3-month, 6-month, and 1-year plan generated from your assessments." },
    ],
  }),
  component: RoadmapPage,
});

type Milestone = { id: string; title: string; description: string | null; horizon: string; completed_at: string | null };
type Roadmap = { id: string; title: string; summary: string | null; target_career: string | null; created_at: string; content: Record<string, unknown> | null };

type Obj = Record<string, unknown>;
const asArr = <T = Obj>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const asStr = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

const HORIZONS: { key: string; label: string }[] = [
  { key: "30_day", label: "Next 30 days" },
  { key: "3_month", label: "3 months" },
  { key: "6_month", label: "6 months" },
  { key: "1_year", label: "1 year" },
];

function RoadmapPage() {
  const get = useServerFn(getRoadmap);
  const gen = useServerFn(generateRoadmap);
  const toggle = useServerFn(toggleMilestone);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const r = (await get()) as { roadmap: Roadmap | null; milestones: Milestone[] };
      setRoadmap(r.roadmap);
      setMilestones(r.milestones);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function generate() {
    setGenerating(true);
    try {
      toast.info("Building your roadmap with AI…");
      await gen();
      toast.success("Roadmap ready");
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setGenerating(false); }
  }

  async function onToggle(m: Milestone) {
    const completed = !m.completed_at;
    setMilestones((prev) => prev.map((x) => x.id === m.id ? { ...x, completed_at: completed ? new Date().toISOString() : null } : x));
    try { await toggle({ data: { id: m.id, completed } }); } catch { refresh(); }
  }

  const done = milestones.filter((m) => m.completed_at).length;
  const c = (roadmap?.content ?? {}) as Obj;
  const overall = (c.overall_profile ?? c.profile ?? {}) as Obj;
  const strengths = asArr<string | Obj>(c.top_strengths ?? c.strengths);
  const improveAreas = asArr<string | Obj>(c.areas_to_improve ?? c.improvements ?? c.growth_areas);
  const careerRecs = asArr<string | Obj>(c.career_recommendations ?? c.careers);
  const skillsToLearn = asArr<string | Obj>(c.skills_to_learn ?? c.skills);
  const learningRes = (c.learning_resources ?? {}) as Obj;
  const successStories = asArr<Obj>(c.success_stories ?? c.role_models);
  const motivation = asStr(c.motivation_summary ?? c.motivation);
  const oneYear = asArr<Obj>(c.one_year_roadmap ?? c.year_plan);
  const asLine = (item: string | Obj): { title: string; description?: string } => {
    if (typeof item === "string") return { title: item };
    return {
      title: asStr(item.title) ?? asStr(item.name) ?? asStr(item.skill) ?? asStr(item.career) ?? "—",
      description: asStr(item.description) ?? asStr(item.reason) ?? asStr(item.why) ?? asStr(item.detail) ?? undefined,
    };
  };
  const listItems = (raw: unknown): { title: string; description?: string }[] =>
    asArr<string | Obj>(raw).map(asLine).filter((x) => x.title !== "—");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          {roadmap && <Button onClick={generate} disabled={generating} variant="outline" size="sm">{generating ? "Regenerating…" : "Regenerate"}</Button>}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <span className="text-xs font-mono text-primary tracking-widest uppercase">Growth Roadmap</span>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        ) : !roadmap ? (
          <div className="mt-8">
            <h1 className="font-display text-4xl font-bold">Your growth roadmap</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">A personalized plan across 30 days, 3 months, 6 months, and 1 year — built from your assessment results.</p>
            <div className="mt-8 p-12 rounded-2xl border border-dashed border-border text-center">
              <p className="font-display text-xl font-bold">No roadmap yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Complete at least one assessment, then generate.</p>
              <Button className="mt-6" onClick={generate} disabled={generating}>{generating ? "Generating…" : "Generate my roadmap"}</Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-2 font-display text-4xl font-bold">{roadmap.title}</h1>
            {roadmap.target_career && <p className="mt-2 text-sm text-muted-foreground">Target: <span className="text-foreground font-medium">{roadmap.target_career}</span></p>}
            {roadmap.summary && <p className="mt-4 text-muted-foreground text-pretty leading-relaxed">{roadmap.summary}</p>}
            <p className="mt-4 text-xs font-mono text-muted-foreground">{done} of {milestones.length} milestones complete</p>

            {/* Overall profile */}
            {Object.keys(overall).length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3">Overall profile</h2>
                <dl className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                  {Object.entries(overall).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{k.replaceAll("_", " ")}</dt>
                      <dd className="mt-1 font-display text-lg font-bold">{typeof v === "number" || typeof v === "string" ? String(v) : JSON.stringify(v)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {strengths.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3">Top strengths</h2>
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {strengths.map(asLine).map((s, i) => (
                    <li key={i} className="p-4 rounded-xl border border-border">
                      <p className="font-medium">{s.title}</p>
                      {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {improveAreas.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3">Areas to improve</h2>
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {improveAreas.map(asLine).map((s, i) => (
                    <li key={i} className="p-4 rounded-xl border border-border">
                      <p className="font-medium">{s.title}</p>
                      {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {careerRecs.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3">Career recommendations</h2>
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {careerRecs.map(asLine).map((s, i) => (
                    <li key={i} className="p-4 rounded-xl border border-border">
                      <p className="font-medium">{s.title}</p>
                      {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {skillsToLearn.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3">Skills to learn</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {skillsToLearn.map(asLine).map((s, i) => (
                    <span key={i} className="text-sm px-3 py-1.5 rounded-full bg-muted font-medium">{s.title}</span>
                  ))}
                </div>
              </section>
            )}

            {Object.keys(learningRes).length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3">Learning resources</h2>
                <div className="mt-4 space-y-6">
                  {Object.entries(learningRes).map(([k, v]) => {
                    const items = listItems(v);
                    if (items.length === 0) return null;
                    return (
                      <div key={k}>
                        <h3 className="text-sm font-mono uppercase tracking-widest text-primary">{k.replaceAll("_", " ")}</h3>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {items.map((i, idx) => <li key={idx}>• {i.title}{i.description ? ` — ${i.description}` : ""}</li>)}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {successStories.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3">Success stories</h2>
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {successStories.map((r, i) => (
                    <li key={i} className="p-4 rounded-xl border border-border">
                      <p className="font-medium">{asStr(r.name) ?? asStr(r.person) ?? "Role model"}</p>
                      {asStr(r.title) && <p className="text-xs text-muted-foreground">{asStr(r.title)}</p>}
                      {(asStr(r.story) ?? asStr(r.bio)) && <p className="mt-2 text-sm text-muted-foreground italic">"{asStr(r.story) ?? asStr(r.bio)}"</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {oneYear.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-bold border-b border-border pb-3">One-year roadmap</h2>
                <ul className="mt-4 space-y-2">
                  {oneYear.map((m, i) => (
                    <li key={i} className="p-4 rounded-xl border border-border">
                      <p className="font-medium">{asStr(m.period) ?? asStr(m.months) ?? `Phase ${i + 1}`}</p>
                      {asStr(m.focus) && <p className="mt-1 text-sm text-muted-foreground">{asStr(m.focus)}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {motivation && (
              <section className="mt-12 p-8 rounded-2xl bg-primary/5 border border-primary/20">
                <h2 className="font-display text-2xl font-bold">Keep going</h2>
                <p className="mt-3 text-pretty leading-relaxed">{motivation}</p>
              </section>
            )}

            {/* Milestone tracking */}
            <section className="mt-16">
              <div className="border-b border-border pb-3 flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-bold">Milestone tracker</h2>
                <span className="text-xs font-mono text-muted-foreground">{done}/{milestones.length}</span>
              </div>
              <div className="mt-6 space-y-10">
              {HORIZONS.map((h) => {
                const items = milestones.filter((m) => m.horizon === h.key);
                if (items.length === 0) return null;
                return (
                  <div key={h.key}>
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-lg font-bold">{h.label}</h3>
                      <span className="text-xs font-mono text-muted-foreground">{items.filter((i) => i.completed_at).length} / {items.length}</span>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {items.map((m) => (
                        <li key={m.id} className="flex gap-3 p-4 rounded-xl border border-border">
                          <Checkbox checked={!!m.completed_at} onCheckedChange={() => onToggle(m)} className="mt-1" />
                          <div className="flex-1">
                            <p className={`font-medium ${m.completed_at ? "line-through text-muted-foreground" : ""}`}>{m.title}</p>
                            {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}