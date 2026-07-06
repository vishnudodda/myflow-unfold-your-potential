import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getIndustryInsights, type IndustryInsight } from "@/lib/guest.functions";
import {
  TrendingUp,
  Brain,
  GraduationCap,
  Sparkles,
  DollarSign,
  RefreshCw,
  Cpu,
  Users,
  BarChart3,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "trending-up": TrendingUp,
  brain: Brain,
  "graduation-cap": GraduationCap,
  sparkles: Sparkles,
  "dollar-sign": DollarSign,
  "refresh-cw": RefreshCw,
  cpu: Cpu,
  users: Users,
};

type Props = {
  categories?: string[];
  heading?: string;
  intro?: string;
  limit?: number;
};

export function VerifiedIndustryInsights({
  categories,
  heading = "Why this matters",
  intro = "The skills and directions you're exploring sit inside a fast-moving labor market. Here is what verified public research says about it today — so your next step is grounded in real evidence, not motivation alone.",
  limit = 4,
}: Props) {
  const fn = useServerFn(getIndustryInsights);
  const cats = categories ?? [];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["industry-insights", cats.slice().sort().join(","), limit],
    queryFn: () => fn({ data: { categories: cats, limit } }),
    staleTime: 1000 * 60 * 60 * 24, // 24h — insights change infrequently
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });

  const insights = data?.insights ?? [];

  return (
    <section
      aria-labelledby="industry-insights-heading"
      className="rounded-3xl border border-white/50 bg-white/40 backdrop-blur-xl p-6 md:p-8 shadow-[0_20px_60px_-30px_rgba(30,58,138,0.35)]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-8 items-start">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-primary">
            <BarChart3 className="h-3.5 w-3.5" />
            Industry Insights
          </div>
          <h2
            id="industry-insights-heading"
            className="mt-3 font-display text-2xl md:text-3xl font-bold tracking-tight text-balance"
          >
            {heading}
          </h2>
          <p className="mt-4 text-sm md:text-base text-foreground/75 leading-relaxed">
            {intro}
          </p>
          <p className="mt-6 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            All statistics shown are retrieved from verified public reports.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isLoading && Array.from({ length: limit }).map((_, i) => <InsightSkeleton key={i} />)}

          {isError && (
            <div className="sm:col-span-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
              <div className="font-semibold text-destructive">We couldn't verify industry insights right now.</div>
              <button
                onClick={() => refetch()}
                className="mt-2 text-xs font-mono uppercase tracking-widest text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !isError && insights.length === 0 && (
            <div className="sm:col-span-2 rounded-2xl border border-border bg-white/60 p-5 text-sm text-muted-foreground">
              No verified industry insight available for this topic.
            </div>
          )}

          {!isLoading && !isError && insights.map((it) => <InsightCard key={it.id} insight={it} />)}
        </div>
      </div>
    </section>
  );
}

function InsightCard({ insight }: { insight: IndustryInsight }) {
  const Icon = (insight.icon && ICONS[insight.icon]) || BarChart3;
  return (
    <article className="group relative rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-md p-5 shadow-[0_10px_30px_-20px_rgba(30,58,138,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-25px_rgba(30,58,138,0.45)] hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-4.5 w-4.5" strokeWidth={2} />
        </div>
        <div className="font-display text-2xl md:text-3xl font-bold tracking-tight tabular-nums text-primary">
          {insight.statistic}
        </div>
      </div>
      <h3 className="mt-3 font-semibold text-sm text-foreground">{insight.title}</h3>
      <p className="mt-1 text-xs text-foreground/70 leading-relaxed">{insight.description}</p>
      <div className="mt-4 pt-3 border-t border-border/60 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Source</div>
          <div className="text-[11px] text-foreground/80 truncate" title={insight.source}>
            {insight.source} · {insight.publicationYear}
          </div>
        </div>
        <a
          href={insight.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-primary hover:underline"
        >
          View Source
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}

function InsightSkeleton() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/50 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 rounded-xl bg-muted" />
        <div className="h-8 w-16 rounded bg-muted" />
      </div>
      <div className="mt-4 h-3 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-2.5 w-full rounded bg-muted/70" />
      <div className="mt-1.5 h-2.5 w-5/6 rounded bg-muted/70" />
      <div className="mt-5 h-2.5 w-1/2 rounded bg-muted" />
    </div>
  );
}