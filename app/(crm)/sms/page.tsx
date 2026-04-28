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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui-crm/select"
import {
  Smartphone, Loader2, AlertCircle, CheckCircle2, Settings, MessageSquare,
  Tag, Users
} from "lucide-react"
import type { LeadboardEntry, LeadStatus } from "@/types"
import { LEAD_STATUS_CONFIG } from "@/types"
import { cn } from "@/lib/utils"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"

const MERGE_TAGS = [
  { label: "{{first_name}}", value: "{{first_name}}" },
  { label: "{{last_name}}", value: "{{last_name}}" },
  { label: "{{company}}", value: "{{company}}" },
  { label: "{{email}}", value: "{{email}}" },
]

export default function SMSPage() {
  const supabase = createClient()
  const activeWorkspaceId = useCrmWorkspaceStore((s) => s.activeWorkspaceId)

  const [leads, setLeads] = useState<LeadboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [twilioConnected, setTwilioConnected] = useState<boolean | null>(null)

  // Recipient filters
  const [segments, setSegments] = useState<{ id: string; name: string; color: string }[]>([])
  const [segmentFilter, setSegmentFilter] = useState("all")
  const [segmentMemberIds, setSegmentMemberIds] = useState<Set<string>>(new Set())
  const [loadingSegment, setLoadingSegment] = useState(false)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [minScore, setMinScore] = useState(0)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())

  // Compose
  const [campName, setCampName] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; skipped: number; failures: { name: string; phone: string; reason: string }[] } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!activeWorkspaceId) return
    setLoading(true)
    const wsParam = `?workspaceId=${activeWorkspaceId}`
    const [{ data: l }, segsRes, twilioRes] = await Promise.all([
      supabase.from("leadboard").select("*").eq("workspace_id", activeWorkspaceId).order("relevance_score", { ascending: false }),
      fetch(`/api/segments${wsParam}`),
      fetch(`/api/settings/twilio${wsParam}`),
    ])
    setLeads((l as LeadboardEntry[]) ?? [])
    const segs = segsRes.ok ? await segsRes.json() : []
    setSegments(segs ?? [])
    if (twilioRes.ok) {
      const tw = await twilioRes.json()
      setTwilioConnected(tw.connected ?? false)
    } else {
      setTwilioConnected(false)
    }
    setLoading(false)
  }, [supabase, activeWorkspaceId])

  useEffect(() => { loadData() }, [loadData])

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
      setSegmentMemberIds(new Set(ids))
      setSelectedLeadIds(new Set(ids.filter((id) => leads.some((l) => l.id === id))))
    } finally {
      setLoadingSegment(false)
    }
  }

  const massLeads = leads.filter((l) => {
    if (!l.phone) return false  // SMS only works for leads with phone numbers
    if (segmentFilter !== "all" && !segmentMemberIds.has(l.id)) return false
    if (statusFilter !== "all" && l.status !== statusFilter) return false
    if (l.relevance_score < minScore) return false
    return true
  })

  async function handleSend() {
    if (!twilioConnected || selectedLeadIds.size === 0 || !message.trim()) return
    setSending(true)
    setSendError(null)
    setSendResult(null)
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIds: Array.from(selectedLeadIds),
          message,
          campName: campName.trim() || "SMS Campaign",
          workspaceId: activeWorkspaceId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSendResult(data)
        setSelectedLeadIds(new Set())
        setCampName("")
        setMessage("")
      } else {
        setSendError(data.error ?? "Send failed")
      }
    } finally {
      setSending(false)
    }
  }

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

  function insertMergeTag(tag: string) {
    setMessage((prev) => prev + tag)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">SMS Campaigns</h1>
            <Badge variant="outline" className="gap-1 text-xs">
              <Smartphone className="h-3 w-3" />
              Twilio
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Send SMS campaigns to your leads via Twilio</p>
        </div>
        <a href="/settings">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            {twilioConnected ? "Twilio Settings" : "Connect Twilio"}
          </Button>
        </a>
      </div>

      {/* Twilio connection status */}
      {twilioConnected === false && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Twilio is not connected. Configure your Account SID, Auth Token, and phone number in{" "}
            <a href="/settings" className="underline font-medium">Settings</a>{" "}
            to start sending SMS campaigns.
          </p>
        </div>
      )}
      {twilioConnected === true && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
            Twilio connected — ready to send SMS campaigns.
          </p>
        </div>
      )}

      <Tabs defaultValue="new">
        <TabsList className="h-9">
          <TabsTrigger value="new" className="text-sm">New Campaign</TabsTrigger>
          <TabsTrigger value="history" className="text-sm">History</TabsTrigger>
        </TabsList>

        {/* New Campaign */}
        <TabsContent value="new" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Left: Recipients */}
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
                        const seg = segments.find(s => s.id === segmentFilter)
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
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ background: seg.color }}
                            />
                            {seg.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status + Score filters */}
                <div className="flex items-center gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Status Filter</Label>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
                      <SelectTrigger className="h-8 text-sm">
                        <span className="text-sm">{statusFilter === "all" ? "All" : LEAD_STATUS_CONFIG[statusFilter as LeadStatus]?.label}</span>
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

                <div className="flex items-center gap-2 py-1 border-b">
                  <Checkbox
                    checked={selectedLeadIds.size === massLeads.length && massLeads.length > 0}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-xs text-muted-foreground">{selectedLeadIds.size} / {massLeads.length} selected</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : massLeads.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">No leads with phone numbers</p>
                      <p className="text-xs mt-1">Add phone numbers to leads in <a href="/leadboard" className="underline text-primary">Leadboard</a></p>
                    </div>
                  ) : massLeads.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 py-1.5">
                      <Checkbox
                        checked={selectedLeadIds.has(l.id)}
                        onCheckedChange={() => toggleLead(l.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate font-mono">{l.phone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{l.relevance_score}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Right: Compose */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Compose Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Campaign Name</Label>
                  <Input
                    className="h-8 text-sm"
                    value={campName}
                    onChange={(e) => setCampName(e.target.value)}
                    placeholder="e.g. Q2 Defense Follow-up"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">SMS Message</Label>
                    <span className={cn("text-xs tabular-nums", message.length > 160 ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {message.length}/160
                      {message.length > 160 && " (multi-part)"}
                    </span>
                  </div>
                  <Textarea
                    className="text-sm resize-none"
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi {{first_name}}, we wanted to follow up on our recent conversation about..."
                  />
                  {/* Merge tag chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="text-xs text-muted-foreground self-center">Insert:</span>
                    {MERGE_TAGS.map((tag) => (
                      <button
                        key={tag.value}
                        onClick={() => insertMergeTag(tag.value)}
                        className="text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors font-mono"
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {sendResult && (
                  <div className="flex items-start gap-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Sent to {sendResult.sent} recipient{sendResult.sent !== 1 ? "s" : ""}!</p>
                      {sendResult.skipped > 0 && <p className="text-xs mt-0.5">{sendResult.skipped} skipped (no phone number)</p>}
                      {sendResult.failed > 0 && <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400">{sendResult.failed} failed — check phone number format</p>}
                    </div>
                  </div>
                )}

                {sendError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {sendError}
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  disabled={!twilioConnected || selectedLeadIds.size === 0 || !message.trim() || sending}
                  className="w-full gap-2"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  {sending ? "Sending…" : `Send SMS Campaign (${selectedLeadIds.size} recipient${selectedLeadIds.size !== 1 ? "s" : ""})`}
                </Button>

                {!twilioConnected && (
                  <p className="text-xs text-muted-foreground text-center">
                    Connect Twilio in{" "}
                    <a href="/settings" className="underline">Settings</a>{" "}
                    to enable sending
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <div className="text-center py-20 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No SMS campaigns yet</p>
            <p className="text-xs mt-1">Your sent campaigns will appear here once Twilio is connected.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
