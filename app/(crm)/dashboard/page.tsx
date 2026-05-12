"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-crm/card"
import {
  format, subDays, eachDayOfInterval, isSameDay, formatDistanceToNow,
} from "date-fns"
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Users, Mail, Eye, TrendingUp, GitBranch, MessageSquare,
  UserPlus, Loader2, Activity, MousePointer,
} from "lucide-react"
import Link from "next/link"
import DashboardReminders from "./reminders"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

interface DailyPoint { label: string; emails: number; leads: number }
interface FunnelItem  { name: string; value: number; pct: string }
interface StatusSlice { name: string; value: number }
interface SequenceStats { active: number; completed: number; replied: number; total: number }
interface ActivityItem  {
  id: string
  type: "email" | "sms" | "lead"
  label: string
  detail: string
  time: string
}
interface DashboardData {
  totalLeads: number
  emailsSent30d: number
  openRate: number
  repliedLeads: number
  activeEnrollments: number
  smsSent30d: number
  dailyActivity: DailyPoint[]
  emailFunnel: FunnelItem[]
  leadStatuses: StatusSlice[]
  sequenceStats: SequenceStats
  activityFeed: ActivityItem[]
  reminders: {
    id: string; lead_id: string; note: string | null
    remind_at: string; lead_name: string; lead_company: string
  }[]
}

// ── Palette ──────────────────────────────────────────────────────────────────

const PIE_COLORS: Record<string, string> = {
  new:       "#6366f1",
  contacted: "#f59e0b",
  replied:   "#a855f7",
  converted: "#10b981",
  rejected:  "#ef4444",
}
const FUNNEL_COLORS = ["#6366f1", "#818cf8", "#a5b4fc"]

