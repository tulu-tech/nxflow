"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"
import { Button } from "@/components/ui-crm/button"
import { Input } from "@/components/ui-crm/input"
import { Label } from "@/components/ui-crm/label"
import { Badge } from "@/components/ui-crm/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-crm/card"
import { Textarea } from "@/components/ui-crm/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui-crm/dialog"
import { Checkbox } from "@/components/ui-crm/checkbox"
import { Separator } from "@/components/ui-crm/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-crm/select"
import {
  Plus, Trash2, Play, Users, Mail,
  Clock, Loader2, CheckCircle2, ArrowRight, GitBranch,
  Zap, UserMinus, AlertCircle, Search,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface SequenceStep {
  id?: string
  step_number: number
  subject: string
  body: string
  delay_days: number
}

interface Sequence {
  id: string
  name: string
  description?: string
  from_email?: string | null
  is_active: boolean
  created_at: string
  sequence_steps: SequenceStep[]
  enrollmentCount?: number
}

interface Lead {
  id: string
  full_name: string
  email: string
  company?: string
  status: string
}

interface Enrollment {
  id: string
  lead_id: string
  current_step: number
  status: "active" | "completed" | "replied" | "paused"
  next_send_at: string | null
  leadboard: { full_name: string; email: string } | null
}

interface GmailAccount {
  id: string
  email: string
}

const EMPTY_STEP = (): SequenceStep => ({ step_number: 1, subject: "", body: "", delay_days: 0 })

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  replied:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  paused:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  new:       "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  converted: "bg-emerald-100 text-emerald-700",
  rejected:  "bg-red-100 text-red-700",
}

