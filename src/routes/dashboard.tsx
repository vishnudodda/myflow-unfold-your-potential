import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { DashboardResult } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";
import { jsPDF } from "jspdf";

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
    <main className="min-h-screen text-foreground px-6 py-10 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(var(--amber) 1px, transparent 1px), linear-gradient(90deg, var(--amber) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber blur-3xl opacity-20" />
      <div className="relative">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" className="rounded-full" onClick={() => downloadReport(session)}>
              ↓ Download PDF
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
              try { localStorage.removeItem("myflow.session"); } catch { /* ignore */ }
              window.location.assign("/");
            }}>
              Start over
            </Button>
          </div>
        </div>

        <header className="mt-10">
          <span className="inline-block text-[11px] font-mono uppercase tracking-widest bg-amber/10 text-amber backdrop-blur px-3 py-1 rounded-full border border-amber/30">
            Your snapshot ✦
          </span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
            {session.name}, <span className="font-serif italic font-normal text-primary">{shortMotivation(r.summary?.motivation || r.summary?.headline || "your journey starts here", session.name)}</span>
          </h1>
        </header>

        {/* Row 1: Role Models + Opportunities (swapped to the top) */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="Role Models" tone="lilac" emoji="✨">
            <div className="space-y-4">
              {(r.roleModels ?? []).map((rm, i) => (
                <div key={i} className="rounded-xl bg-card/80 border border-border p-3 flex gap-3 items-start">
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
                <div key={i} className="rounded-xl bg-card/80 border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">{o.title}</div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${o.confidence === "High" ? "bg-primary/20 text-primary border border-primary/40" : o.confidence === "Medium" ? "bg-amber/10 text-amber border border-amber/30" : "bg-muted text-muted-foreground"}`}>{o.confidence}</span>
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
            <div className="mt-4 grid md:grid-cols-3 gap-3">
              {SUMMARY_SECTIONS.map((sec, i) => {
                const body = (r.summary?.bullets ?? [])[i];
                if (!body) return null;
                return (
                  <div key={sec.label} className={`rounded-2xl border p-5 ${sec.className}`}>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <span>{sec.emoji}</span> {sec.label}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">{body}</p>
                  </div>
                );
              })}
            </div>
            {r.summary?.motivation && (
              <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 p-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">A note for you ✧</div>
                <p className="text-base italic text-foreground/90 leading-relaxed">{r.summary.motivation}</p>
              </div>
            )}
          </Panel>
        </div>

        {/* Row 3: Roadmap + Podcasts */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="Roadmap" tone="peach" emoji="🛤️">
            <ol className="space-y-3">
              {(r.roadmap ?? []).map((m, i) => (
                <li key={i} className="rounded-xl bg-card/80 border border-border p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-primary">{m.horizon}</div>
                  <div className="mt-0.5 text-sm">{m.action}</div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Podcasts" tone="lemon" emoji="🎧">
            <div className="space-y-3">
              {(r.podcasts ?? []).map((p, i) => (
                <div key={i} className="rounded-xl bg-card/80 border border-border p-3 flex gap-3 items-start">
                  <PodcastThumb title={p.title} url={p.thumbnailUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm truncate">{p.title}</div>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-[10px] font-mono uppercase text-primary hover:underline shrink-0">Listen ↗</a>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">by {p.host}</div>
                    <div className="text-xs mt-1">{p.pitch}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Perspective — motivational stats */}
        {r.perspective && (
          <div className="mt-8">
            <PerspectiveFunnel
              source={r.perspective.source}
              userStepValue={r.perspective.lessPrivileged?.number || r.perspective.statNumber}
              userStepLabel={r.perspective.lessPrivileged?.label || r.perspective.stat}
              belowYou={r.perspective.belowYou}
            />
          </div>
        )}
      </div>
      </div>
    </main>
  );
}

function PerspectiveFunnel({
  source,
  userStepValue,
  userStepLabel,
}: {
  source?: string;
  userStepValue?: string;
  userStepLabel?: string;
}) {
  const steps = [
    { value: "1.4 Billion", label: "Indians" },
    { value: "320 Million", label: "Young People" },
    {
      value: userStepValue?.trim() || "32 Million",
      label: userStepLabel?.trim() || "College Students",
    },
    { value: "You", label: "", isYou: true },
  ];
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          setIndex(0);
          setDone(false);
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    if (index >= steps.length - 1) {
      const t = setTimeout(() => setDone(true), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIndex((i) => i + 1), 1400);
    return () => clearTimeout(t);
  }, [index, hasStarted]);

  return (
    <div ref={containerRef} className="perspective-aurora relative overflow-hidden rounded-3xl border border-primary/30 p-6 md:p-10 shadow-[0_20px_60px_-25px_rgba(255,209,0,0.4)]">
      {/* Animated aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-primary/25 blur-3xl animate-aurora-a" />
        <div className="absolute top-1/3 -right-24 h-[380px] w-[380px] rounded-full bg-amber/20 blur-3xl animate-aurora-b" />
        <div className="absolute -bottom-32 left-1/3 h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl animate-aurora-c" />
        <div className="absolute inset-0 opacity-[0.18] mix-blend-screen [background-image:radial-gradient(rgba(255,209,0,0.35)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/70" />
      </div>
      <div className="text-[11px] font-mono uppercase tracking-widest text-primary">Perspective ✧</div>
      <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold tracking-tight text-balance">
        Zoom in on where you stand ✦
      </h3>

      <div className="mt-10 flex flex-col items-center gap-3 min-h-[280px] justify-center">
        {steps.slice(0, index + 1).map((s, i) => {
          const isCurrent = i === index;
          const isYou = s.isYou;
          return (
            <div key={i} className="flex flex-col items-center gap-2 w-full">
              <div
                key={`step-${i}`}
                className={`text-center transition-all duration-700 ${
                  isCurrent ? "animate-scale-in" : "opacity-40 scale-90"
                }`}
                style={isYou && isCurrent ? {
                  textShadow: "0 0 40px var(--amber), 0 0 80px rgba(255,209,0,0.4)",
                } : undefined}
              >
                <div
                  className={`font-display font-bold tracking-tight leading-none ${
                    isYou
                      ? "text-6xl md:text-8xl text-primary"
                      : "text-3xl md:text-5xl text-foreground"
                  }`}
                >
                  {s.value}
                </div>
                {s.label && (
                  <div className="mt-2 text-xs md:text-sm font-mono uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </div>
                )}
              </div>
              {i < index && (
                <div className="text-primary/60 text-2xl animate-fade-in">↓</div>
              )}
            </div>
          );
        })}
      </div>

      {done && (
        <div className="mt-8 flex flex-col items-center text-center gap-5 animate-fade-in">
          <p className="text-base md:text-lg text-foreground/90 leading-relaxed max-w-2xl text-balance">
            You're among the few who have the opportunity to pursue higher education.
            Your future won't be defined by getting into college, but by what you choose to build from here.
          </p>
          {source && (
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Source · {source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  blue: "bg-card",
  mint: "bg-card",
  peach: "bg-card",
  lilac: "bg-card",
  lemon: "bg-card",
};

const SUMMARY_SECTIONS: Array<{ label: string; emoji: string; className: string }> = [
  { label: "Existing capabilities", emoji: "🌟", className: "bg-card border-amber/30" },
  { label: "Improvements to unlock", emoji: "🚀", className: "bg-card border-amber/30" },
  { label: "Motivation for you", emoji: "💛", className: "bg-card border-amber/30" },
];

function Panel({ title, tone, emoji, children }: { title: string; tone: keyof typeof TONE_BG; emoji?: string; children: React.ReactNode }) {
  return (
    <section className={`${TONE_BG[tone]} rounded-3xl border border-amber/20 p-5 shadow-[0_10px_40px_-20px_rgba(255,209,0,0.25)] transition-transform hover:-translate-y-0.5`}>
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">{emoji}</span>
        <div className="text-xs font-mono uppercase tracking-widest text-amber">{title}</div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatShort(raw: string): string {
  if (!raw) return "0";
  const s = String(raw).trim();
  const m = s.match(/([\d,.]+)\s*(million|billion|thousand|crore|lakh|k|m|b|t)?/i);
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
  };
  const total = numRaw * (mult[unit] ?? 1);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (total >= 1_000_000_000) return `${fmt(Math.round((total / 1_000_000_000) * 10) / 10)} billion`;
  if (total >= 1_000_000) return `${fmt(Math.round((total / 1_000_000) * 10) / 10)} million`;
  if (total >= 1_000) return `${fmt(Math.round((total / 1_000) * 10) / 10)} thousand`;
  return String(Math.round(total));
}


function downloadReport(session: Session) {
  const r = session.result;
  if (!r) return;
  const a = r.analysis;
  const answers = session.answersFlat ?? [];

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureRoom = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const writeParagraph = (text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number }) => {
    const size = opts?.size ?? 11;
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts?.color ?? [40, 40, 55]));
    const lines = doc.splitTextToSize(String(text ?? ""), contentW) as string[];
    for (const line of lines) {
      ensureRoom(size + 4);
      doc.text(line, margin, y);
      y += size + 4;
    }
    y += opts?.gap ?? 4;
  };
  const writeH2 = (t: string) => {
    ensureRoom(28);
    doc.setFillColor(255, 214, 51);
    doc.rect(margin, y - 12, 4, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 30, 60);
    doc.text(t, margin + 12, y);
    y += 14;
    doc.setDrawColor(230, 230, 235);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  };
  const writeKV = (k: string, v: string) => {
    ensureRoom(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 110);
    doc.text(k, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 55);
    const lines = doc.splitTextToSize(v || "—", contentW - 130) as string[];
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) { y += 13; ensureRoom(13); }
      doc.text(lines[i], margin + 130, y);
    }
    y += 16;
  };

  // Header band
  doc.setFillColor(255, 214, 51);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 55);
  doc.text("MYFLOW · PERSONAL REPORT", margin, 34);
  doc.setFontSize(22);
  doc.text(`${session.name}'s MyFlow snapshot`, margin, 62);
  y = 110;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 130);
  doc.text(
    `Generated ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`,
    margin,
    y,
  );
  y += 22;

  writeH2("Your profile");
  writeKV("Name", session.name);
  writeKV("Age", String(session.age));
  writeKV("Stage", session.education ?? "—");
  writeKV("Skills", (session.skills ?? []).join(", ") || "—");
  if (session.customSkill) writeKV("Custom skills", session.customSkill);
  writeKV("Current goal", session.goal ?? "—");
  writeKV("One-line self", session.oneLiner ?? "—");

  writeH2("Summary");
  if (r.summary?.headline) writeParagraph(r.summary.headline, { size: 13, bold: true, color: [20, 20, 40] });
  const bullets = r.summary?.bullets ?? [];
  const sectionLabels = ["Existing capabilities", "Improvements to unlock", "Motivation for you"];
  bullets.forEach((b, i) => {
    writeParagraph(sectionLabels[i] ?? `Note ${i + 1}`, { size: 10, bold: true, color: [180, 120, 0], gap: 2 });
    writeParagraph(b, { size: 11, gap: 8 });
  });
  if (r.summary?.motivation) writeParagraph(r.summary.motivation, { size: 11, color: [60, 60, 90] });

  if (a) {
    writeH2("Personality analysis");
    writeParagraph(a.personality);
    writeParagraph("Motivations", { size: 10, bold: true, color: [90, 90, 110], gap: 2 });
    writeParagraph(a.motivations);
    writeParagraph("Learning style", { size: 10, bold: true, color: [90, 90, 110], gap: 2 });
    writeParagraph(a.learningStyle);
    if (a.interests?.length) writeParagraph("Interests: " + a.interests.join(", "));
    writeH2("Strengths");
    a.strengths.forEach((s) => writeParagraph("• " + s, { gap: 2 }));
    writeH2("Growth areas");
    a.growthAreas.forEach((s) => writeParagraph("• " + s, { gap: 2 }));
    if (a.blindSpots?.length) {
      writeParagraph("Potential blind spots", { size: 10, bold: true, color: [90, 90, 110], gap: 2 });
      a.blindSpots.forEach((s) => writeParagraph("• " + s, { gap: 2 }));
    }
    writeH2("Career insights");
    writeParagraph(a.careerInsights);
  }

  writeH2("Role models");
  (r.roleModels ?? []).forEach((rm) => {
    writeParagraph(rm.name, { size: 12, bold: true, gap: 2 });
    writeParagraph(rm.why, { size: 10, color: [90, 90, 110] });
  });

  writeH2("Roadmap");
  (r.roadmap ?? []).forEach((m) => writeParagraph(`• ${m.horizon}: ${m.action}`, { gap: 2 }));

  writeH2("Opportunities");
  (r.opportunities ?? []).forEach((o) => {
    writeParagraph(`${o.title} (${o.confidence})`, { size: 12, bold: true, gap: 2 });
    writeParagraph(`${o.org} · ${o.stipend}`, { size: 10, color: [90, 90, 110], gap: 2 });
    if (o.url) writeParagraph(o.url, { size: 9, color: [80, 90, 160] });
  });

  writeH2("Podcasts");
  (r.podcasts ?? []).forEach((p) => {
    writeParagraph(`${p.title} — ${p.host}`, { size: 12, bold: true, gap: 2 });
    writeParagraph(p.pitch, { size: 10, gap: 2 });
    if (p.url) writeParagraph(p.url, { size: 9, color: [80, 90, 160] });
  });

  if (r.perspective) {
    writeH2("Perspective");
    writeParagraph(r.perspective.headline, { size: 13, bold: true });
    writeParagraph(r.perspective.lessPrivileged?.number || r.perspective.statNumber, { size: 22, bold: true, color: [20, 20, 40] });
    writeParagraph(r.perspective.lessPrivileged?.label || r.perspective.stat, { size: 10, color: [90, 90, 110] });
    writeParagraph(r.perspective.lessPrivileged?.message || r.perspective.simpleMeaning || r.perspective.message);
    if (r.perspective.source) writeParagraph("Source: " + r.perspective.source, { size: 9, color: [130, 130, 150] });
  }

  if (answers.length) {
    writeH2("Your questionnaire responses");
    answers.forEach((x, i) => {
      writeParagraph(`${i + 1}. ${x.question}`, { size: 10, bold: true, color: [60, 60, 90], gap: 2 });
      writeParagraph(x.skipped ? "(Skipped)" : `${x.answer ?? ""}${x.custom ? ` — "${x.custom}"` : ""}`, { size: 10, gap: 6 });
    });
  }

  if (a?.conclusion) {
    writeH2("A note to close");
    writeParagraph(a.conclusion, { size: 11, color: [60, 60, 90] });
  }

  doc.save(`myflow-report-${session.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
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

function shortMotivation(text: string, name: string): string {
  if (!text) return "your journey starts here";
  let t = String(text).trim();
  const nameRe = new RegExp(`^(?:${name}[\\s,:—-]+)+`, "i");
  t = t.replace(nameRe, "");
  t = t.replace(new RegExp(`[,\\s]+${name}[,\\s]+`, "ig"), " ");
  const firstSentence = t.split(/(?<=[.!?])\s/)[0] || t;
  let out = firstSentence.trim();
  if (out.length > 90) {
    const cut = out.slice(0, 90);
    const lastSpace = cut.lastIndexOf(" ");
    out = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[,;:—-]+$/, "");
  }
  if (!/[.!?]$/.test(out)) out += ".";
  out = out.charAt(0).toLowerCase() + out.slice(1);
  return out;
}