import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateRecommendations, generateOpportunities, getRecommendations } from "@/lib/recommendations.functions";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations — MyFlow" },
      { name: "description", content: "AI-matched careers, learning resources, role models and opportunities based on your assessments." },
    ],
  }),
  component: RecsPage,
});

type Career = { id: string; title: string; industry: string | null; match_score: number; reasoning: string | null; required_skills: string[] | null };
type Learning = { id: string; kind: string; title: string; creator: string | null; url: string; duration: string | null; reason: string | null; skill_tag: string | null };
type RoleModel = { id: string; name: string; title: string | null; bio: string | null; story: string | null; reason: string | null };
type Opportunity = { id: string; kind: string; title: string; organization: string | null; location: string | null; is_remote: boolean | null; url: string | null; description: string | null; match_reason: string | null; trust_score: number | null };

function RecsPage() {
  const get = useServerFn(getRecommendations);
  const gen = useServerFn(generateRecommendations);
  const genOpps = useServerFn(generateOpportunities);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genOppsLoading, setGenOppsLoading] = useState(false);
  const [data, setData] = useState<{ careers: Career[]; learning: Learning[]; role_models: RoleModel[]; opportunities: Opportunity[] }>({
    careers: [], learning: [], role_models: [], opportunities: [],
  });

  async function refresh() {
    setLoading(true);
    try {
      const r = (await get()) as typeof data;
      setData(r);
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function generate() {
    setGenerating(true);
    try {
      toast.info("Generating your recommendations with AI…");
      const r = (await gen()) as { careers: number; learning: number; role_models: number; opportunities: number; errors: string[] };
      toast.success(`Generated ${r.careers} careers, ${r.learning} resources, ${r.role_models} role models, ${r.opportunities} opportunities.`);
      if (r.errors?.length) toast.error(`Some sections failed: ${r.errors.join(", ")}`);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setGenerating(false); }
  }

  async function generateOpps() {
    setGenOppsLoading(true);
    try {
      toast.info("Finding opportunities matched to you…");
      const r = (await genOpps()) as { inserted: number };
      toast.success(`Added ${r.inserted} opportunities.`);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Opportunity generation failed");
    } finally { setGenOppsLoading(false); }
  }

  const empty = !loading && data.careers.length + data.learning.length + data.role_models.length + data.opportunities.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <Button onClick={generate} disabled={generating}>{generating ? "Generating…" : data.careers.length ? "Regenerate" : "Generate"}</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <span className="text-xs font-mono text-primary tracking-widest uppercase">Recommendations</span>
        <h1 className="mt-2 font-display text-4xl font-bold">Matched to you</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">Careers, learning resources, role models, and opportunities generated from your assessment results.</p>

        {loading ? (
          <p className="mt-12 text-muted-foreground">Loading…</p>
        ) : empty ? (
          <div className="mt-12 p-12 rounded-2xl border border-dashed border-border text-center">
            <p className="font-display text-xl font-bold">No recommendations yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Complete at least one assessment, then generate.</p>
            <Button className="mt-6" onClick={generate} disabled={generating}>{generating ? "Generating…" : "Generate now"}</Button>
          </div>
        ) : (
          <Tabs defaultValue="careers" className="mt-10">
            <TabsList>
              <TabsTrigger value="careers">Careers ({data.careers.length})</TabsTrigger>
              <TabsTrigger value="learning">Learning ({data.learning.length})</TabsTrigger>
              <TabsTrigger value="role_models">Role Models ({data.role_models.length})</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities ({data.opportunities.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="careers" className="mt-6 grid gap-4 md:grid-cols-2">
              {data.careers.map((c) => (
                <article key={c.id} className="p-6 rounded-2xl border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-xl font-bold">{c.title}</h3>
                    <span className="text-xs font-mono px-2 py-1 rounded-full bg-primary/10 text-primary">{Math.round(c.match_score)}%</span>
                  </div>
                  {c.industry && <p className="text-xs text-muted-foreground mt-1">{c.industry}</p>}
                  {c.reasoning && <p className="mt-3 text-sm text-muted-foreground">{c.reasoning}</p>}
                  {c.required_skills && c.required_skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {c.required_skills.map((s, i) => <span key={i} className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full bg-muted">{s}</span>)}
                    </div>
                  )}
                </article>
              ))}
            </TabsContent>

            <TabsContent value="learning" className="mt-6 grid gap-4 md:grid-cols-2">
              {data.learning.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="p-6 rounded-2xl border border-border hover:border-primary/40 transition-colors block">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{l.kind}</span>
                  <h3 className="mt-2 font-display text-lg font-bold">{l.title}</h3>
                  {l.creator && <p className="text-xs text-muted-foreground">{l.creator}{l.duration ? ` · ${l.duration}` : ""}</p>}
                  {l.reason && <p className="mt-3 text-sm text-muted-foreground">{l.reason}</p>}
                  {l.skill_tag && <span className="mt-3 inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full bg-muted">{l.skill_tag}</span>}
                </a>
              ))}
            </TabsContent>

            <TabsContent value="role_models" className="mt-6 grid gap-4 md:grid-cols-2">
              {data.role_models.map((r) => (
                <article key={r.id} className="p-6 rounded-2xl border border-border">
                  <h3 className="font-display text-lg font-bold">{r.name}</h3>
                  {r.title && <p className="text-xs text-muted-foreground">{r.title}</p>}
                  {r.bio && <p className="mt-3 text-sm">{r.bio}</p>}
                  {r.story && <p className="mt-3 text-sm text-muted-foreground italic">"{r.story}"</p>}
                  {r.reason && <p className="mt-3 text-xs text-primary">Why: {r.reason}</p>}
                </article>
              ))}
            </TabsContent>

            <TabsContent value="opportunities" className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                <p className="text-sm text-muted-foreground">Refresh opportunities without regenerating everything.</p>
                <Button size="sm" variant="outline" onClick={generateOpps} disabled={genOppsLoading}>
                  {genOppsLoading ? "Refreshing…" : "Refresh opportunities"}
                </Button>
              </div>
              {data.opportunities.length === 0 && (
                <div className="md:col-span-2 p-8 rounded-2xl border border-dashed border-border text-center">
                  <p className="text-sm text-muted-foreground">No opportunities yet — click "Refresh opportunities" above.</p>
                </div>
              )}
              {data.opportunities.map((o) => (
                <article key={o.id} className="p-6 rounded-2xl border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{o.kind}</span>
                      <h3 className="mt-1 font-display text-lg font-bold">{o.title}</h3>
                      {o.organization && <p className="text-xs text-muted-foreground">{o.organization}{o.location ? ` · ${o.location}` : ""}{o.is_remote ? " · Remote" : ""}</p>}
                    </div>
                    {typeof o.trust_score === "number" && (
                      <span className="text-xs font-mono px-2 py-1 rounded-full bg-muted">Trust {Math.round(o.trust_score * 100)}%</span>
                    )}
                  </div>
                  {o.description && <p className="mt-3 text-sm text-muted-foreground">{o.description}</p>}
                  {o.match_reason && <p className="mt-2 text-xs text-primary">Why: {o.match_reason}</p>}
                  {o.url && <a href={o.url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Learn more →</a>}
                </article>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}