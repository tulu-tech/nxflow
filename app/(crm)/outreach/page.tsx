"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"
import { Button } from "@/components/ui-crm/button"
import { Input } from "@/components/ui-crm/input"
import { Label } from "@/components/ui-crm/label"
import { Textarea } from "@/components/ui-crm/textarea"
import { Badge } from "@/components/ui-crm/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-crm/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui-crm/tabs"
import { Checkbox } from "@/components/ui-crm/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-crm/select"
import {
  Send, Loader2, Search, CheckCircle2, AlertCircle,
  Clock, Users, Mail, Tag, Monitor, Smartphone, FileText, Code2,
  ChevronLeft, Calendar, FlaskConical, X, ChevronRight,
} from "lucide-react"
import type { LeadboardEntry, EmailCampaign, LeadStatus } from "@/types"
import { LEAD_STATUS_CONFIG } from "@/types"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

type EmailFormat = "none" | "plain" | "html"
type PreviewDevice = "mobile" | "desktop"

interface GmailAccount {
  id: string
  email: string
}

interface SentEmailLog {
  id: string
  to_email: string
  from_email: string
  subject: string | null
  is_html: boolean
  sent_at: string
  opened_at: string | null
  open_count: number
  first_clicked_at: string | null
  click_count: number
  lead_id: string | null
  leadboard: { full_name: string | null }[] | null
}

interface CampaignStat {
  delivered: number
  opened: number
  clicked: number
  openedA: number
  totalA: number
  openedB: number
  totalB: number
}

const MERGE_TAGS = [
  { label: "{{first_name}}", value: "{{first_name}}", hint: "İsim (full name'in ilk kelimesi)" },
  { label: "{{last_name}}", value: "{{last_name}}", hint: "Soyisim (kalan kelimeler)" },
  { label: "{{full_name}}", value: "{{full_name}}", hint: "Tam ad" },
  { label: "{{position}}", value: "{{position}}", hint: "Pozisyon / unvan" },
  { label: "{{company}}", value: "{{company}}", hint: "Şirket adı" },
  { label: "{{email}}", value: "{{email}}", hint: "E-posta adresi" },
]

function fillMergeTags(template: string, lead: LeadboardEntry): string {
  const parts = lead.full_name.trim().split(/\s+/)
  const firstName = parts[0] ?? ""
  const lastName = parts.slice(1).join(" ")
  return template
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{last_name\}\}/gi, lastName)
    .replace(/\{\{full_name\}\}/gi, lead.full_name)
    .replace(/\{\{position\}\}/gi, lead.position ?? "")
    .replace(/\{\{company\}\}/gi, lead.company ?? "")
    .replace(/\{\{email\}\}/gi, lead.email ?? "")
}

function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  setter: (v: string) => void,
  tag: string,
) {
  const el = ref.current
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const next = el.value.slice(0, start) + tag + el.value.slice(end)
  setter(next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + tag.length, start + tag.length)
  })
}

// ─── Format Chooser ────────────────────────────────────────────────────────────

function FormatChooser({ onChoose }: { onChoose: (f: "plain" | "html") => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onChoose("plain")}
        className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
      >
        <FileText className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
        <div>
          <p className="text-sm font-semibold text-foreground">Plain Text</p>
          <p className="text-xs text-muted-foreground mt-0.5">Simple text email, no formatting</p>
        </div>
      </button>
      <button
        onClick={() => onChoose("html")}
        className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
      >
        <Code2 className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
        <div>
          <p className="text-sm font-semibold text-foreground">HTML Email</p>
          <p className="text-xs text-muted-foreground mt-0.5">Rich formatted email with live preview</p>
        </div>
      </button>
    </div>
  )
}

// ─── HTML Editor — tabbed full-width layout ────────────────────────────────────