export default function SequencesPage() {
  const supabase = useMemo(() => createClient(), [])
  const activeWorkspaceId = useCrmWorkspaceStore((s) => s.activeWorkspaceId)
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [selected, setSelected] = useState<Sequence | null>(null)
  const [loading, setLoading] = useState(true)

  // Detail panel tab: "steps" | "enrollments"
  const [detailTab, setDetailTab] = useState<"steps" | "enrollments">("steps")
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)
  const [unenrolling, setUnenrolling] = useState<string | null>(null)

  // Gmail accounts for from_email selection
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([])

  // New sequence dialog
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newFromEmail, setNewFromEmail] = useState("")
  const [newSteps, setNewSteps] = useState<SequenceStep[]>([EMPTY_STEP()])
  const [saving, setSaving] = useState(false)

  // Enroll dialog
  const [showEnroll, setShowEnroll] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [enrolling, setEnrolling] = useState(false)
  const [enrollSuccess, setEnrollSuccess] = useState(false)
  const [enrollSearch, setEnrollSearch] = useState("")
  const [enrollSegment, setEnrollSegment] = useState("all")
  const [enrollSegments, setEnrollSegments] = useState<{ id: string; name: string; color: string }[]>([])
  const [enrollSegmentIds, setEnrollSegmentIds] = useState<Set<string>>(new Set())
  const [loadingEnrollSegment, setLoadingEnrollSegment] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Manual trigger
  const [triggering, setTriggering] = useState(false)
  const [triggerResult, setTriggerResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return
    setLoading(true)
    const [res, gmailRes] = await Promise.all([
      fetch(`/api/sequences?workspaceId=${activeWorkspaceId}`),
      supabase.from("gmail_tokens").select("id, email").not("email", "is", null).order("updated_at", { ascending: true }),
    ])
    const data = await res.json()
    setGmailAccounts((gmailRes.data ?? []) as GmailAccount[])

    // Load enrollment counts
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: activeCounts } = await supabase
        .from("sequence_enrollments")
        .select("sequence_id, status")
        .eq("user_id", user.id)
        .in("status", ["active", "completed", "replied"])

      const counts: Record<string, number> = {}
      for (const e of activeCounts ?? []) {
        counts[e.sequence_id] = (counts[e.sequence_id] ?? 0) + 1
      }
      setSequences((data ?? []).map((s: Sequence) => ({ ...s, enrollmentCount: counts[s.id] ?? 0 })))
    } else {
      setSequences(data ?? [])
    }
    setLoading(false)
  }, [supabase, activeWorkspaceId])

  useEffect(() => { load() }, [load])

  const loadEnrollments = useCallback(async (sequenceId: string) => {
    setEnrollmentsLoading(true)
    const { data } = await supabase
      .from("sequence_enrollments")
      .select("id, lead_id, current_step, status, next_send_at, leadboard(full_name, email)")
      .eq("sequence_id", sequenceId)
      .order("created_at", { ascending: false })

    setEnrollments((data ?? []).map((e) => ({
      ...e,
      leadboard: Array.isArray(e.leadboard) ? (e.leadboard[0] ?? null) : (e.leadboard ?? null),
    })) as Enrollment[])
    setEnrollmentsLoading(false)
  }, [supabase])

  function selectSequence(seq: Sequence) {
    setSelected(seq)
    setDetailTab("steps")
    setTriggerResult(null)
  }

  function switchToEnrollments(seq: Sequence) {
    setDetailTab("enrollments")
    loadEnrollments(seq.id)
  }

  async function handleUnenroll(enrollmentId: string) {
    setUnenrolling(enrollmentId)
    await fetch(`/api/sequences/enroll?enrollmentId=${enrollmentId}`, { method: "DELETE" })
    setUnenrolling(null)
    if (selected) loadEnrollments(selected.id)
    load()
  }

  async function handleCreate() {
    if (!newName.trim() || newSteps.some(s => !s.subject.trim() || !s.body.trim())) return
    setSaving(true)
    const steps = newSteps.map((s, i) => ({ ...s, step_number: i + 1 }))
    await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        description: newDesc,
        steps,
        workspaceId: activeWorkspaceId,
        fromEmail: newFromEmail || undefined,
      }),
    })
    setShowNew(false)
    setNewName("")
    setNewDesc("")
    setNewFromEmail("")
    setNewSteps([EMPTY_STEP()])
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    await fetch("/api/sequences", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, workspaceId: activeWorkspaceId }),
    })
    setDeleteId(null)
    if (selected?.id === id) setSelected(null)
    load()
  }

  async function openEnroll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [leadsRes, segRes] = await Promise.all([
      supabase
        .from("leadboard")
        .select("id, full_name, email, company, status")
        .eq("user_id", user.id)
        .eq("workspace_id", activeWorkspaceId ?? "")
        .order("full_name"),
      fetch(`/api/init?workspaceId=${activeWorkspaceId}`),
    ])
    setLeads(leadsRes.data ?? [])
    if (segRes.ok) {
      const init = await segRes.json()
      setEnrollSegments(init.segments ?? [])
    }
    setSelectedLeads(new Set())
    setEnrollSearch("")
    setEnrollSegment("all")
    setEnrollSegmentIds(new Set())
    setEnrollSuccess(false)
    setShowEnroll(true)
  }

  async function handleEnrollSegmentChange(segId: string) {
    setEnrollSegment(segId)
    if (segId === "all") {
      setEnrollSegmentIds(new Set())
      return
    }
    setLoadingEnrollSegment(true)
    try {
      const res = await fetch(`/api/segments/${segId}/members`)
      const ids: string[] = res.ok ? await res.json() : []
      setEnrollSegmentIds(new Set(ids))
    } finally {
      setLoadingEnrollSegment(false)
    }
  }

  async function handleEnroll() {
    if (!selected || selectedLeads.size === 0) return
    setEnrolling(true)
    await fetch("/api/sequences/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: [...selectedLeads], sequenceId: selected.id }),
    })
    setEnrolling(false)
    setEnrollSuccess(true)
    setTimeout(() => setShowEnroll(false), 1500)
    load()
  }

  async function handleTriggerNow() {
    setTriggering(true)
    setTriggerResult(null)
    try {
      const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET
      const res = await fetch("/api/cron/sequences", {
        headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
      })
      const data = await res.json()
      if (res.ok) {
        setTriggerResult(`✓ Processed ${data.processed} enrollments — ${data.sent} emails sent`)
      } else {
        setTriggerResult(`Error: ${data.error ?? "Unknown error"}`)
      }
    } catch {
      setTriggerResult("Network error — check console")
    } finally {
      setTriggering(false)
      if (selected) loadEnrollments(selected.id)
      load()
    }
  }

  function addStep() {
    setNewSteps(prev => [...prev, { step_number: prev.length + 1, subject: "", body: "", delay_days: 3 }])
  }

  function removeStep(i: number) {
    if (newSteps.length === 1) return
    setNewSteps(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateStep(i: number, field: keyof SequenceStep, value: string | number) {
    setNewSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sequences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Automated multi-step email campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleTriggerNow} disabled={triggering}>
            {triggering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Trigger Now
          </Button>
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Sequence
          </Button>
        </div>
      </div>

      {triggerResult && (
        <div className={cn(
          "flex items-center gap-2 text-sm rounded-md px-3 py-2 mb-4",
          triggerResult.startsWith("✓")
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
            : "bg-destructive/10 text-destructive"
        )}>
          {triggerResult.startsWith("✓") ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {triggerResult}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sequence List */}
          <div className="space-y-3">
            {sequences.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border rounded-lg">
                <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No sequences yet</p>
                <p className="text-xs mt-1">Create your first drip campaign</p>
                <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setShowNew(true)}>
                  <Plus className="h-4 w-4" /> New Sequence
                </Button>
              </div>
            ) : (
              sequences.map((seq) => (
                <Card
                  key={seq.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selected?.id === seq.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => selectSequence(seq)}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{seq.name}</p>
                        {seq.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{seq.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {seq.sequence_steps?.length ?? 0} steps
                          </span>
                          {(seq.enrollmentCount ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {seq.enrollmentCount} enrolled
                            </span>
                          )}
                          {seq.from_email && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{seq.from_email}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(seq.id) }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Sequence Detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{selected.name}</CardTitle>
                      {selected.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{selected.description}</p>
                      )}
                      {selected.from_email && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {selected.from_email}
                        </p>
                      )}
                    </div>
                    <Button size="sm" className="gap-2 shrink-0" onClick={openEnroll}>
                      <Play className="h-4 w-4" />
                      Enroll Leads
                    </Button>
                  </div>

                  {/* Tab switcher */}
                  <div className="flex items-center gap-1 mt-3 border-b">
                    <button
                      onClick={() => setDetailTab("steps")}
                      className={cn(
                        "text-sm px-3 py-1.5 border-b-2 transition-colors -mb-px",
                        detailTab === "steps"
                          ? "border-primary text-foreground font-medium"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Steps
                    </button>
                    <button
                      onClick={() => switchToEnrollments(selected)}
                      className={cn(
                        "text-sm px-3 py-1.5 border-b-2 transition-colors -mb-px flex items-center gap-1.5",
                        detailTab === "enrollments"
                          ? "border-primary text-foreground font-medium"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Enrollments
                      {(selected.enrollmentCount ?? 0) > 0 && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                          {selected.enrollmentCount}
                        </span>
                      )}
                    </button>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* ── Steps tab ── */}
                  {detailTab === "steps" && (
                    <div className="space-y-1">
                      {[...(selected.sequence_steps ?? [])].sort((a, b) => a.step_number - b.step_number).map((step, i, arr) => (
                        <div key={step.id ?? i}>
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {step.step_number}
                              </div>
                              {i < arr.length - 1 && (
                                <div className="w-0.5 flex-1 bg-border my-1 min-h-[24px]" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-medium text-foreground">{step.subject}</span>
                                {step.delay_days === 0 ? (
                                  <Badge variant="secondary" className="text-xs">Immediately</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Clock className="h-3 w-3" />
                                    Day {step.delay_days}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded p-2">
                                {step.body}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {selected.sequence_steps?.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No steps defined</p>
                      )}
                    </div>
                  )}

                  {/* ── Enrollments tab ── */}
                  {detailTab === "enrollments" && (
                    <div>
                      {enrollmentsLoading ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : enrollments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No enrollments yet</p>
                          <p className="text-xs mt-1">Click "Enroll Leads" to add leads to this sequence</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/40 border-b">
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Lead</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Step</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Next Send</th>
                                <th className="px-3 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {enrollments.map((e) => {
                                const totalSteps = selected.sequence_steps?.length ?? 0
                                const stepLabel = `${e.current_step + 1} / ${totalSteps}`
                                return (
                                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="px-3 py-2.5">
                                      <p className="font-medium text-foreground truncate max-w-[140px]">
                                        {e.leadboard?.full_name ?? "Unknown"}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                                        {e.leadboard?.email ?? "—"}
                                      </p>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className="text-xs font-mono text-muted-foreground">{stepLabel}</span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[e.status])}>
                                        {e.status}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 hidden sm:table-cell">
                                      <span className="text-xs text-muted-foreground">
                                        {e.next_send_at && e.status === "active"
                                          ? format(new Date(e.next_send_at), "MMM d, HH:mm")
                                          : "—"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                      {(e.status === "active") && (
                                        <button
                                          onClick={() => handleUnenroll(e.id)}
                                          disabled={unenrolling === e.id}
                                          title="Unenroll"
                                          className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                          {unenrolling === e.id
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <UserMinus className="h-3.5 w-3.5" />
                                          }
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground border rounded-lg">
                <div className="text-center">
                  <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select a sequence to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New Sequence Dialog ────────────────────────────────── */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Sequence Name *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. APAC Intro Campaign" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>From (Gmail Account)</Label>
                {gmailAccounts.length > 0 ? (
                  <Select value={newFromEmail} onValueChange={(v) => setNewFromEmail(v ?? "")}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Use default Gmail account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Default account</SelectItem>
                      {gmailAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.email}>{acc.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    No Gmail connected — connect in Settings
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Steps</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={addStep}>
                  <Plus className="h-3 w-3" /> Add Step
                </Button>
              </div>

              {newSteps.map((step, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium">Step {i + 1}</span>
                    </div>
                    {newSteps.length > 1 && (
                      <button onClick={() => removeStep(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Send after</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-20 h-8 text-sm"
                        value={step.delay_days}
                        onChange={(e) => updateStep(i, "delay_days", parseInt(e.target.value) || 0)}
                      />
                      <span className="text-sm text-muted-foreground">days after previous step</span>
                      {step.delay_days === 0 && i === 0 && (
                        <Badge variant="secondary" className="text-xs">Immediately</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Subject *</Label>
                    <Input
                      className="h-8 text-sm"
                      value={step.subject}
                      onChange={(e) => updateStep(i, "subject", e.target.value)}
                      placeholder="Email subject line"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Body *</Label>
                    <Textarea
                      rows={4}
                      className="text-sm resize-none"
                      value={step.body}
                      onChange={(e) => updateStep(i, "body", e.target.value)}
                      placeholder="Hi {{first_name}}, I wanted to reach out about..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !newName.trim() || newSteps.some(s => !s.subject.trim() || !s.body.trim())}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Create Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Enroll Leads Dialog ───────────────────────────────── */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent className="max-w-lg max-h-[75vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Enroll Leads — {selected?.name}</DialogTitle>
          </DialogHeader>

          {enrollSuccess ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="text-center text-emerald-600">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
                <p className="font-medium">Successfully enrolled {selectedLeads.size} lead{selectedLeads.size > 1 ? "s" : ""}!</p>
              </div>
            </div>
          ) : (
            <>
              {/* Search + Segment filters */}
              <div className="space-y-2 px-1 pb-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-8 h-9 text-sm"
                    placeholder="Search by name, email or company..."
                    value={enrollSearch}
                    onChange={(e) => setEnrollSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={enrollSegment} onValueChange={(v) => handleEnrollSegmentChange(v ?? "all")}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      {loadingEnrollSegment
                        ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</span>
                        : enrollSegment === "all"
                          ? "All Leads"
                          : (enrollSegments.find(s => s.id === enrollSegment)?.name ?? "Segment")
                      }
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leads</SelectItem>
                      {enrollSegments.map((seg) => (
                        <SelectItem key={seg.id} value={seg.id}>
                          <span className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                            {seg.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const filtered = leads.filter(l => {
                      if (enrollSegment !== "all" && !enrollSegmentIds.has(l.id)) return false
                      if (!enrollSearch) return true
                      const q = enrollSearch.toLowerCase()
                      return l.full_name.toLowerCase().includes(q) ||
                        l.email.toLowerCase().includes(q) ||
                        (l.company ?? "").toLowerCase().includes(q)
                    })
                    return (
                      <button
                        className="text-xs text-primary hover:underline whitespace-nowrap shrink-0"
                        onClick={() => {
                          const ids = filtered.map(l => l.id)
                          const allSelected = ids.every(id => selectedLeads.has(id))
                          setSelectedLeads(prev => {
                            const next = new Set(prev)
                            if (allSelected) ids.forEach(id => next.delete(id))
                            else ids.forEach(id => next.add(id))
                            return next
                          })
                        }}
                      >
                        {filtered.every(l => selectedLeads.has(l.id)) && filtered.length > 0 ? "Deselect all" : "Select all"}
                      </button>
                    )
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">{selectedLeads.size} selected</p>
              </div>

              {/* Lead list */}
              <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0 border rounded-lg">
                {(() => {
                  const filtered = leads.filter(l => {
                    if (enrollSegment !== "all" && !enrollSegmentIds.has(l.id)) return false
                    if (!enrollSearch) return true
                    const q = enrollSearch.toLowerCase()
                    return l.full_name.toLowerCase().includes(q) ||
                      l.email.toLowerCase().includes(q) ||
                      (l.company ?? "").toLowerCase().includes(q)
                  })
                  if (filtered.length === 0) return (
                    <p className="text-center text-sm text-muted-foreground py-8">No leads match</p>
                  )
                  return filtered.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLeads((prev) => {
                        const next = new Set(prev)
                        next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id)
                        return next
                      })}
                    >
                      <Checkbox checked={selectedLeads.has(lead.id)} readOnly />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.email}{lead.company ? ` · ${lead.company}` : ""}</p>
                      </div>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", STATUS_COLORS[lead.status] ?? "")}>
                        {lead.status}
                      </span>
                    </div>
                  ))
                })()}
              </div>

              <DialogFooter className="border-t pt-3">
                <Button variant="outline" onClick={() => setShowEnroll(false)}>Cancel</Button>
                <Button onClick={handleEnroll} disabled={enrolling || selectedLeads.size === 0} className="gap-2">
                  {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Enroll {selectedLeads.size > 0 ? `${selectedLeads.size} Lead${selectedLeads.size > 1 ? "s" : ""}` : "Leads"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Sequence?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the sequence and all its steps. Active enrollments will be cancelled.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
