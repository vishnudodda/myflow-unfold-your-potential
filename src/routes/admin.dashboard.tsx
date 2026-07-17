import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOverview, decideAdminRequest, type AdminOverview } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin Dashboard — MyFlow" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

const PIE_COLORS = ["#f59e0b", "#a78bfa", "#34d399", "#60a5fa", "#f472b6", "#f87171", "#facc15", "#22d3ee"];

function AdminDashboard() {
  const navigate = useNavigate();
  const load = useServerFn(getAdminOverview);
  const decide = useServerFn(decideAdminRequest);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [interestFilter, setInterestFilter] = useState<string>("");
  const [ageGroup, setAgeGroup] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) { navigate({ to: "/admin/login" }); return; }
      try {
        const d = await load({});
        setData(d);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
        navigate({ to: "/admin/login" });
      } finally {
        setLoading(false);
      }
    })();
  }, [load, navigate]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter((u) => {
      if (q) {
        const hay = `${u.name} ${u.email ?? ""} ${u.goal ?? ""} ${u.skills.join(" ")} ${u.interests.join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (interestFilter && !u.interests.includes(interestFilter)) return false;
      if (ageGroup && u.age !== null) {
        const a = u.age;
        const [lo, hi] = ageGroup.split("-").map(Number);
        if (!(a >= lo && a <= hi)) return false;
      }
      return true;
    });
  }, [data, q, interestFilter, ageGroup]);

  async function onDecide(id: string, decision: "approved" | "rejected") {
    try {
      const res = await decide({ data: { id, decision } });
      toast.success(decision === "approved" ? "Approved" : "Rejected");
      if (decision === "approved" && res.inviteLink) {
        navigator.clipboard?.writeText(res.inviteLink);
        toast.info("Password-set link copied to clipboard");
      }
      const d = await load({});
      setData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  function exportCsv() {
    if (!filteredUsers.length) return;
    const cols = ["name","age","email","education","goal","skills","interests","completed","created_at"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [cols.join(","), ...filteredUsers.map((u) =>
      [u.name, u.age, u.email, u.education, u.goal, u.skills.join("|"), u.interests.join("|"), u.completed, u.created_at].map(esc).join(","),
    )];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `myflow-users-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <main className="min-h-screen grid place-items-center text-muted-foreground">Loading dashboard…</main>;
  if (!data) return null;

  return (
    <main className="min-h-screen text-foreground px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
            <span className="text-[11px] font-mono uppercase tracking-widest bg-amber/10 text-amber px-3 py-1 rounded-full border border-amber/30">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={exportCsv}>Export CSV</Button>
            <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </div>

        <h1 className="mt-8 font-display text-3xl md:text-4xl font-bold tracking-tight">Overview</h1>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Total users" value={data.totalSessions} />
          <Stat label="New today" value={data.today} />
          <Stat label="This week" value={data.week} />
          <Stat label="This month" value={data.month} />
          <Stat label="Avg age" value={data.avgAge ?? "—"} />
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Users by age group">
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={data.byAgeBucket}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="bucket" stroke="currentColor" fontSize={12} />
                  <YAxis stroke="currentColor" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Top interests">
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.byInterest.slice(0, 8)} dataKey="count" nameKey="interest" outerRadius={90} label>
                    {data.byInterest.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Top skills" className="mt-4">
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data.bySkill} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" stroke="currentColor" fontSize={12} />
                <YAxis type="category" dataKey="skill" stroke="currentColor" fontSize={11} width={140} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="#a78bfa" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={`Access requests (${data.pendingRequests.length} pending)`} className="mt-4">
          {data.pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.pendingRequests.map((r) => (
                <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.email}</div>
                    {r.reason ? <div className="text-xs text-muted-foreground mt-0.5">{r.reason}</div> : null}
                    <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onDecide(r.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => onDecide(r.id, "rejected")}>Reject</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Users (${filteredUsers.length})`} className="mt-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <Input placeholder="Search name, email, goal, skill…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <select value={interestFilter} onChange={(e) => setInterestFilter(e.target.value)} className="rounded-md border border-border bg-background px-3 text-sm">
              <option value="">All interests</option>
              {data.byInterest.map((i) => <option key={i.interest} value={i.interest}>{i.interest} ({i.count})</option>)}
            </select>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="rounded-md border border-border bg-background px-3 text-sm">
              <option value="">All ages</option>
              <option value="10-13">10–13</option>
              <option value="14-16">14–16</option>
              <option value="17-19">17–19</option>
              <option value="20-22">20–22</option>
              <option value="23-27">23–27</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Age</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Goal</th>
                  <th className="py-2 pr-3">Interests</th>
                  <th className="py-2 pr-3">Skills</th>
                  <th className="py-2 pr-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 200).map((u) => (
                  <tr key={u.id} className="border-t border-border/60 align-top">
                    <td className="py-2 pr-3 font-medium">{u.name}</td>
                    <td className="py-2 pr-3">{u.age ?? "—"}</td>
                    <td className="py-2 pr-3">{u.email ?? "—"}</td>
                    <td className="py-2 pr-3 max-w-xs truncate" title={u.goal ?? ""}>{u.goal ?? "—"}</td>
                    <td className="py-2 pr-3">{u.interests.join(", ")}</td>
                    <td className="py-2 pr-3">{u.skills.slice(0, 4).join(", ")}{u.skills.length > 4 ? "…" : ""}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card/60 backdrop-blur p-5 ${className}`}>
      <h2 className="font-display text-lg font-semibold tracking-tight mb-3">{title}</h2>
      {children}
    </section>
  );
}