// ── Tooltip style helper ──────────────────────────────────────────────────────

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const activeWorkspaceId = useCrmWorkspaceStore((s) => s.activeWorkspaceId)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspaceId) return

    async function load() {
      setLoading(true)
      const now = new Date()
      const thirtyDaysAgo = subDays(now, 30).toISOString()
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString()
      const wsId = activeWorkspaceId!

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [
        { count: totalLeads },
        { count: repliedLeads },
        { data: emailLogs30d },
        { data: leadDates30d },
        { data: enrollmentRows },
        { count: smsSent30d },
        { data: allLeadStatuses },
        { data: recentEmails },
        { data: recentSms },
        { data: recentNewLeads },
        { data: dueReminders },
      ] = await Promise.all([
        supabase.from("leadboard").select("*", { count: "exact", head: true }).eq("workspace_id", wsId),
        supabase.from("leadboard").select("*", { count: "exact", head: true }).eq("workspace_id", wsId).eq("status", "replied"),
        supabase.from("email_logs").select("sent_at, open_count, click_count").eq("workspace_id", wsId).gte("sent_at", thirtyDaysAgo),
        supabase.from("leadboard").select("created_at").eq("workspace_id", wsId).gte("created_at", thirtyDaysAgo),
        supabase.from("sequence_enrollments").select("status").eq("user_id", user.id).in("status", ["active", "completed", "replied"]),
        supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("workspace_id", wsId).eq("direction", "outbound").gte("sent_at", thirtyDaysAgo),
        supabase.from("leadboard").select("status").eq("workspace_id", wsId),
        supabase.from("email_logs").select("to_email, subject, sent_at").eq("workspace_id", wsId).order("sent_at", { ascending: false }).limit(10),
        supabase.from("sms_logs").select("to_number, body, sent_at").eq("workspace_id", wsId).order("sent_at", { ascending: false }).limit(5),
        supabase.from("leadboard").select("full_name, company, created_at").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(5),
        supabase.from("follow_up_reminders")
          .select("id, remind_at, note, lead_id, leadboard(full_name, company)")
          .eq("workspace_id", wsId).eq("is_done", false).lte("remind_at", tomorrow).order("remind_at"),
      ])

      // ── KPIs ──
      const sent = emailLogs30d?.length ?? 0
      const opened  = (emailLogs30d ?? []).filter(e => (e.open_count  ?? 0) > 0).length
      const clicked = (emailLogs30d ?? []).filter(e => (e.click_count ?? 0) > 0).length
      const openRate = sent > 0 ? Math.round(opened / sent * 100) : 0

      // ── Sequence breakdown ──
      const seqActive    = (enrollmentRows ?? []).filter(e => e.status === "active").length
      const seqCompleted = (enrollmentRows ?? []).filter(e => e.status === "completed").length
      const seqReplied   = (enrollmentRows ?? []).filter(e => e.status === "replied").length

      // ── Daily activity (last 30 days) ──
      const days = eachDayOfInterval({ start: subDays(now, 29), end: now })
      const dailyActivity: DailyPoint[] = days.map(day => ({
        label:  format(day, "MMM d"),
        emails: (emailLogs30d ?? []).filter(e => isSameDay(new Date(e.sent_at), day)).length,
        leads:  (leadDates30d  ?? []).filter(l => isSameDay(new Date(l.created_at), day)).length,
      }))

      // ── Email funnel ──
      const emailFunnel: FunnelItem[] = [
        { name: "Sent",    value: sent,    pct: "100%" },
        { name: "Opened",  value: opened,  pct: sent > 0 ? `${openRate}%` : "—" },
        { name: "Clicked", value: clicked, pct: sent > 0 ? `${Math.round(clicked / sent * 100)}%` : "—" },
      ]

      // ── Lead status pie ──
      const statusCounts: Record<string, number> = {}
      for (const l of allLeadStatuses ?? []) {
        statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1
      }
      const leadStatuses: StatusSlice[] = Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))

      // ── Activity feed (merge email + SMS + new leads) ──
      const activityFeed: ActivityItem[] = [
        ...(recentEmails ?? []).map((e, i) => ({
          id: `email-${i}`, type: "email" as const,
          label: `Email → ${e.to_email}`,
          detail: e.subject ?? "(no subject)",
          time: e.sent_at,
        })),
        ...(recentSms ?? []).map((s, i) => ({
          id: `sms-${i}`, type: "sms" as const,
          label: `SMS → ${s.to_number}`,
          detail: (s.body ?? "").slice(0, 70),
          time: s.sent_at,
        })),
        ...(recentNewLeads ?? []).map((l, i) => ({
          id: `lead-${i}`, type: "lead" as const,
          label: `New lead: ${l.full_name}`,
          detail: l.company ?? "",
          time: l.created_at,
        })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15)

      // ── Reminders ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reminders = (dueReminders ?? []).map((r: any) => ({
        id: r.id,
        lead_id: r.lead_id,
        note: r.note,
        remind_at: r.remind_at,
        lead_name: r.leadboard?.full_name ?? "Unknown",
        lead_company: r.leadboard?.company ?? "",
      }))

      setData({
        totalLeads: totalLeads ?? 0,
        emailsSent30d: sent,
        openRate,
        repliedLeads: repliedLeads ?? 0,
        activeEnrollments: seqActive,
        smsSent30d: smsSent30d ?? 0,
        dailyActivity,
        emailFunnel,
        leadStatuses,
        sequenceStats: { active: seqActive, completed: seqCompleted, replied: seqReplied, total: seqActive + seqCompleted + seqReplied },
        activityFeed,
        reminders,
      })
      setLoading(false)
    }

    load()
  }, [activeWorkspaceId, supabase])

  if (!activeWorkspaceId || loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  // ── KPI card definitions ──
  const kpiCards = [
    { label: "Total Leads",       value: data.totalLeads,       icon: Users,         iconCn: "text-primary",                               bgCn: "bg-primary/10" },
    { label: "Emails Sent (30d)", value: data.emailsSent30d,    icon: Mail,          iconCn: "text-indigo-600 dark:text-indigo-400",        bgCn: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "Open Rate",         value: `${data.openRate}%`,   icon: Eye,           iconCn: "text-amber-600 dark:text-amber-400",          bgCn: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Clicked",           value: data.emailFunnel[2]?.value ?? 0, icon: MousePointer, iconCn: "text-blue-600 dark:text-blue-400",   bgCn: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Active Sequences",  value: data.activeEnrollments, icon: GitBranch,    iconCn: "text-purple-600 dark:text-purple-400",        bgCn: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "SMS Sent (30d)",    value: data.smsSent30d,        icon: MessageSquare, iconCn: "text-emerald-600 dark:text-emerald-400",     bgCn: "bg-emerald-50 dark:bg-emerald-900/20" },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(new Date(), "MMMM d, yyyy")} · Last 30 days
        </p>
      </div>

      {/* ── Reminders ── */}
      {data.reminders.length > 0 && <DashboardReminders reminders={data.reminders} />}

      {/* ── Row 1: 6 KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, iconCn, bgCn }) => (
          <Card key={label} className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center mb-2.5", bgCn)}>
                <Icon className={cn("h-4 w-4", iconCn)} />
              </div>
              <p className="text-2xl font-bold text-foreground leading-none tracking-tight">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Row 2: Activity Over Time ── */}
      <Card>
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Activity Over Time
            </CardTitle>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-[2px] bg-indigo-500 rounded" /> Emails
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-[2px] bg-emerald-500 rounded" /> Leads added
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-2">
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={data.dailyActivity} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gEmail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gLead" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false} axisLine={false}
                interval={Math.max(Math.floor(data.dailyActivity.length / 7) - 1, 0)}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false} axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--muted-foreground))" }} />
              <Area type="monotone" dataKey="emails" name="Emails"       stroke="#6366f1" fill="url(#gEmail)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              <Area type="monotone" dataKey="leads"  name="Leads added"  stroke="#10b981" fill="url(#gLead)"  strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Row 3: Email Funnel + Lead Status ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Email Engagement Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email Engagement (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.emailsSent30d === 0 ? (
              <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
                No emails sent in the last 30 days
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart layout="vertical" data={data.emailFunnel} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide domain={[0, data.emailFunnel[0].value]} />
                    <YAxis
                      type="category" dataKey="name" width={52}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false} axisLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {data.emailFunnel.map((_, i) => (
                        <Cell key={i} fill={FUNNEL_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Stat summary below chart */}
                <div className="flex items-center gap-4 mt-1 pt-2 border-t border-border/50">
                  {data.emailFunnel.map(({ name, value, pct }, i) => (
                    <div key={name} className="flex-1 text-center">
                      <p className="text-base font-bold leading-none" style={{ color: FUNNEL_COLORS[i] }}>{value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{name} <span className="font-medium">({pct})</span></p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lead Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Lead Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.leadStatuses.length === 0 ? (
              <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
                No leads yet
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <ResponsiveContainer width={150} height={160}>
                    <PieChart>
                      <Pie
                        data={data.leadStatuses}
                        dataKey="value" nameKey="name"
                        innerRadius={44} outerRadius={72}
                        paddingAngle={3} strokeWidth={0}
                      >
                        {data.leadStatuses.map((entry) => (
                          <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  {[...data.leadStatuses].sort((a, b) => b.value - a.value).map(({ name, value }) => {
                    const total = data.leadStatuses.reduce((s, i) => s + i.value, 0)
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[name] ?? "#94a3b8" }} />
                            {name}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{value}</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.round(value / total * 100)}%`, background: PIE_COLORS[name] ?? "#94a3b8" }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Sequence Overview + Recent Activity ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Sequence Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                Sequence Overview
              </CardTitle>
              <Link href="/outreach/sequences" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.sequenceStats.total === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 h-24 text-sm text-muted-foreground">
                <GitBranch className="h-7 w-7 opacity-20" />
                No enrollments yet
              </div>
            ) : (
              <div className="space-y-3">
                {([
                  { label: "Active",    count: data.sequenceStats.active,    color: "#6366f1" },
                  { label: "Completed", count: data.sequenceStats.completed,  color: "#10b981" },
                  { label: "Replied",   count: data.sequenceStats.replied,    color: "#a855f7" },
                ] as const).map(({ label, count, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
                        {label}
                      </span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: data.sequenceStats.total > 0 ? `${Math.round(count / data.sequenceStats.total * 100)}%` : "0%",
                          background: color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  {data.sequenceStats.total} total enrollment{data.sequenceStats.total !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.activityFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 h-24 text-sm text-muted-foreground">
                <Activity className="h-7 w-7 opacity-20" />
                No recent activity
              </div>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-0.5">
                {data.activityFeed.map((item) => {
                  const Icon = item.type === "email" ? Mail : item.type === "sms" ? MessageSquare : UserPlus
                  const iconColor = item.type === "email"
                    ? "text-indigo-500" : item.type === "sms"
                    ? "text-emerald-500" : "text-blue-500"
                  const iconBg = item.type === "email"
                    ? "bg-indigo-50 dark:bg-indigo-900/20" : item.type === "sms"
                    ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-blue-50 dark:bg-blue-900/20"
                  return (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
                        <Icon className={cn("h-3 w-3", iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                        {item.detail && (
                          <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/70 shrink-0 mt-0.5 tabular-nums whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
