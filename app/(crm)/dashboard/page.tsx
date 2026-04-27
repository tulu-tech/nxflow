"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-crm/card"
import { Badge } from "@/components/ui-crm/badge"
import { Users, Target, Send, Zap, TrendingUp, Clock, Bell, Loader2 } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import DashboardReminders from "./reminders"

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  replied: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

interface RecentLead {
  id: string
  full_name: string
  company: string | null
  position: string | null
  relevance_score: number | null
  status: string
  created_at: string
}

interface Campaign {
  id: string
  name: string
  status: string
  recipient_count: number
  sent_at: string | null
}

interface DashboardData {
  totalLeads: number
  contactedLeads: number
  convertedLeads: number
  lushaCreditsUsed: number
  recentLeads: RecentLead[]
  recentCampaigns: Campaign[]
  reminders: {
    id: string
    lead_id: string
    note: string | null
    remind_at: string
    lead_name: string
    lead_company: string
  }[]
}

export default function DashboardPage() {
  const supabase = createClient()
  const activeWorkspaceId = useCrmWorkspaceStore((s) => s.activeWorkspaceId)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspaceId) return

    async function load() {
      setLoading(true)
      const now = new Date()
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { count: totalLeads },
        { count: contactedLeads },
        { count: convertedLeads },
        { data: recentLeads },
        { data: creditRows },
        { data: recentCampaigns },
        { data: dueReminders },
      ] = await Promise.all([
        supabase.from("leadboard").select("*", { count: "exact", head: true }).eq("workspace_id", activeWorkspaceId),
        supabase.from("leadboard").select("*", { count: "exact", head: true }).eq("workspace_id", activeWorkspaceId).eq("status", "contacted"),
        supabase.from("leadboard").select("*", { count: "exact", head: true }).eq("workspace_id", activeWorkspaceId).eq("status", "converted"),
        supabase.from("leadboard").select("id, full_name, company, position, relevance_score, status, created_at").eq("workspace_id", activeWorkspaceId).order("created_at", { ascending: false }).limit(5),
        supabase.from("credit_usage").select("type, amount").eq("workspace_id", activeWorkspaceId).gte("created_at", monthStart).eq("type", "lusha_email"),
        supabase.from("email_campaigns").select("id, name, status, recipient_count, sent_at").eq("workspace_id", activeWorkspaceId).order("created_at", { ascending: false }).limit(3),
        supabase.from("follow_up_reminders").select("id, remind_at, note, lead_id, leadboard(full_name, company)").eq("workspace_id", activeWorkspaceId).eq("is_done", false).lte("remind_at", tomorrow).order("remind_at"),
      ])

      const lushaCreditsUsed = creditRows?.reduce((sum, r) => sum + r.amount, 0) ?? 0

      const reminders = (dueReminders ?? []).map((r) => ({
        id: r.id,
        lead_id: r.lead_id,
        note: r.note,
        remind_at: r.remind_at,
        // @ts-ignore — supabase join
        lead_name: r.leadboard?.full_name ?? "Unknown",
        // @ts-ignore
        lead_company: r.leadboard?.company ?? "",
      }))

      setData({
        totalLeads: totalLeads ?? 0,
        contactedLeads: contactedLeads ?? 0,
        convertedLeads: convertedLeads ?? 0,
        lushaCreditsUsed,
        recentLeads: (recentLeads ?? []) as RecentLead[],
        recentCampaigns: (recentCampaigns ?? []) as Campaign[],
        reminders,
      })
      setLoading(false)
    }

    load()
  }, [activeWorkspaceId])

  const now = new Date()

  if (!activeWorkspaceId || loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{format(now, "MMMM d, yyyy")}</p>
      </div>

      {/* Due Reminders Banner */}
      {data && data.reminders.length > 0 && (
        <DashboardReminders reminders={data.reminders} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Leads</p>
                <p className="text-3xl font-bold text-foreground mt-1">{data?.totalLeads ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Contacted</p>
                <p className="text-3xl font-bold text-foreground mt-1">{data?.contactedLeads ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Send className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Converted</p>
                <p className="text-3xl font-bold text-foreground mt-1">{data?.convertedLeads ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Lusha Credits (mo.)</p>
                <p className="text-3xl font-bold text-foreground mt-1">{data?.lushaCreditsUsed ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Leads</CardTitle>
              <Link href="/leadboard" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data && data.recentLeads.length > 0 ? (
              data.recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 py-1.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {lead.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.position}{lead.company ? ` @ ${lead.company}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] ?? ""}`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No leads yet</p>
                <Link href="/prospecting" className="text-xs text-primary hover:underline mt-1 inline-block">Start prospecting →</Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Campaigns</CardTitle>
              <Link href="/outreach" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data && data.recentCampaigns.length > 0 ? (
              data.recentCampaigns.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {c.sent_at ? format(new Date(c.sent_at), "MMM d") : "Draft"}
                      {c.recipient_count > 0 && ` · ${c.recipient_count} recipients`}
                    </p>
                  </div>
                  <Badge variant={c.status === "sent" ? "default" : "secondary"} className="text-xs shrink-0">
                    {c.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No campaigns yet</p>
                <Link href="/outreach" className="text-xs text-primary hover:underline mt-1 inline-block">Create one →</Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
