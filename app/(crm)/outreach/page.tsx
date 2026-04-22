"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
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
  ChevronLeft,
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

const MERGE_TAGS = [
  { label: "{{first_name}}", value: "{{first_name}}" },
  { label: "{{last_name}}", value: "{{last_name}}" },
  { label: "{{company}}", value: "{{company}}" },
  { label: "{{email}}", value: "{{email}}" },
]

function fillMergeTags(template: string, lead: LeadboardEntry): string {
  return template
    .replace(/\{\{first_name\}\}/gi, lead.full_name.split(" ")[0] ?? "")
    .replace(/\{\{last_name\}\}/gi, lead.full_name.split(" ").slice(1).join(" ") ?? "")
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

// ─── HTML Editor with device preview ───────────────────────────────────────────

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
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        ref={textareaRef}
        className="text-xs font-mono resize-none"
        style={{ height: 200 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"<p>Dear {{first_name}},</p>\n<p>Your message here...</p>"}
      />
      {/* Device toggle */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Preview:</span>
        <button
          onClick={() => onDeviceChange("mobile")}
          className={cn(
            "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors",
            device === "mobile"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          <Smartphone className="h-3 w-3" /> Mobile
        </button>
        <button
          onClick={() => onDeviceChange("desktop")}
          className={cn(
            "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors",
            device === "desktop"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          <Monitor className="h-3 w-3" /> Desktop
        </button>
      </div>
      {/* Preview iframe */}
      <div
        className="rounded-lg border bg-white overflow-hidden"
        style={{ height: 500, display: "flex", alignItems: "flex-start", justifyContent: "center" }}
      >
        <iframe
          srcDoc={value || "<p style='color:#aaa;font-family:sans-serif;padding:16px'>Preview appears here…</p>"}
          sandbox="allow-same-origin"
          title="Email Preview"
          style={{
            border: "none",
            height: "100%",
            width: device === "mobile" ? 390 : "100%",
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  )
}

// ─── Merge tag chips ───────────────────────────────────────────────────────────

function MergeTagChips({
  onInsert,
}: {
  onInsert: (tag: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Insert:</span>
      {MERGE_TAGS.map((t) => (
        <button
          key={t.value}
          onClick={() => onInsert(t.value)}
          className="text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors font-mono"
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const supabase = createClient()

  const [leads, setLeads] = useState<LeadboardEntry[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([])

  // Individual tab
  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [leadSearch, setLeadSearch] = useState("")
  const [indSubject, setIndSubject] = useState("")
  const [indBody, setIndBody] = useState("")
  const [indEmailFormat, setIndEmailFormat] = useState<EmailFormat>("none")
  const [indPreviewDevice, setIndPreviewDevice] = useState<PreviewDevice>("desktop")
  const [fromEmail, setFromEmail] = useState("")
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
  const [campName, setCampName] = useState("")
  const [campSubject, setCampSubject] = useState("")
  const [campBody, setCampBody] = useState("")
  const [campEmailFormat, setCampEmailFormat] = useState<EmailFormat>("none")
  const [campPreviewDevice, setCampPreviewDevice] = useState<PreviewDevice>("desktop")
  const [campFromEmail, setCampFromEmail] = useState("")
  const [creatingCampaign, setCreatingCampaign] = useState(false)
  const [campaignDraft, setCampaignDraft] = useState<EmailCampaign | null>(null)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [campError, setCampError] = useState<string | null>(null)
  const [campSuccess, setCampSuccess] = useState(false)
  const campBodyRef = useRef<HTMLTextAreaElement>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: l }, { data: c }, segsRes, gmailRes] = await Promise.all([
      supabase.from("leadboard").select("*").order("relevance_score", { ascending: false }),
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }),
      fetch("/api/segments"),
      supabase.from("gmail_tokens").select("id, email").order("created_at", { ascending: true }),
    ])
    setLeads((l as LeadboardEntry[]) ?? [])
    setCampaigns((c as EmailCampaign[]) ?? [])
    const segs = segsRes.ok ? await segsRes.json() : []
    setSegments(segs ?? [])
    const accounts = (gmailRes.data ?? []) as GmailAccount[]
    setGmailAccounts(accounts)
    if (accounts.length > 0) {
      setFromEmail((prev: string) => prev || accounts[0].email)
      setCampFromEmail((prev: string) => prev || accounts[0].email)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  // Auto-insert template when lead is selected and body is empty
  const selectedLead = leads.find((l) => l.id === selectedLeadId)
  useEffect(() => {
    if (selectedLead && !indBody) {
      const firstName = selectedLead.full_name.split(" ")[0] ?? ""
      const company = selectedLead.company ?? ""
      setIndBody(
        `Dear ${firstName},\n\nI wanted to reach out to you regarding ${company}.\n\nBest regards`,
      )
    }
    // Only fire when selectedLeadId changes
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
          subject: indSubject,
          body: indBody,
          leadId: selectedLead.id,
          fromEmail: fromEmail || undefined,
          isHtml: indEmailFormat === "html",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSendSuccess(true)
      setIndSubject("")
      setIndBody("")
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
        body: JSON.stringify({ name: campName, subject: campSubject, body: campBody }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await supabase
        .from("email_campaigns")
        .update({ recipient_count: selectedLeadIds.size })
        .eq("id", data.campaign.id)

      setCampaignDraft({ ...data.campaign, recipient_count: selectedLeadIds.size })
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
        body: JSON.stringify({ campaignId: campaignDraft.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCampSuccess(true)
      setCampaignDraft(null)
      setCampName("")
      setCampSubject("")
      setCampBody("")
      setCampEmailFormat("none")
      setSelectedLeadIds(new Set())
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

      <Tabs defaultValue="individual">
        <TabsList className="h-9">
          <TabsTrigger value="individual" className="text-sm">Individual</TabsTrigger>
          <TabsTrigger value="campaign" className="text-sm">Mass Campaign</TabsTrigger>
          <TabsTrigger value="history" className="text-sm">Campaign History</TabsTrigger>
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
              {gmailAccounts.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">From</Label>
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
                </div>
              )}

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
                    <MergeTagChips onInsert={(tag) => insertAtCursor(indBodyRef, setIndBody, tag)} />
                    <Textarea
                      ref={indBodyRef}
                      className="text-sm resize-none"
                      rows={8}
                      placeholder="Write your personalized email..."
                      value={indBody}
                      onChange={(e) => setIndBody(e.target.value)}
                    />
                  </>
                )}

                {indEmailFormat === "html" && (
                  <>
                    <MergeTagChips onInsert={(tag) => insertAtCursor(indBodyRef, setIndBody, tag)} />
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

        {/* ── Mass Campaign ─────────────────────────────────────────────────── */}
        <TabsContent value="campaign" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Left: Lead selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Recipients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Segment filter */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Segment
                    {loadingSegment && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                  </Label>
                  <Select value={segmentFilter} onValueChange={(v) => handleSegmentChange(v ?? "all")}>
                    <SelectTrigger className="h-8 text-sm">
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
                  {segments.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No segments yet — create one in <a href="/prospecting" className="underline">Prospecting</a>.
                    </p>
                  )}
                </div>

                {/* Status + Score filters */}
                <div className="flex items-center gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Status Filter</Label>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{LEAD_STATUS_CONFIG[s].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Min Score</Label>
                    <Input
                      type="number"
                      min={0} max={100}
                      className="h-8 text-sm"
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedLeadIds.size === massLeads.length && massLeads.length > 0}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-xs text-muted-foreground">{selectedLeadIds.size} / {massLeads.length} selected</span>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {massLeads.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 py-1.5">
                      <Checkbox
                        checked={selectedLeadIds.has(l.id)}
                        onCheckedChange={() => toggleLead(l.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{l.company ?? l.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{l.relevance_score}</span>
                    </div>
                  ))}
                  {massLeads.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No leads match filters</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right: Compose */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Compose Campaign</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Campaign Name</Label>
                  <Input className="h-8 text-sm" value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="e.g. Q1 Asia Outreach" />
                </div>

                {/* From dropdown */}
                {gmailAccounts.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">From</Label>
                    <Select value={campFromEmail} onValueChange={(v) => v && setCampFromEmail(v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select sender account" />
                      </SelectTrigger>
                      <SelectContent>
                        {gmailAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.email}>{acc.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Line</Label>
                  <Input className="h-8 text-sm" value={campSubject} onChange={(e) => setCampSubject(e.target.value)} placeholder="Email subject" />
                </div>

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
                      <MergeTagChips onInsert={(tag) => insertAtCursor(campBodyRef, setCampBody, tag)} />
                      <Textarea
                        ref={campBodyRef}
                        className="text-sm resize-none"
                        rows={6}
                        value={campBody}
                        onChange={(e) => setCampBody(e.target.value)}
                        placeholder="Write your campaign email... Use {{first_name}}, {{company}} etc."
                      />
                    </>
                  )}

                  {campEmailFormat === "html" && (
                    <>
                      <MergeTagChips onInsert={(tag) => insertAtCursor(campBodyRef, setCampBody, tag)} />
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
                    <CheckCircle2 className="h-4 w-4" /> Campaign sent!
                  </div>
                )}

                {campaignDraft ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Campaign created: <span className="font-medium">{campaignDraft.name}</span>
                    </div>
                    <Button onClick={handleSendCampaign} disabled={sendingCampaign} className="w-full gap-2">
                      {sendingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {sendingCampaign ? "Sending..." : `Send to ${campaignDraft.recipient_count} recipients`}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleCreateCampaign}
                    disabled={!campName.trim() || !selectedLeadIds.size || creatingCampaign || campEmailFormat === "none"}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {creatingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    {creatingCampaign ? "Creating..." : `Create Campaign (${selectedLeadIds.size} recipients)`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
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
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Campaign</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Recipients</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{c.name}</p>
                        {c.subject && <p className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === "sent" ? "default" : "secondary"} className="text-xs">
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {c.recipient_count > 0 ? `${c.recipient_count} recipients` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {c.sent_at ? format(new Date(c.sent_at), "MMM d, yyyy") : format(new Date(c.created_at), "MMM d, yyyy")}
                        </span>
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
