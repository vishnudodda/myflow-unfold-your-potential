import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({ meta: [{ title: "Recommendations — MyFlow" }] }),
  component: () => (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <h1 className="mt-6 font-display text-4xl font-bold">Recommendations</h1>
        <p className="mt-4 text-muted-foreground">Careers, learning resources, role models, and opportunities matched to your profile appear here after your assessments are analyzed.</p>
      </div>
    </div>
  ),
});