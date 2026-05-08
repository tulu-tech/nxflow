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
import {
  Plus, Trash2, Play, Users, ChevronRight, Mail,
  Clock, Loader2, CheckCircle2, ArrowRight, GitBranch
} from "lucide-react"

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

const EMPTY_STEP = (): SequenceStep => ({ step_number: 1, subject: "", body: "", delay_days: 0 })

export default function SequencesPage() {
  const supabase = useMemo(() => createClient(), [])
  const activeWorkspaceId = useCrmWorkspaceStore((s) => s.activeWorkspaceId)
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [selected, setSelected] = useState<Sequence | null>(null)
  const [loading, setLoading] = useState(true)

  // New sequence dialog
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newSteps, setNewSteps] = useState<SequenceStep[]>([EMPTY_STEP()])
  const [saving, setSaving] = useState(false)

  // Enroll dialog
  const [showEnroll, setShowEnroll] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [enrolling, setEnrolling] = useState(false)
  const [enrollSuccess, setEnrollSuccess] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return
    setLoading(true)
    const res = await fetch(`/api/sequences?workspaceId=${activeWorkspaceId}`)
    const data = await res.json()

    // Load enrollment counts
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: enrollments } = await supabase
        .from("sequence_enrollments")
        .select("sequence_id, status")
        .eq("user_id", user.id)
        .eq("status", "active")

      const counts: Record<string, number> = {}
      for (const e of enrollments ?? []) {
        counts[e.sequence_id] = (counts[e.sequence_id] ?? 0) + 1
      }
      setSequences((data ?? []).map((s: Sequence) => ({ ...s, enrollmentCount: counts[s.id] ?? 0 })))
    } else {
      setSequences(data ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load, activeWorkspaceId])

  async function handleCreate() {
    if (!newName.trim() || newSteps.some(s => !s.subject.trim() || !s.body.trim())) return
    setSaving(true)
    const steps = newSteps.map((s, i) => ({ ...s, step_number: i + 1 }))
    await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc, steps, workspaceId: activeWorkspaceId }),
    })
    setShowNew(false)
    setNewName("")
    setNewDesc("")
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
    const { data } = await supabase
      .from("leadboard")
      .select("id, full_name, email, company, status")
      .eq("user_id", user.id)
      .eq("workspace_id", activeWorkspaceId ?? "")
      .order("full_name")
    setLeads(data ?? [])
    setSelectedLeads(new Set())
    setEnrollSuccess(false)
    setShowEnroll(true)
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

  const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    contacted: "bg-amber-100 text-amber-700",
    replied: "bg-purple-100 text-purple-700",
    converted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sequences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Automated multi-step email campaigns</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Sequence
        </Button>
      </div>

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
                  onClick={() => setSelected(seq)}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{seq.name}</p>
                        {seq.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{seq.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {seq.sequence_steps?.length ?? 0} steps
                          </span>
                          {(seq.enrollmentCount ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {seq.enrollmentCount} active
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(seq.id) }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{selected.name}</CardTitle>
                      {selected.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{selected.description}</p>
                      )}
                    </div>
                    <Button size="sm" className="gap-2" onClick={openEnroll}>
                      <Play className="h-4 w-4" />
                      Enroll Leads
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Steps Timeline */}
                  <div className="space-y-1">
                    {[...(selected.sequence_steps ?? [])].sort((a, b) => a.step_number - b.step_number).map((step, i, arr) => (
                      <div key={step.id ?? i}>
                        <div className="flex gap-4">
                          {/* Timeline dot + line */}
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {step.step_number}
                            </div>
                            {i < arr.length - 1 && (
                              <div className="w-0.5 flex-1 bg-border my-1 min-h-[24px]" />
                            )}
                          </div>
                          {/* Step content */}
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 mb-1">
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
                  </div>

                  {selected.sequence_steps?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No steps defined</p>
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
                      placeholder="Hi {{name}}, I wanted to reach out about..."
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
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-xs text-muted-foreground">{selectedLeads.size} selected</span>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    if (selectedLeads.size === leads.length) setSelectedLeads(new Set())
                    else setSelectedLeads(new Set(leads.map((l) => l.id)))
                  }}
                >
                  {selectedLeads.size === leads.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] ?? ""}`}>
                      {lead.status}
                    </span>
                  </div>
                ))}
                {leads.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No leads in Leadboard yet</p>
                )}
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
