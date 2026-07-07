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

type FlatAnswer = { moduleSlug: string; question: string; answer?: string; custom?: string; skipped?: boolean };
type Session = {
  name: string;
  age: number;
  education?: string;
  skills?: string[];
  customSkill?: string;
  goal?: string;
  oneLiner?: string;
  result?: DashboardResult;
  answersFlat?: FlatAnswer[];
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-pastel-blue via-background to-pastel-lilac text-foreground px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" className="rounded-full" onClick={() => downloadReport(session)}>
              ↓ Download Report
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
                You're already ahead of millions — this is your head start ✦
              </h3>
              <div className="mt-8 flex flex-col items-center text-center gap-5">
                <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-b from-ink/90 to-ink px-10 py-8 md:px-16 md:py-10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)]">
                  <div className="font-mono text-6xl md:text-8xl font-bold text-paper leading-none tracking-tight">
                    <AnimatedCounter value={formatToUnit(r.perspective.lessPrivileged?.number || r.perspective.statNumber)} duration={2600} />
                  </div>
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                </div>
                <div className="text-xs md:text-sm font-mono uppercase tracking-widest text-primary max-w-xl">
                  {r.perspective.lessPrivileged ? "young people you're already ahead of — your head start ✦" : r.perspective.stat}
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

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Formats a raw stat like "244000000", "244M", "1.2 billion", "10 crore"
// into a friendly "244 Million" / "1.2 Billion" / "500 Thousand" string.
function formatToUnit(raw: string): string {
  if (!raw) return "0";
  const s = String(raw).trim();
  const m = s.match(/([\d,.]+)\s*(million|billion|thousand|crore|lakh|trillion|k|m|b|t)?/i);
  if (!m) return s;
  const numRaw = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(numRaw)) return s;
  const unit = (m[2] || "").toLowerCase();
  const mult: Record<string, number> = {
    "": 1,
    k: 1_000,
    thousand: 1_000,
    lakh: 100_000,
    m: 1_000_000,
    million: 1_000_000,
    crore: 10_000_000,
    b: 1_000_000_000,
    billion: 1_000_000_000,
    t: 1_000_000_000_000,
    trillion: 1_000_000_000_000,
  };
  const total = numRaw * (mult[unit] ?? 1);
  let value: number;
  let label: string;
  if (total >= 1_000_000_000_000) { value = total / 1_000_000_000_000; label = "Trillion"; }
  else if (total >= 1_000_000_000) { value = total / 1_000_000_000; label = "Billion"; }
  else if (total >= 1_000_000) { value = total / 1_000_000; label = "Million"; }
  else if (total >= 1_000) { value = total / 1_000; label = "Thousand"; }
  else return String(Math.round(total));
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${label}`;
}


function downloadReport(session: Session) {
  const r = session.result;
  if (!r) return;
  const a = r.analysis;
  const answers = session.answersFlat ?? [];
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>MyFlow Report — ${escapeHtml(session.name)}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; color:#0f172a; line-height:1.55; max-width: 820px; margin: 32px auto; padding: 0 24px; }
  h1 { font-size: 32px; margin: 0 0 4px; letter-spacing: -0.02em; }
  h2 { font-size: 20px; margin: 28px 0 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; color:#1e3a8a; }
  h3 { font-size: 15px; margin: 16px 0 6px; color:#334155; text-transform: uppercase; letter-spacing: .08em; }
  .muted { color:#64748b; font-size: 13px; }
  .grid { display:grid; grid-template-columns: 160px 1fr; gap: 6px 16px; font-size: 14px; }
  ul { padding-left: 20px; margin: 6px 0; }
  li { margin: 3px 0; font-size: 14px; }
  .card { background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:14px 16px; margin: 8px 0; }
  .qa { margin: 10px 0; padding: 10px 12px; border-left:3px solid #c7d2fe; background:#f8fafc; border-radius:6px; font-size:13px; }
  .qa .q { font-weight:600; color:#1e3a8a; }
  .qa .a { margin-top:2px; }
  .skipped { color:#94a3b8; font-style:italic; }
  .rm { display:flex; gap:12px; align-items:flex-start; margin:8px 0; }
  .rm img { width:56px; height:56px; border-radius:50%; object-fit:cover; border:1px solid #e5e7eb; }
  header { border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 24px; }
  .brand { font-size:12px; letter-spacing:.2em; color:#1e3a8a; font-weight:700; }
  @media print { .noprint { display:none } body { margin: 0; } }
  .noprint { position: fixed; top: 16px; right: 16px; }
  .noprint button { background:#1e3a8a; color:white; border:none; padding:10px 16px; border-radius:8px; cursor:pointer; font-size:13px; }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>
<header>
  <div class="brand">MYFLOW · PERSONAL REPORT</div>
  <h1>${escapeHtml(session.name)}'s MyFlow snapshot</h1>
  <div class="muted">Generated ${new Date().toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' })}</div>
</header>

<h2>Your profile</h2>
<div class="grid">
  <div class="muted">Name</div><div>${escapeHtml(session.name)}</div>
  <div class="muted">Age</div><div>${session.age}</div>
  <div class="muted">Stage</div><div>${escapeHtml(session.education ?? "—")}</div>
  <div class="muted">Skills</div><div>${(session.skills ?? []).map(escapeHtml).join(", ") || "—"}</div>
  ${session.customSkill ? `<div class="muted">Custom skills</div><div>${escapeHtml(session.customSkill)}</div>` : ""}
  <div class="muted">Current goal</div><div>${escapeHtml(session.goal ?? "—")}</div>
  <div class="muted">One-line self</div><div>${escapeHtml(session.oneLiner ?? "—")}</div>
</div>

<h2>Summary</h2>
<div class="card"><strong>${escapeHtml(r.summary?.headline ?? "")}</strong>
<ul>${(r.summary?.bullets ?? []).map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
${r.summary?.motivation ? `<p><em>${escapeHtml(r.summary.motivation)}</em></p>` : ""}
</div>

${a ? `
<h2>Personality analysis</h2>
<p>${escapeHtml(a.personality)}</p>
<h3>Motivations</h3><p>${escapeHtml(a.motivations)}</p>
<h3>Learning style</h3><p>${escapeHtml(a.learningStyle)}</p>
<h3>Interests</h3><ul>${a.interests.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

<h2>Strengths</h2>
<ul>${a.strengths.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

<h2>Growth areas</h2>
<ul>${a.growthAreas.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

${a.blindSpots?.length ? `<h3>Potential blind spots</h3><ul>${a.blindSpots.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}

<h2>Career insights</h2>
<p>${escapeHtml(a.careerInsights)}</p>
` : ""}

<h2>Recommended role models</h2>
${(r.roleModels ?? []).map(rm => `<div class="rm">${rm.photoUrl ? `<img src="${escapeHtml(rm.photoUrl)}" alt="">` : ""}<div><strong>${escapeHtml(rm.name)}</strong><div class="muted">${escapeHtml(rm.why)}</div></div></div>`).join("")}

<h2>Roadmap</h2>
<ul>${(r.roadmap ?? []).map(m => `<li><strong>${escapeHtml(m.horizon)}:</strong> ${escapeHtml(m.action)}</li>`).join("")}</ul>

<h2>Opportunities</h2>
${(r.opportunities ?? []).map(o => `<div class="card"><strong>${escapeHtml(o.title)}</strong> <span class="muted">· ${escapeHtml(o.confidence)}</span><div class="muted">${escapeHtml(o.org)} · ${escapeHtml(o.stipend)}</div>${o.url ? `<div class="muted" style="word-break:break-all">${escapeHtml(o.url)}</div>` : ""}</div>`).join("")}

<h2>Podcasts to listen to</h2>
${(r.podcasts ?? []).map(p => `<div class="card"><strong>${escapeHtml(p.title)}</strong> <span class="muted">by ${escapeHtml(p.host)}</span><div>${escapeHtml(p.pitch)}</div>${p.url ? `<div class="muted" style="word-break:break-all">${escapeHtml(p.url)}</div>` : ""}</div>`).join("")}

${answers.length ? `
<h2>Your questionnaire responses</h2>
${answers.map((x, i) => `<div class="qa"><div class="q">${i+1}. ${escapeHtml(x.question)}</div>${x.skipped ? `<div class="a skipped">Skipped</div>` : `<div class="a">${escapeHtml(x.answer ?? "")}${x.custom ? ` — "${escapeHtml(x.custom)}"` : ""}</div>`}</div>`).join("")}
` : ""}

${a ? `<h2>A note to close</h2><p><em>${escapeHtml(a.conclusion)}</em></p>` : ""}

${r.perspective ? `<h2>Perspective</h2>
<div class="card"><strong>${escapeHtml(r.perspective.headline)}</strong>
<p style="font-size:28px; font-weight:700; color:#1e3a8a; margin:8px 0;">${escapeHtml(r.perspective.lessPrivileged?.number || r.perspective.statNumber)}</p>
<div class="muted">${escapeHtml(r.perspective.lessPrivileged?.label || r.perspective.stat)}</div>
<p>${escapeHtml(r.perspective.lessPrivileged?.message || r.perspective.simpleMeaning || r.perspective.message)}</p>
${r.perspective.source ? `<div class="muted">Source: ${escapeHtml(r.perspective.source)}</div>` : ""}
</div>` : ""}

</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement("a");
  a2.href = url;
  a2.download = `myflow-report-${session.name.replace(/\s+/g, "-").toLowerCase()}.html`;
  document.body.appendChild(a2);
  a2.click();
  document.body.removeChild(a2);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  // Also open in a new tab for immediate print-to-PDF
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
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