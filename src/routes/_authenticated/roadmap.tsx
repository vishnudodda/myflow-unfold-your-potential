import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({ meta: [{ title: "Growth Roadmap — MyFlow" }] }),
  component: () => (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <h1 className="mt-6 font-display text-4xl font-bold">Your Growth Roadmap</h1>
        <p className="mt-4 text-muted-foreground">Complete all nine assessments to unlock your personalized 30-day, 3-month, 6-month, and 1-year roadmap.</p>
      </div>
    </div>
  ),
});