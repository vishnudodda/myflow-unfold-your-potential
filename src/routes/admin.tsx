import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { jsPDF } from "jspdf";
import {
  getAdminAnalytics,
  listAdminRequests,
  decideAdminRequest,
  listAuditLogs,
  listAdmins,
  removeAdmin,
  checkIsAdmin,
  type AdminUserRow,
  type AdminOverview,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin Portal — MyFlow" }, { name: "robots", content: "noindex" }] }),
  component: AdminPortal,
});

const AGE_BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: "10–13", min: 10, max: 13 },
  { label: "14–16", min: 14, max: 16 },
  { label: "17–19", min: 17, max: 19 },
  { label: "20–22", min: 20, max: 22 },
  { label: "23–27", min: 23, max: 27 },
];

const COLORS = ["#FFD100", "#F97316", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#EAB308", "#EF4444", "#06B6D4"];

function bucketOf(age: number | null): string {
  if (!age) return "Unknown";
  const b = AGE_BUCKETS.find((x) => age >= x.min && age <= x.max);
  return b ? b.label : "Other";
}

function fmtMs(ms: number) {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}m ${r}s` : `${r}s`;
}

function AdminPortal() {
  const navigate = useNavigate();
  const check = useServerFn(checkIsAdmin);
  const fetchAnalytics = useServerFn(getAdminAnalytics);
  const fetchRequests = useServerFn(listAdminRequests);
  const fetchLogs = useServerFn(listAuditLogs);
  const fetchAdmins = useServerFn(listAdmins);
  const decide = useServerFn(decideAdminRequest);
  const removeAdminFn = useServerFn(removeAdmin);

  const [ready, setReady] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [me, setMe] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/admin/login" }); return; }
      setMe(data.user.email ?? "");
      try {
        const { isAdmin } = await check();
        if (!isAdmin) { await supabase.auth.signOut(); navigate({ to: "/admin/login" }); return; }
        await refreshAll();
        setReady(true);
      } catch { navigate({ to: "/admin/login" }); }
    })();
  }, []);

  async function refreshAll() {
    const [a, r, l, ad] = await Promise.all([fetchAnalytics(), fetchRequests(), fetchLogs(), fetchAdmins()]);
    setOverview(a.overview);
    setUsers(a.users);
    setRequests(r.requests);
    setLogs(l.logs);
    setAdmins(ad.admins);
  }

  async function onDecide(id: string, decision: "approved" | "rejected") {
    const res = await decide({ data: { id, decision } });
    if (res.tempPassword) {
      alert(`Approved. Temporary password: ${res.tempPassword}\n\nShare this securely with the new admin. They should sign in and reset it.`);
    }
    await refreshAll();
  }

  async function onRemoveAdmin(user_id: string) {
    if (!confirm("Remove admin privileges from this user?")) return;
    try { await removeAdminFn({ data: { user_id } }); await refreshAll(); }
    catch (e: any) { alert(e?.message ?? "Failed"); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  if (!ready) {
    return <main className="min-h-screen flex items-center justify-center text-foreground">Loading admin portal…</main>;
  }

  return (
    <main className="min-h-screen px-4 md:px-8 py-6 text-foreground">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-display text-xl font-bold tracking-tighter"><span className="text-amber">MYFLOW</span> ✦</Link>
            <span className="text-[11px] font-mono uppercase tracking-widest text-foreground/60 px-2 py-1 rounded-full bg-amber/10 border border-amber/30">Admin Portal</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{me}</span>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap gap-1 bg-card/60 border border-amber/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="ages">Ages</TabsTrigger>
            <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
            <TabsTrigger value="requests">Requests <span className="ml-1 text-[10px] bg-amber/20 rounded-full px-1.5">{requests.filter((r) => r.status === "pending").length}</span></TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab overview={overview!} users={users} /></TabsContent>
          <TabsContent value="users"><UsersTab users={users} /></TabsContent>
          <TabsContent value="segments"><SegmentsTab users={users} /></TabsContent>
          <TabsContent value="ages"><AgesTab users={users} /></TabsContent>
          <TabsContent value="questionnaire"><QuestionnaireTab users={users} /></TabsContent>
          <TabsContent value="requests"><RequestsTab requests={requests} onDecide={onDecide} /></TabsContent>
          <TabsContent value="admins"><AdminsTab admins={admins} onRemove={onRemoveAdmin} /></TabsContent>
          <TabsContent value="audit"><AuditTab logs={logs} /></TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card/80 border border-amber/20 p-4">
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function OverviewTab({ overview, users }: { overview: AdminOverview; users: AdminUserRow[] }) {
  const trend = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      days[d.toISOString().slice(0,10)] = 0;
    }
    for (const u of users) {
      const k = new Date(u.created_at).toISOString().slice(0,10);
      if (k in days) days[k]++;
    }
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [users]);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total users" value={overview.totalUsers} />
        <Card label="Analyses" value={overview.totalAnalyses} />
        <Card label="New today" value={overview.newToday} />
        <Card label="New / week" value={overview.newThisWeek} />
        <Card label="New / month" value={overview.newThisMonth} />
        <Card label="Completion rate" value={`${overview.completionRate}%`} />
        <Card label="Avg completion time" value={fmtMs(overview.avgCompletionMs)} />
      </div>
      <div className="rounded-2xl bg-card/80 border border-amber/20 p-4">
        <div className="text-sm font-semibold mb-3">Signups (last 14 days)</div>
        <div className="w-full h-64">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #FFD10033" }} />
              <Line type="monotone" dataKey="count" stroke="#FFD100" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users }: { users: AdminUserRow[] }) {
  const [q, setQ] = useState("");
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [bucket, setBucket] = useState("all");
  const [status, setStatus] = useState("all");
  const [interest, setInterest] = useState("");
  const [skill, setSkill] = useState("");
  const [goal, setGoal] = useState("");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const mn = ageMin ? parseInt(ageMin, 10) : null;
    const mx = ageMax ? parseInt(ageMax, 10) : null;
    return users.filter((u) => {
      if (ql && ![u.name, u.email, u.goal, u.one_liner].some((s) => (s ?? "").toLowerCase().includes(ql))) return false;
      if (mn != null && (u.age ?? -1) < mn) return false;
      if (mx != null && (u.age ?? 999) > mx) return false;
      if (bucket !== "all" && bucketOf(u.age) !== bucket) return false;
      if (status === "completed" && !u.completed) return false;
      if (status === "incomplete" && u.completed) return false;
      if (interest && !(u.interests ?? []).some((i) => i.toLowerCase().includes(interest.toLowerCase()))) return false;
      if (skill && !(u.skills ?? []).some((i) => i.toLowerCase().includes(skill.toLowerCase()))) return false;
      if (goal && !(u.goal ?? "").toLowerCase().includes(goal.toLowerCase())) return false;
      return true;
    });
  }, [users, q, ageMin, ageMax, bucket, status, interest, skill, goal]);

  function exportCsv() {
    const rows = [
      ["Name", "Age", "Email", "Goal", "Skills", "Interests", "Education", "Completed", "Duration", "Joined"],
      ...filtered.map((u) => [
        u.name, u.age ?? "", u.email ?? "", u.goal ?? "",
        (u.skills ?? []).join("; "),
        (u.interests ?? []).join("; "),
        u.education ?? "",
        u.completed ? "yes" : "no",
        fmtMs(u.duration_ms ?? 0),
        new Date(u.created_at).toISOString(),
      ]),
    ];
    downloadCsv("myflow-users.csv", rows);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14); doc.text("MyFlow — Users", 14, 14);
    doc.setFontSize(9);
    let y = 24;
    doc.text("Name | Age | Email | Goal | Interests | Completed | Joined", 14, y); y += 6;
    for (const u of filtered.slice(0, 200)) {
      const line = `${u.name} | ${u.age ?? "-"} | ${u.email ?? "-"} | ${(u.goal ?? "").slice(0, 30)} | ${(u.interests ?? []).slice(0,3).join(",")} | ${u.completed ? "Y" : "N"} | ${new Date(u.created_at).toLocaleDateString()}`;
      doc.text(line.slice(0, 180), 14, y);
      y += 5;
      if (y > 200) { doc.addPage(); y = 14; }
    }
    doc.save("myflow-users.pdf");
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl bg-card/80 border border-amber/20 p-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <Input placeholder="Search name/email/goal" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2">
          <Input placeholder="Age min" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
          <Input placeholder="Age max" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
        </div>
        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger><SelectValue placeholder="Age group" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All age groups</SelectItem>
            {AGE_BUCKETS.map((b) => <SelectItem key={b.label} value={b.label}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Filter interest" value={interest} onChange={(e) => setInterest(e.target.value)} />
        <Input placeholder="Filter skill" value={skill} onChange={(e) => setSkill(e.target.value)} />
        <Input placeholder="Filter goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="flex-1">Export CSV</Button>
          <Button variant="outline" onClick={exportPdf} className="flex-1">Export PDF</Button>
        </div>
      </div>

      <div className="rounded-2xl bg-card/80 border border-amber/20 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="p-3">Name</th><th className="p-3">Age</th><th className="p-3">Email</th>
              <th className="p-3">Goal</th><th className="p-3">Interests</th><th className="p-3">Skills</th>
              <th className="p-3">Status</th><th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((u) => (
              <tr key={u.id} className="border-b border-border/40 hover:bg-amber/5">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3">{u.age ?? "—"}</td>
                <td className="p-3">{u.email ?? "—"}</td>
                <td className="p-3 max-w-[200px] truncate" title={u.goal ?? ""}>{u.goal ?? "—"}</td>
                <td className="p-3 max-w-[200px] truncate">{(u.interests ?? []).join(", ") || "—"}</td>
                <td className="p-3 max-w-[200px] truncate">{(u.skills ?? []).join(", ") || "—"}</td>
                <td className="p-3">{u.completed ? <span className="text-emerald-500">✓</span> : <span className="text-amber">…</span>}</td>
                <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 text-xs text-muted-foreground">{filtered.length} users {filtered.length > 500 ? "(showing first 500)" : ""}</div>
      </div>
    </div>
  );
}

function SegmentsTab({ users }: { users: AdminUserRow[] }) {
  const segments = useMemo(() => {
    const map = new Map<string, AdminUserRow[]>();
    for (const u of users) {
      const ints = u.interests?.length ? u.interests : ["Other"];
      for (const i of ints) {
        const list = map.get(i) ?? [];
        list.push(u); map.set(i, list);
      }
    }
    const total = users.length || 1;
    return Array.from(map.entries()).map(([name, rows]) => {
      const ages = rows.map((r) => r.age ?? 0).filter(Boolean);
      const avgAge = ages.length ? Math.round((ages.reduce((a,b)=>a+b,0)/ages.length) * 10) / 10 : 0;
      const goals = topCounts(rows.map((r) => r.goal ?? "").filter(Boolean), 3);
      const skills = topCounts(rows.flatMap((r) => r.skills ?? []), 5);
      return { name, count: rows.length, pct: Math.round((rows.length / total) * 1000) / 10, avgAge, goals, skills };
    }).sort((a,b) => b.count - a.count);
  }, [users]);

  const pieData = segments.slice(0, 10).map((s) => ({ name: s.name, value: s.count }));

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-card/80 border border-amber/20 p-4">
          <div className="text-sm font-semibold mb-3">Top 10 segments</div>
          <div className="w-full h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #FFD10033" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl bg-card/80 border border-amber/20 p-4">
          <div className="text-sm font-semibold mb-3">Users per segment</div>
          <div className="w-full h-72">
            <ResponsiveContainer>
              <BarChart data={segments.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-25} textAnchor="end" height={70} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #FFD10033" }} />
                <Bar dataKey="count" fill="#FFD100" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-card/80 border border-amber/20 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
            <tr><th className="p-3">Segment</th><th className="p-3">Users</th><th className="p-3">%</th><th className="p-3">Avg age</th><th className="p-3">Top goals</th><th className="p-3">Top skills</th></tr>
          </thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.name} className="border-b border-border/40">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.count}</td>
                <td className="p-3">{s.pct}%</td>
                <td className="p-3">{s.avgAge || "—"}</td>
                <td className="p-3 max-w-[240px] truncate">{s.goals.map((g) => g.label).join(", ") || "—"}</td>
                <td className="p-3 max-w-[240px] truncate">{s.skills.map((g) => g.label).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgesTab({ users }: { users: AdminUserRow[] }) {
  const perAge = useMemo(() => {
    const map: Record<number, number> = {};
    for (let a = 10; a <= 27; a++) map[a] = 0;
    for (const u of users) if (u.age && u.age in map) map[u.age]++;
    return Object.entries(map).map(([age, count]) => ({ age, count }));
  }, [users]);

  const buckets = useMemo(() => {
    const total = users.length || 1;
    return AGE_BUCKETS.map((b) => {
      const rows = users.filter((u) => u.age && u.age >= b.min && u.age <= b.max);
      const interests = topCounts(rows.flatMap((r) => r.interests ?? []), 5);
      const goals = topCounts(rows.map((r) => r.goal ?? "").filter(Boolean), 3);
      return { ...b, count: rows.length, pct: Math.round((rows.length / total) * 1000) / 10, interests, goals };
    });
  }, [users]);

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl bg-card/80 border border-amber/20 p-4">
        <div className="text-sm font-semibold mb-3">Users by age (10–27)</div>
        <div className="w-full h-72">
          <ResponsiveContainer>
            <BarChart data={perAge}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="age" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #FFD10033" }} />
              <Bar dataKey="count" fill="#F97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {buckets.map((b) => (
          <div key={b.label} className="rounded-2xl bg-card/80 border border-amber/20 p-4">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-xl font-bold">{b.label}</div>
              <div className="text-sm text-muted-foreground">{b.count} · {b.pct}%</div>
            </div>
            <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Top interests</div>
            <div className="text-sm">{b.interests.map((i) => `${i.label} (${i.count})`).join(", ") || "—"}</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">Top goals</div>
            <div className="text-sm">{b.goals.map((i) => i.label).join(", ") || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionnaireTab({ users }: { users: AdminUserRow[] }) {
  const answers = useMemo(() => {
    const chosen: string[] = [];
    const skipped: string[] = [];
    const others: string[] = [];
    for (const u of users) {
      const arr = Array.isArray(u.answers) ? u.answers : (u.answers?.items ?? []);
      if (!Array.isArray(arr)) continue;
      for (const a of arr) {
        const q = String(a.question ?? "").trim();
        if (a.skipped) { if (q) skipped.push(q); continue; }
        if (a.answer) chosen.push(String(a.answer));
        if (a.custom) others.push(String(a.custom));
      }
    }
    return {
      topAnswers: topCounts(chosen, 15),
      topSkipped: topCounts(skipped, 10),
      topOthers: topCounts(others, 10),
    };
  }, [users]);

  const topGoals = useMemo(() => topCounts(users.map((u) => u.goal ?? "").filter(Boolean), 10), [users]);
  const topOneLiners = useMemo(() => topCounts(users.map((u) => u.one_liner ?? "").filter(Boolean), 10), [users]);
  const topSkills = useMemo(() => topCounts(users.flatMap((u) => u.skills ?? []), 15), [users]);
  const topCustomSkills = useMemo(() => topCounts(users.map((u) => u.custom_skill ?? "").filter(Boolean), 10), [users]);

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <List title="Most selected answers" items={answers.topAnswers} />
      <List title="Most skipped questions" items={answers.topSkipped} />
      <List title="Most common 'Other' responses" items={answers.topOthers} />
      <List title="Most common goals" items={topGoals} />
      <List title="Most common self-descriptions" items={topOneLiners} />
      <List title="Most selected skills" items={topSkills} />
      <List title="Most entered custom skills" items={topCustomSkills} />
    </div>
  );
}

function List({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  return (
    <div className="rounded-2xl bg-card/80 border border-amber/20 p-4">
      <div className="text-sm font-semibold mb-3">{title}</div>
      {items.length === 0 ? <div className="text-sm text-muted-foreground">No data yet.</div> : (
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.label} className="flex justify-between gap-3">
              <span className="truncate">{i.label}</span>
              <span className="text-muted-foreground shrink-0">{i.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestsTab({ requests, onDecide }: { requests: any[]; onDecide: (id: string, d: "approved" | "rejected") => void }) {
  return (
    <div className="mt-6 rounded-2xl bg-card/80 border border-amber/20 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
          <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Reason</th><th className="p-3">Status</th><th className="p-3">Requested</th><th className="p-3">Actions</th></tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No requests yet.</td></tr>
          ) : requests.map((r) => (
            <tr key={r.id} className="border-b border-border/40">
              <td className="p-3">{r.full_name ?? "—"}</td>
              <td className="p-3">{r.email}</td>
              <td className="p-3 max-w-[300px] truncate" title={r.reason ?? ""}>{r.reason ?? "—"}</td>
              <td className="p-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : r.status === "rejected" ? "bg-rose-500/20 text-rose-400" : "bg-amber/20 text-amber"}`}>{r.status}</span>
              </td>
              <td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="p-3">
                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onDecide(r.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => onDecide(r.id, "rejected")}>Reject</Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Reviewed {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ""}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminsTab({ admins, onRemove }: { admins: any[]; onRemove: (uid: string) => void }) {
  return (
    <div className="mt-6 rounded-2xl bg-card/80 border border-amber/20 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
          <tr><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Since</th><th className="p-3"></th></tr>
        </thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.user_id + a.role} className="border-b border-border/40">
              <td className="p-3">{a.email || a.user_id}</td>
              <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${a.role === "super_admin" ? "bg-amber/30 text-amber" : "bg-blue-500/20 text-blue-400"}`}>{a.role}</span></td>
              <td className="p-3">{new Date(a.created_at).toLocaleDateString()}</td>
              <td className="p-3">{a.role === "admin" ? <Button size="sm" variant="outline" onClick={() => onRemove(a.user_id)}>Remove</Button> : <span className="text-xs text-muted-foreground">Protected</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab({ logs }: { logs: any[] }) {
  return (
    <div className="mt-6 rounded-2xl bg-card/80 border border-amber/20 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
          <tr><th className="p-3">When</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Target</th></tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-border/40">
              <td className="p-3">{new Date(l.created_at).toLocaleString()}</td>
              <td className="p-3">{l.actor_email ?? l.actor_id ?? "—"}</td>
              <td className="p-3"><code className="text-xs">{l.action}</code></td>
              <td className="p-3">{l.target ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function topCounts(items: string[], n: number) {
  const map = new Map<string, number>();
  for (const raw of items) {
    const k = String(raw).trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a,b) => b[1]-a[1]).slice(0, n).map(([label, count]) => ({ label, count }));
}

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}