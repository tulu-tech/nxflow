"use client"

import { useState, useEffect, useCallback } from "react"
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
  Clock, Users, Mail
} from "lucide-react"
import type { LeadboardEntry, EmailCampaign, LeadStatus } from "@/types"
import { LEAD_STATUS_CONFIG } from "@/types"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function OutreachPage() {
  const supabase = createClient()

  const [leads, setLeads] = useState<LeadboardEntry[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)

  // Individual tab
  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [leadSearch, setLeadSearch] = useState("")
  const [indSubject, setIndSubject] = useState("")
  const [indBody, setIndBody] = useState("")
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Mass campaign tab
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [minScore, setMinScore] = useState(0)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("new")
  const [campName, setCampName] = useState("")
  const [campSubject, setCampSubject] = useState("")
  const [campBody, setCampBody] = useState("")
  const [creatingCampaign, setCreatingCampaign] = useState(false)
  const [campaignDraft, setCampaignDraft] = useState<EmailCampaign | null>(null)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [campError, setCampError] = useState<string | null>(null)
  const [campSuccess, setCampSuccess] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: l }, { data: c }] = await Promise.all([
      supabase.from("leadboard").select("*").order("relevance_score", { ascending: false }),
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }),
    ])
    setLeads((l as LeadboardEntry[]) ?? [])
    setCampaigns((c as EmailCampaign[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  // Individual send
  const selectedLead = leads.find((l) => l.id === selectedLeadId)
  const filteredLeads = leads.filter((l) =>
    !leadSearch || l.full_name.toLowerCase().includes(leadSearch.toLowerCase()) || l.email.toLowerCase().includes(leadSearch.toLowerCase())
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
        body: JSON.stringify({ to: selectedLead.email, subject: indSubject, body: indBody, leadId: selectedLead.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSendSuccess(true)
      setIndSubject("")
      setIndBody("")
      setSelectedLeadId("")
    } catch (e) {
      setSendError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  // Mass campaign
  const massLeads = leads.filter((l) => {
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

      // Update recipient count in DB
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

        {/* Individual */}
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
                    <button onClick={() => setSelectedLeadId("")} className="ml-auto text-muted-foreground hover:text-foreground">×</button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input className="h-9 text-sm" placeholder="Email subject" value={indSubject} onChange={(e) => setIndSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message</Label>
                <Textarea className="text-sm resize-none" rows={8} placeholder="Write your personalized email..." value={indBody} onChange={(e) => setIndBody(e.target.value)} />
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
                disabled={!selectedLead || !indSubject || !indBody || sending}
                className="gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending..." : "Send Email"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mass Campaign */}
        <TabsContent value="campaign" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Left: Lead selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Recipients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Line</Label>
                  <Input className="h-8 text-sm" value={campSubject} onChange={(e) => setCampSubject(e.target.value)} placeholder="Email subject" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email Body</Label>
                  <Textarea className="text-sm resize-none" rows={6} value={campBody} onChange={(e) => setCampBody(e.target.value)} placeholder="Write your campaign email..." />
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
                    disabled={!campName.trim() || !selectedLeadIds.size || creatingCampaign}
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

        {/* History */}
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
