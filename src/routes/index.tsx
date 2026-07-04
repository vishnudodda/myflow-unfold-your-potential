import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

const MODULES = [
  { n: "01", title: "Self Identity", desc: "Uncover the core drivers that define how you interact with the world." },
  { n: "02", title: "Values & Mindset", desc: "Identify the non-negotiables that guide your decisions." },
  { n: "03", title: "Deep Insights", desc: "Surface patterns beneath the surface — stress, fear, decision style." },
  { n: "04", title: "Purpose & Ambition", desc: "Synthesize your passions into a meaningful direction." },
  { n: "05", title: "Unlock Potential", desc: "See where your untapped creativity and leadership live." },
  { n: "06", title: "Career Discovery", desc: "Match your profile against real career paths — with reasoning." },
  { n: "07", title: "Career Compass", desc: "Measure your readiness and close the gaps that matter." },
  { n: "08", title: "Habits & Productivity", desc: "Build the atomic behaviors that compound into growth." },
  { n: "09", title: "Financial Intelligence", desc: "Master money mindset, budgeting, and long-term wealth." },
];

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <span className="font-display text-xl font-bold tracking-tighter">MYFLOW</span>
          <div className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <a href="#framework" className="hover:text-foreground transition-colors">Framework</a>
            <a href="#modules" className="hover:text-foreground transition-colors">The Assessment</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium">Log in</Link>
            <Link to="/auth" className="bg-foreground text-background px-4 py-2 text-sm font-semibold rounded-full hover:bg-primary transition-all">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pt-24 pb-20 px-6" id="framework">
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
          <span className="font-display text-[40vw] font-bold tracking-tighter leading-none">FLOW</span>
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="animate-reveal font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-balance leading-[0.9]">
            The map to your <span className="font-serif italic font-normal text-primary">authentic</span> future.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            AI-powered self-discovery for the next generation. From identity to industry, MyFlow helps you navigate the complexity of growing up — with structured reflection, honest analysis, and a real roadmap.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth" className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl text-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
              Start your assessment
            </Link>
            <span className="text-sm text-muted-foreground font-medium">Designed for ages 11 to 27</span>
          </div>
        </div>
      </section>

      <section id="modules" className="py-24 px-6 border-t border-border">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Nine modules, one map</h2>
              <p className="mt-4 text-muted-foreground">A holistic diagnostic framework of nine assessments, ten questions each. Every result is generated from your own answers — never generic.</p>
            </div>
            <div className="text-sm font-mono text-primary font-bold tracking-widest uppercase">(01—09)</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border ring-1 ring-border">
            {MODULES.map((m) => (
              <div key={m.n} className="bg-background p-8 hover:bg-muted transition-colors group">
                <div className="text-xs font-mono text-muted-foreground mb-4">{m.n}</div>
                <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">{m.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="py-24 px-6 bg-stone-900 text-stone-100">
        <div className="mx-auto max-w-4xl">
          <span className="text-xs font-mono text-primary tracking-widest uppercase">How it works</span>
          <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold">From answers to roadmap in four steps.</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              ["1", "Answer", "Complete nine short questionnaires — ten questions each, four options."],
              ["2", "Analyze", "AI generates a personalized report per module: strengths, gaps, patterns, confidence scores."],
              ["3", "Match", "Careers, learning resources, role models, and opportunities ranked to your profile."],
              ["4", "Roadmap", "A living 30-day / 3-month / 6-month / 1-year plan — with concrete next actions."],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-4">
                <div className="shrink-0 size-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">{n}</div>
                <div>
                  <h3 className="font-display font-bold text-lg">{t}</h3>
                  <p className="text-sm text-stone-400 mt-1">{d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold">
              Begin your assessment →
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-display text-xl font-bold tracking-tighter">MYFLOW</span>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} MyFlow. Designed for growth.</p>
        </div>
      </footer>
    </main>
  );
}