function HtmlEditor({
  value,
  onChange,
  device,
  onDeviceChange,
  textareaRef,
}: {
  value: string
  onChange: (v: string) => void
  device: PreviewDevice
  onDeviceChange: (d: PreviewDevice) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code")

  return (
    <div className="rounded-xl border border-border overflow-hidden flex flex-col" style={{ height: 620 }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/60 shrink-0">
        {/* Tab buttons */}
        <button
          onClick={() => setActiveTab("code")}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors",
            activeTab === "code"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Code2 className="h-3.5 w-3.5" /> Code
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors",
            activeTab === "preview"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Monitor className="h-3.5 w-3.5" /> Preview
        </button>

        {/* Device toggle — only shown in preview tab */}
        {activeTab === "preview" && (
          <div className="ml-3 flex items-center gap-1 border-l border-border pl-3">
            <button
              onClick={() => onDeviceChange("desktop")}
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors",
                device === "desktop"
                  ? "bg-primary text-white border-primary"
                  : "text-muted-foreground border-border hover:text-foreground"
              )}
            >
              <Monitor className="h-3 w-3" /> Desktop
            </button>
            <button
              onClick={() => onDeviceChange("mobile")}
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors",
                device === "mobile"
                  ? "bg-primary text-white border-primary"
                  : "text-muted-foreground border-border hover:text-foreground"
              )}
            >
              <Smartphone className="h-3 w-3" /> Mobile
            </button>
          </div>
        )}
      </div>

      {/* ── Code pane ── */}
      {activeTab === "code" && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"<p>Dear {{first_name}},</p>\n<p>Your message here...</p>"}
          spellCheck={false}
          className="flex-1 w-full resize-none border-none outline-none bg-background text-foreground"
          style={{
            padding: "16px 20px",
            fontSize: 13,
            lineHeight: 1.7,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        />
      )}

      {/* ── Preview pane ── */}
      {activeTab === "preview" && (
        <div className="flex-1 bg-[#f0f0f0] flex justify-center items-start overflow-auto"
          style={{ padding: device === "mobile" ? "24px 0" : 0 }}
        >
          <iframe
            srcDoc={value || "<p style='color:#aaa;font-family:sans-serif;padding:32px;font-size:14px'>Preview appears here…</p>"}
            sandbox="allow-same-origin"
            title="Email Preview"
            style={{
              border: device === "mobile" ? "1px solid #ddd" : "none",
              borderRadius: device === "mobile" ? 12 : 0,
              background: "#fff",
              height: device === "mobile" ? 568 : "100%",
              width: device === "mobile" ? 390 : "100%",
              display: "block",
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Merge tag chips ───────────────────────────────────────────────────────────

function MergeTagChips({
  onInsert,
  lead,
}: {
  onInsert: (tag: string) => void
  lead?: LeadboardEntry
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground shrink-0">Insert:</span>
      {MERGE_TAGS.map((t) => {
        const preview = lead ? fillMergeTags(t.value, lead) : null
        return (
          <button
            key={t.value}
            onClick={() => onInsert(t.value)}
            title={preview ? `${t.hint} → "${preview}"` : t.hint}
            className="text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors font-mono"
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const supabase = useMemo(() => createClient(), [])
  const activeWorkspaceId = useCrmWorkspaceStore((s) => s.activeWorkspaceId)

  const [leads, setLeads] = useState<LeadboardEntry[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([])

  // Campaign analytics
  const [campaignStats, setCampaignStats] = useState<Map<string, CampaignStat>>(new Map())
  const [statsLoading, setStatsLoading] = useState(false)

  // Sent emails / tracking tab
  const [sentLogs, setSentLogs] = useState<SentEmailLog[]>([])
  const [sentLogsLoading, setSentLogsLoading] = useState(false)
  const [sentLogsLoaded, setSentLogsLoaded] = useState(false)

  // Individual tab
  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [leadSearch, setLeadSearch] = useState("")
  const [indSubject, setIndSubject] = useState("")
  const [indBody, setIndBody] = useState("")
  const [indEmailFormat, setIndEmailFormat] = useState<EmailFormat>("none")
  const [indPreviewDevice, setIndPreviewDevice] = useState<PreviewDevice>("desktop")
  const [fromEmail, setFromEmail] = useState("")
  const [indCc, setIndCc] = useState("")
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const indBodyRef = useRef<HTMLTextAreaElement>(null)

  // Mass campaign tab
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [minScore, setMinScore] = useState(0)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("new")
  const [segments, setSegments] = useState<{ id: string; name: string; color: string }[]>([])
  const [segmentFilter, setSegmentFilter] = useState<string>("all")
  const [segmentMemberIds, setSegmentMemberIds] = useState<Set<string>>(new Set())
  const [loadingSegment, setLoadingSegment] = useState(false)
  const [campCc, setCampCc] = useState("")
  const [campName, setCampName] = useState("")
  const [campSubject, setCampSubject] = useState("")
  const [campSubjectB, setCampSubjectB] = useState("")
  const [showSubjectB, setShowSubjectB] = useState(false)
  const [campBody, setCampBody] = useState("")
  const [campEmailFormat, setCampEmailFormat] = useState<EmailFormat>("none")
  const [campPreviewDevice, setCampPreviewDevice] = useState<PreviewDevice>("desktop")
  const [campFromEmail, setCampFromEmail] = useState("")
  const [useSchedule, setUseSchedule] = useState(false)
  const [scheduledFor, setScheduledFor] = useState("")
  const [creatingCampaign, setCreatingCampaign] = useState(false)
  const [campaignDraft, setCampaignDraft] = useState<EmailCampaign | null>(null)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [campError, setCampError] = useState<string | null>(null)
  const [campSuccess, setCampSuccess] = useState(false)
  const [campStep, setCampStep] = useState<1 | 2 | 3>(1)
  const campBodyRef = useRef<HTMLTextAreaElement>(null)

  const loadCampaignStats = useCallback(async (campaignIds: string[]) => {
    if (campaignIds.length === 0) return
    setStatsLoading(true)

    // Try full query with tracking columns; fall back to base columns if migration not run
    let rows: Array<{ campaign_id: string | null; opened_at?: string | null; click_count?: number | null; subject_variant?: string | null }> = []

    const { data, error } = await supabase
      .from("email_logs")
      .select("campaign_id, opened_at, click_count, subject_variant")
      .in("campaign_id", campaignIds)

    if (error) {
      // Tracking columns may not exist yet — fall back to counting deliveries only
      const { data: fallback, error: fbErr } = await supabase
        .from("email_logs")
        .select("campaign_id")
        .in("campaign_id", campaignIds)
      if (fbErr) {
        console.error("loadCampaignStats fallback error:", fbErr)
      } else {
        rows = (fallback ?? []) as typeof rows
      }
    } else {
      rows = data ?? []
    }

    setStatsLoading(false)

    const stats = new Map<string, CampaignStat>()
    for (const row of rows) {
      if (!row.campaign_id) continue
      if (!stats.has(row.campaign_id)) {
        stats.set(row.campaign_id, { delivered: 0, opened: 0, clicked: 0, openedA: 0, totalA: 0, openedB: 0, totalB: 0 })
      }
      const s = stats.get(row.campaign_id)!
      s.delivered++
      if (row.opened_at) s.opened++
      if ((row.click_count ?? 0) > 0) s.clicked++
      if (row.subject_variant === "a") { s.totalA++; if (row.opened_at) s.openedA++ }
      if (row.subject_variant === "b") { s.totalB++; if (row.opened_at) s.openedB++ }
    }
    setCampaignStats(stats)
  }, [supabase])

  const loadData = useCallback(async () => {
    if (!activeWorkspaceId) return
    setLoading(true)
    const [{ data: l }, { data: c }, initRes, gmailRes] = await Promise.all([
      supabase
        .from("leadboard")
        .select("id, full_name, email, position, company, relevance_score, status, workspace_id")
        .eq("workspace_id", activeWorkspaceId)
        .order("relevance_score", { ascending: false }),
      supabase.from("email_campaigns").select("*").eq("workspace_id", activeWorkspaceId).order("created_at", { ascending: false }),
      fetch(`/api/init?workspaceId=${activeWorkspaceId}`),
      supabase.from("gmail_tokens").select("id, email").not("email", "is", null).order("updated_at", { ascending: true }),
    ])
    setLeads((l as unknown as LeadboardEntry[]) ?? [])
    const campaignList = (c as EmailCampaign[]) ?? []
    setCampaigns(campaignList)
    if (initRes.ok) {
      const init = await initRes.json()
      setSegments(init.segments ?? [])
    }
    const accounts = (gmailRes.data ?? []) as GmailAccount[]
    setGmailAccounts(accounts)
    if (accounts.length > 0) {
      setFromEmail((prev: string) => prev || accounts[0].email)
      setCampFromEmail((prev: string) => prev || accounts[0].email)
    }
    setLoading(false)

    if (campaignList.length > 0) {
      loadCampaignStats(campaignList.map((cp) => cp.id))
    }
  }, [supabase, activeWorkspaceId, loadCampaignStats])

  useEffect(() => { loadData() }, [loadData])

  const loadSentLogs = useCallback(async () => {
    if (!activeWorkspaceId || sentLogsLoaded) return
    setSentLogsLoading(true)
    let { data, error } = await supabase
      .from("email_logs")
      .select("id, to_email, from_email, subject, is_html, sent_at, opened_at, open_count, first_clicked_at, click_count, lead_id, leadboard(full_name)")
      .eq("workspace_id", activeWorkspaceId)
      .order("sent_at", { ascending: false })
      .limit(200)
    if (error) {
      const fallback = await supabase
        .from("email_logs")
        .select("id, to_email, from_email, subject, is_html, sent_at, lead_id, leadboard(full_name)")
        .eq("workspace_id", activeWorkspaceId)
        .order("sent_at", { ascending: false })
        .limit(200)
      data = fallback.data as typeof data
    }
    setSentLogs((data ?? []) as unknown as SentEmailLog[])
    setSentLogsLoaded(true)
    setSentLogsLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, activeWorkspaceId, sentLogsLoaded])

  // Auto-insert template when lead is selected and body is empty
  const selectedLead = leads.find((l) => l.id === selectedLeadId)
  useEffect(() => {
    if (selectedLead && !indBody) {
      const parts = selectedLead.full_name.trim().split(/\s+/)
      const firstName = parts[0] ?? ""
      const company = selectedLead.company ? ` regarding ${selectedLead.company}` : ""
      const position = selectedLead.position ? ` — ${selectedLead.position}` : ""
      setIndBody(
        `Dear ${firstName}${position},\n\nI wanted to reach out to you${company}.\n\nBest regards`,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadId])

  const filteredLeads = leads.filter((l) =>
    !leadSearch ||
    l.full_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.email.toLowerCase().includes(leadSearch.toLowerCase()),
  )

  async function handleSendIndividual() {
    if (!selectedLead) return
    setSending(true)
    setSendError(null)
    setSendSuccess(false)
    try {
      const res = await fetch("/api/mailchimp/send-individual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedLead.email,
          cc: indCc.trim() || undefined,
          subject: fillMergeTags(indSubject, selectedLead),
          body: fillMergeTags(indBody, selectedLead),
          leadId: selectedLead.id,
          fromEmail: fromEmail || undefined,
          isHtml: indEmailFormat === "html",
          workspaceId: activeWorkspaceId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSendSuccess(true)
      setIndSubject("")
      setIndBody("")
      setIndCc("")
      setSelectedLeadId("")
      setIndEmailFormat("none")
    } catch (e) {
      setSendError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  // Mass campaign — segment handler
  async function handleSegmentChange(segId: string) {
    setSegmentFilter(segId)
    if (segId === "all") {
      setSegmentMemberIds(new Set())
      setSelectedLeadIds(new Set())
      return
    }
    setLoadingSegment(true)
    try {
      const res = await fetch(`/api/segments/${segId}/members`)
      const ids: string[] = res.ok ? await res.json() : []
      const idSet = new Set(ids)
      setSegmentMemberIds(idSet)
      setSelectedLeadIds(new Set(ids.filter((id) => leads.some((l) => l.id === id))))
    } finally {
      setLoadingSegment(false)
    }
  }

  const massLeads = leads.filter((l) => {
    if (segmentFilter !== "all" && !segmentMemberIds.has(l.id)) return false
    if (statusFilter !== "all" && l.status !== statusFilter) return false
    if (l.relevance_score < minScore) return false
    return true
  })

  function toggleLead(id: string) {
    setSelectedLeadIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleAll() {
    if (selectedLeadIds.size === massLeads.length) {
      setSelectedLeadIds(new Set())
    } else {
      setSelectedLeadIds(new Set(massLeads.map((l) => l.id)))
    }
  }

  async function handleCreateCampaign() {
    if (!campName.trim()) return
    setCreatingCampaign(true)
    setCampError(null)
    try {
      const res = await fetch("/api/mailchimp/create-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campName,
          subject: campSubject,
          body: campBody,
          cc: campCc.trim() || undefined,
          workspaceId: activeWorkspaceId,
          subjectB: showSubjectB && campSubjectB.trim() ? campSubjectB : undefined,
          scheduledFor: useSchedule && scheduledFor ? scheduledFor : undefined,
          fromEmail: campFromEmail || undefined,
          recipientIds: Array.from(selectedLeadIds),
          isHtml: campEmailFormat === "html",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const campaign: EmailCampaign = { ...data.campaign, recipient_count: selectedLeadIds.size }
      setCampaignDraft(campaign)
      await loadData()
    } catch (e) {
      setCampError((e as Error).message)
    } finally {
      setCreatingCampaign(false)
    }
  }

  async function handleSendCampaign() {
    if (!campaignDraft) return
    setSendingCampaign(true)
    setCampError(null)
    try {
      const res = await fetch("/api/mailchimp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaignDraft.id,
          recipientIds: Array.from(selectedLeadIds),
          cc: campCc.trim() || undefined,
          fromEmail: campFromEmail || undefined,
          isHtml: campEmailFormat === "html",
          workspaceId: activeWorkspaceId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCampSuccess(true)
      setCampaignDraft(null)
      setCampName("")
      setCampSubject("")
      setCampSubjectB("")
      setShowSubjectB(false)
      setCampBody("")
      setCampCc("")
      setCampEmailFormat("none")
      setSelectedLeadIds(new Set())
      setUseSchedule(false)
      setScheduledFor("")
      setCampStep(1)
      await loadData()
    } catch (e) {
      setCampError((e as Error).message)
    } finally {
      setSendingCampaign(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Outreach</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Send personalized emails to your leads</p>
      </div>

      <Tabs defaultValue="individual" className="flex-col">
        <TabsList className="h-9 w-fit">
          <TabsTrigger value="individual" className="text-sm">Individual</TabsTrigger>
          <TabsTrigger value="campaign" className="text-sm">Mass Campaign</TabsTrigger>
          <TabsTrigger value="history" className="text-sm">Campaign History</TabsTrigger>
          <TabsTrigger value="sent" className="text-sm" onClick={loadSentLogs}>Sent Emails</TabsTrigger>
        </TabsList>

        {/* ── Individual ────────────────────────────────────────────────────── */}
        <TabsContent value="individual" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-5 space-y-4">
              {/* Lead selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Select Lead</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9 text-sm"
                    placeholder="Search by name or email..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                  />
                </div>
                {leadSearch && (
                  <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
                    {filteredLeads.slice(0, 8).map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setSelectedLeadId(l.id); setLeadSearch("") }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{l.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{l.email}</p>
                        </div>
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-full shrink-0", LEAD_STATUS_CONFIG[l.status]?.className)}>
                          {LEAD_STATUS_CONFIG[l.status]?.label}
                        </span>
                      </button>
                    ))}
                    {filteredLeads.length === 0 && <p className="text-sm text-muted-foreground px-3 py-2">No leads found</p>}
                  </div>
                )}
                {selectedLead && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{selectedLead.full_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{selectedLead.email}</p>
                    </div>
                    <button onClick={() => { setSelectedLeadId(""); setIndBody("") }} className="ml-auto text-muted-foreground hover:text-foreground">×</button>
                  </div>
                )}
              </div>

              {/* From dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                {gmailAccounts.length > 0 ? (
                  <Select value={fromEmail} onValueChange={(v) => v && setFromEmail(v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select sender account" />
                    </SelectTrigger>
                    <SelectContent>
                      {gmailAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.email}>{acc.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    No Gmail connected —{" "}
                    <Link href="/settings?tab=api" className="text-primary underline underline-offset-2">connect in Settings</Link>
                  </div>
                )}
              </div>

              {/* CC field */}
              <div className="space-y-1.5">
                <Label className="text-xs">CC <span className="text-muted-foreground font-normal">(optional — comma-separated)</span></Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="cc@example.com, another@example.com"
                  value={indCc}
                  onChange={(e) => setIndCc(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input className="h-9 text-sm" placeholder="Email subject" value={indSubject} onChange={(e) => setIndSubject(e.target.value)} />
              </div>

              {/* Body / Format */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Message</Label>
                  {indEmailFormat !== "none" && (
                    <button
                      onClick={() => { setIndEmailFormat("none"); setIndBody("") }}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3" /> Change format
                    </button>
                  )}
                </div>

                {indEmailFormat === "none" && (
                  <FormatChooser onChoose={setIndEmailFormat} />
                )}

                {indEmailFormat === "plain" && (
                  <>
                    <MergeTagChips onInsert={(tag) => insertAtCursor(indBodyRef, setIndBody, tag)} lead={selectedLead} />
                    <Textarea
                      ref={indBodyRef}
                      className="text-sm resize-none"
                      rows={18}
                      placeholder="Write your personalized email..."
                      value={indBody}
                      onChange={(e) => setIndBody(e.target.value)}
                    />
                  </>
                )}

                {indEmailFormat === "html" && (
                  <>
                    <MergeTagChips onInsert={(tag) => insertAtCursor(indBodyRef, setIndBody, tag)} lead={selectedLead} />
                    <HtmlEditor
                      value={indBody}
                      onChange={setIndBody}
                      device={indPreviewDevice}
                      onDeviceChange={setIndPreviewDevice}
                      textareaRef={indBodyRef}
                    />
                  </>
                )}
              </div>

              {sendSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-md px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" /> Email sent successfully!
                </div>
              )}
              {sendError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  <AlertCircle className="h-4 w-4" /> {sendError}
                </div>
              )}

              <Button
                onClick={handleSendIndividual}
                disabled={!selectedLead || !indSubject || !indBody || sending || indEmailFormat === "none"}
                className="gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending..." : "Send Email"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Mass Campaign — 3-stage wizard ────────────────────────────── */}
        <TabsContent value="campaign" className="mt-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              {/* Stage indicator */}
              <div className="flex items-center gap-2 text-sm select-none">
                {([
                  { n: 1, label: "Recipients" },
                  { n: 2, label: "Details" },
                  { n: 3, label: "Compose" },
                ] as { n: 1 | 2 | 3; label: string }[]).map(({ n, label }, i) => (
                  <div key={n} className="flex items-center gap-2">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold transition-colors",
                        campStep === n
                          ? "bg-primary text-white"
                          : campStep > n
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {campStep > n ? "✓" : n}
                      </span>
                      <span className={cn(
                        "text-xs font-medium transition-colors",
                        campStep === n ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Stage 1: Recipients ── */}
              {campStep === 1 && (
                <div className="space-y-4">
                  {/* Segment */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Tag className="h-3 w-3" /> Segment
                      {loadingSegment && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                    </Label>
                    <Select value={segmentFilter} onValueChange={(v) => handleSegmentChange(v ?? "all")}>
                      <SelectTrigger className="h-9 text-sm">
                        {segmentFilter === "all" ? (
                          <span className="text-muted-foreground text-sm">All Leads</span>
                        ) : (() => {
                          const seg = segments.find((s) => s.id === segmentFilter)
                          return seg ? (
                            <span className="flex items-center gap-2 text-sm">
                              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                              {seg.name}
                            </span>
                          ) : <span className="text-muted-foreground text-sm">All Leads</span>
                        })()}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Leads</SelectItem>
                        {segments.map((seg) => (
                          <SelectItem key={seg.id} value={seg.id}>
                            <span className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                              {seg.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status + Score filters */}
                  <div className="flex items-end gap-3">
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{LEAD_STATUS_CONFIG[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 w-28">
                      <Label className="text-xs">Min Score</Label>
                      <Input
                        type="number" min={0} max={100}
                        className="h-9 text-sm"
                        value={minScore}
                        onChange={(e) => setMinScore(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Lead checklist */}
                  <div className="rounded-lg border overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedLeadIds.size === massLeads.length && massLeads.length > 0}
                          onCheckedChange={toggleAll}
                        />
                        <span className="text-xs text-muted-foreground font-medium">
                          {selectedLeadIds.size} / {massLeads.length} selected
                        </span>
                      </div>
                      <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                        {selectedLeadIds.size === massLeads.length && massLeads.length > 0 ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                      {massLeads.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => toggleLead(l.id)}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <Checkbox checked={selectedLeadIds.has(l.id)} onCheckedChange={() => toggleLead(l.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{l.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{l.company ?? l.email}</p>
                          </div>
                          <span className={cn("text-xs px-1.5 py-0.5 rounded-full shrink-0", LEAD_STATUS_CONFIG[l.status]?.className)}>
                            {LEAD_STATUS_CONFIG[l.status]?.label}
                          </span>
                          <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{l.relevance_score}</span>
                        </div>
                      ))}
                      {massLeads.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">No leads match filters</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      onClick={() => setCampStep(2)}
                      disabled={selectedLeadIds.size === 0}
                      className="gap-2"
                    >
                      Next — Details <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Stage 2: Details ── */}
              {campStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Campaign Name</Label>
                    <Input
                      className="h-9 text-sm"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      placeholder="e.g. Q1 Asia Outreach"
                      autoFocus
                    />
                  </div>

                  {/* From */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">From</Label>
                    {gmailAccounts.length > 0 ? (
                      <Select value={campFromEmail} onValueChange={(v) => v && setCampFromEmail(v)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select sender account" />
                        </SelectTrigger>
                        <SelectContent>
                          {gmailAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.email}>{acc.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-dashed border-border text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        No Gmail connected —{" "}
                        <Link href="/settings?tab=api" className="text-primary underline underline-offset-2">connect in Settings</Link>
                      </div>
                    )}
                  </div>

                  {/* Send timing */}
                  <div className="space-y-2">
                    <Label className="text-xs">Send Timing</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setUseSchedule(false)}
                        className={cn(
                          "flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left",
                          !useSchedule ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">Send Now</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Campaign sends immediately after you review</p>
                      </button>
                      <button
                        onClick={() => setUseSchedule(true)}
                        className={cn(
                          "flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left",
                          useSchedule ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">Schedule</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Choose a date and time for automatic send</p>
                      </button>
                    </div>
                    {useSchedule && (
                      <div className="space-y-1 pt-1">
                        <input
                          type="datetime-local"
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={scheduledFor}
                          onChange={(e) => setScheduledFor(e.target.value)}
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        />
                        <p className="text-xs text-muted-foreground">Campaign will send automatically at the scheduled time.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button variant="ghost" onClick={() => setCampStep(1)} className="gap-1.5 text-muted-foreground">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={() => setCampStep(3)}
                      disabled={!campName.trim() || (useSchedule && !scheduledFor)}
                      className="gap-2"
                    >
                      Next — Compose <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Stage 3: Compose ── */}
              {campStep === 3 && (
                <div className="space-y-4">
                  {/* CC */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">CC <span className="text-muted-foreground font-normal">(optional — comma-separated)</span></Label>
                    <Input
                      className="h-9 text-sm"
                      placeholder="cc@example.com, another@example.com"
                      value={campCc}
                      onChange={(e) => setCampCc(e.target.value)}
                    />
                  </div>

                  {/* Subject A */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{showSubjectB ? "Subject A" : "Subject Line"}</Label>
                      {!showSubjectB && (
                        <button
                          onClick={() => setShowSubjectB(true)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <FlaskConical className="h-3 w-3" /> A/B Test
                        </button>
                      )}
                    </div>
                    <Input className="h-9 text-sm" value={campSubject} onChange={(e) => setCampSubject(e.target.value)} placeholder="Email subject" />
                  </div>

                  {/* Subject B */}
                  {showSubjectB && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1.5">
                          <FlaskConical className="h-3 w-3 text-violet-500" />
                          Subject B
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">A/B</Badge>
                        </Label>
                        <button onClick={() => { setShowSubjectB(false); setCampSubjectB("") }} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <Input className="h-9 text-sm" value={campSubjectB} onChange={(e) => setCampSubjectB(e.target.value)} placeholder="Alternate subject for half the recipients" />
                      <p className="text-xs text-muted-foreground">Recipients are split 50/50 between Subject A and Subject B.</p>
                    </div>
                  )}

                  {/* Body / Format */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Email Body</Label>
                      {campEmailFormat !== "none" && (
                        <button
                          onClick={() => { setCampEmailFormat("none"); setCampBody("") }}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronLeft className="h-3 w-3" /> Change format
                        </button>
                      )}
                    </div>

                    {campEmailFormat === "none" && (
                      <FormatChooser onChoose={setCampEmailFormat} />
                    )}

                    {campEmailFormat === "plain" && (
                      <>
                        <MergeTagChips onInsert={(tag) => insertAtCursor(campBodyRef, setCampBody, tag)} lead={massLeads.find(l => selectedLeadIds.has(l.id))} />
                        <Textarea
                          ref={campBodyRef}
                          className="text-sm resize-none"
                          rows={18}
                          value={campBody}
                          onChange={(e) => setCampBody(e.target.value)}
                          placeholder="Write your campaign email... Use {{first_name}}, {{company}} etc."
                        />
                      </>
                    )}

                    {campEmailFormat === "html" && (
                      <>
                        <MergeTagChips onInsert={(tag) => insertAtCursor(campBodyRef, setCampBody, tag)} lead={massLeads.find(l => selectedLeadIds.has(l.id))} />
                        <HtmlEditor
                          value={campBody}
                          onChange={setCampBody}
                          device={campPreviewDevice}
                          onDeviceChange={setCampPreviewDevice}
                          textareaRef={campBodyRef}
                        />
                      </>
                    )}
                  </div>

                  {campError && (
                    <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{campError}</div>
                  )}
                  {campSuccess && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-md px-3 py-2">
                      <CheckCircle2 className="h-4 w-4" /> Campaign {useSchedule ? "scheduled" : "sent"} successfully!
                    </div>
                  )}

                  {campaignDraft ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2.5">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Campaign created: <span className="font-medium">{campaignDraft.name}</span></span>
                        {campaignDraft.status === "scheduled" && campaignDraft.scheduled_for && (
                          <Badge variant="secondary" className="text-xs ml-auto">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(campaignDraft.scheduled_for), "MMM d, HH:mm")}
                          </Badge>
                        )}
                      </div>
                      {campaignDraft.status !== "scheduled" ? (
                        <Button onClick={handleSendCampaign} disabled={sendingCampaign} className="w-full gap-2">
                          {sendingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {sendingCampaign ? "Sending..." : `Send to ${campaignDraft.recipient_count} recipients`}
                        </Button>
                      ) : (
                        <p className="text-xs text-center text-muted-foreground">
                          This campaign will be sent automatically at the scheduled time.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <Button variant="ghost" onClick={() => setCampStep(2)} className="gap-1.5 text-muted-foreground">
                        <ChevronLeft className="h-4 w-4" /> Back
                      </Button>
                      <Button
                        onClick={handleCreateCampaign}
                        disabled={!campSubject.trim() || !campBody.trim() || creatingCampaign || campEmailFormat === "none"}
                        className="gap-2"
                      >
                        {creatingCampaign ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : useSchedule ? (
                          <Calendar className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {creatingCampaign
                          ? "Creating..."
                          : useSchedule
                            ? `Schedule for ${selectedLeadIds.size} recipients`
                            : `Create & Send to ${selectedLeadIds.size}`
                        }
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History ───────────────────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Send className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No campaigns yet</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Campaign</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Recipients</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Opened</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Clicked</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const stat = campaignStats.get(c.id)
                    const hasAB = stat && stat.totalA > 0 && stat.totalB > 0
                    const openPct = stat && stat.delivered > 0 ? Math.round((stat.opened / stat.delivered) * 100) : null
                    const clickPct = stat && stat.delivered > 0 ? Math.round((stat.clicked / stat.delivered) * 100) : null
                    const openPctA = stat && stat.totalA > 0 ? Math.round((stat.openedA / stat.totalA) * 100) : null
                    const openPctB = stat && stat.totalB > 0 ? Math.round((stat.openedB / stat.totalB) * 100) : null
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{c.name}</p>
                          {c.subject && <p className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</p>}
                          {c.subject_b && (
                            <p className="text-xs text-violet-500 truncate max-w-xs flex items-center gap-1">
                              <FlaskConical className="h-3 w-3 shrink-0" /> B: {c.subject_b}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={c.status === "sent" ? "default" : c.status === "scheduled" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {c.status === "scheduled" && <Clock className="h-3 w-3 mr-1" />}
                            {c.status}
                          </Badge>
                          {c.status === "scheduled" && c.scheduled_for && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(c.scheduled_for), "MMM d, HH:mm")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {stat ? stat.delivered : c.recipient_count > 0 ? `${c.recipient_count}` : "—"}
                          {stat && ` sent`}
                        </td>
                        <td className="px-4 py-3">
                          {statsLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : hasAB ? (
                            <span className="text-xs text-foreground">
                              A: <span className="font-medium text-emerald-600">{openPctA}%</span>
                              {" · "}B: <span className="font-medium text-violet-600">{openPctB}%</span>
                            </span>
                          ) : openPct !== null ? (
                            <span className={cn("text-xs font-medium", openPct > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                              {openPct}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {statsLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : clickPct !== null ? (
                            <span className={cn("text-xs font-medium", clickPct > 0 ? "text-blue-600" : "text-muted-foreground")}>
                              {clickPct}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          <span className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {c.sent_at ? format(new Date(c.sent_at), "MMM d, yyyy") : format(new Date(c.created_at), "MMM d, yyyy")}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Sent Emails / Tracking ─────────────────────────────────────── */}
        <TabsContent value="sent" className="mt-4">
          {sentLogsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : sentLogs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No sent emails yet</p>
              <p className="text-xs mt-1">Emails you send will appear here with open & click tracking</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">To</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Subject</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Opened</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Clicked</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {sentLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="font-medium text-foreground truncate">{log.leadboard?.[0]?.full_name ?? log.to_email}</p>
                        {log.leadboard?.[0]?.full_name && (
                          <p className="text-xs text-muted-foreground truncate">{log.to_email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate text-muted-foreground">{log.subject ?? "(no subject)"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {log.opened_at ? (
                          <span
                            title={`First opened ${format(new Date(log.opened_at), "MMM d 'at' HH:mm")}${log.open_count > 1 ? ` · ${log.open_count}× total` : ""}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {log.open_count > 1 ? `${log.open_count}× opened` : "Opened"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.click_count > 0 ? (
                          <span
                            title={`First clicked ${format(new Date(log.first_clicked_at!), "MMM d 'at' HH:mm")}${log.click_count > 1 ? ` · ${log.click_count}× total` : ""}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-500"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                            {log.click_count > 1 ? `${log.click_count}× clicked` : "Clicked"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell whitespace-nowrap">
                        {format(new Date(log.sent_at), "MMM d, yyyy HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
