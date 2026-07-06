import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { DashboardResult } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";
import { jsPDF } from "jspdf";

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
  slugs?: string[];
  flatAnswers?: Array<{ moduleSlug: string; question: string; answer: string; skipped?: boolean; custom?: boolean }>;
  result?: DashboardResult;
};

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

  function downloadReport() {
    if (!session) return;
    generatePdfReport(session);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pastel-blue via-background to-pastel-lilac text-foreground px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <div className="flex items-center gap-2">
            <Button size="sm" className="rounded-full" onClick={downloadReport}>
              Download report ↓
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { localStorage.removeItem("myflow.session"); navigate({ to: "/" }); }}>
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

        {/* Deep analysis */}
        {r.analysis && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel title="Strengths" tone="mint" emoji="💪">
              <ul className="space-y-2 text-sm list-disc pl-5">
                {r.analysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </Panel>
            <Panel title="Growth areas" tone="peach" emoji="🌱">
              <ul className="space-y-2 text-sm list-disc pl-5">
                {r.analysis.growthAreas?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </Panel>
            <Panel title="Personality patterns" tone="lilac" emoji="🧭">
              <ul className="space-y-2 text-sm list-disc pl-5">
                {r.analysis.personalityPatterns?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              {r.analysis.learningStyle && (
                <div className="mt-3 rounded-lg bg-white/70 p-3 text-xs">
                  <span className="font-mono uppercase tracking-widest text-primary text-[10px]">Learning style · </span>
                  {r.analysis.learningStyle}
                </div>
              )}
            </Panel>
            <Panel title="Career insights" tone="lemon" emoji="🎯">
              <ul className="space-y-2 text-sm list-disc pl-5">
                {r.analysis.careerInsights?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              {r.analysis.blindSpots?.length ? (
                <div className="mt-3 rounded-lg bg-white/70 p-3 text-xs">
                  <span className="font-mono uppercase tracking-widest text-primary text-[10px]">Watch out for · </span>
                  {r.analysis.blindSpots.join(" · ")}
                </div>
              ) : null}
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

function generatePdfReport(s: Session) {
  const r = s.result!;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin) { doc.addPage(); y = margin; }
  };
  const line = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const size = opts.size ?? 11;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? [30, 30, 30]));
    const wrapped = doc.splitTextToSize(text, maxW);
    for (const w of wrapped) {
      ensure(size + 4);
      doc.text(w, margin, y);
      y += size + 4;
    }
    y += opts.gap ?? 0;
  };
  const h1 = (t: string) => line(t, { size: 22, bold: true, color: [30, 58, 138], gap: 6 });
  const h2 = (t: string) => { y += 6; line(t, { size: 14, bold: true, color: [30, 58, 138], gap: 4 }); };
  const bullet = (t: string) => line(`•  ${t}`, { size: 11 });
  const kv = (k: string, v: string) => line(`${k}: ${v}`, { size: 11 });

  h1(`MyFlow Report — ${s.name}`);
  line(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), { size: 10, color: [120, 120, 120], gap: 8 });

  h2("Your profile");
  kv("Name", s.name);
  kv("Age", String(s.age));
  if (s.education) kv("Current stage", s.education);
  if (s.goal) kv("Current goal", s.goal);
  if (s.selfDescription) kv("One-line self-description", s.selfDescription);
  if (s.skills?.length) kv("Skills", s.skills.join(", "));
  if (s.customSkills?.length) kv("Custom skills", s.customSkills.join(", "));
  if (s.slugs?.length) kv("Modules explored", s.slugs.join(", "));

  h2("Summary");
  if (r.summary?.headline) line(r.summary.headline, { size: 12, bold: true });
  r.summary?.bullets?.forEach(bullet);
  if (r.summary?.motivation) { y += 4; line(`"${r.summary.motivation}"`, { size: 11, color: [70, 70, 70] }); }

  if (r.analysis) {
    h2("Personality analysis");
    const a = r.analysis;
    if (a.strengths?.length)          { line("Strengths", { bold: true }); a.strengths.forEach(bullet); }
    if (a.growthAreas?.length)        { line("Growth areas", { bold: true }); a.growthAreas.forEach(bullet); }
    if (a.personalityPatterns?.length){ line("Personality patterns", { bold: true }); a.personalityPatterns.forEach(bullet); }
    if (a.interests?.length)          { line("Interests", { bold: true }); a.interests.forEach(bullet); }
    if (a.motivations?.length)        { line("Motivations", { bold: true }); a.motivations.forEach(bullet); }
    if (a.learningStyle)              { line("Learning style", { bold: true }); line(a.learningStyle); }
    if (a.blindSpots?.length)         { line("Potential blind spots", { bold: true }); a.blindSpots.forEach(bullet); }
    if (a.careerInsights?.length)     { line("Career insights", { bold: true }); a.careerInsights.forEach(bullet); }
  }

  if (r.roleModels?.length) {
    h2("Recommended role models");
    r.roleModels.forEach((rm) => { line(rm.name, { bold: true }); line(rm.why); y += 2; });
  }

  if (r.roadmap?.length) {
    h2("Roadmap");
    r.roadmap.forEach((m) => line(`${m.horizon} — ${m.action}`));
  }

  if (r.opportunities?.length) {
    h2("Opportunities");
    r.opportunities.forEach((o) => {
      line(o.title, { bold: true });
      line(`${o.org} · ${o.stipend} · Confidence: ${o.confidence}`);
      if (o.url) line(o.url, { color: [30, 58, 138] });
      y += 2;
    });
  }

  if (r.podcasts?.length) {
    h2("Podcasts");
    r.podcasts.forEach((p) => {
      line(p.title, { bold: true });
      line(`by ${p.host} — ${p.pitch}`);
      if (p.url) line(p.url, { color: [30, 58, 138] });
      y += 2;
    });
  }

  if (s.flatAnswers?.length) {
    h2("Your questionnaire responses");
    s.flatAnswers.forEach((qa, i) => {
      const tag = qa.skipped ? " (SKIPPED)" : qa.custom ? " (custom)" : "";
      line(`${i + 1}. [${qa.moduleSlug}]${tag}`, { size: 10, color: [110, 110, 110] });
      line(`Q: ${qa.question}`, { size: 11 });
      line(`A: ${qa.answer}`, { size: 11, color: qa.skipped ? [170, 90, 90] : [30, 30, 30] });
      y += 2;
    });
  }

  if (r.analysis?.conclusion) {
    h2("Personalized conclusion");
    line(r.analysis.conclusion);
  }

  doc.save(`MyFlow-${s.name.replace(/\s+/g, "_")}.pdf`);
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