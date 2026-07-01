"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"
import { Button } from "@/components/ui-crm/button"
import { Badge } from "@/components/ui-crm/badge"
import { Textarea } from "@/components/ui-crm/textarea"
import { Label } from "@/components/ui-crm/label"
import { Separator } from "@/components/ui-crm/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui-crm/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui-crm/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui-crm/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-crm/select"
import {
  Phone, PhoneCall, PhoneMissed, Building2, MapPin,
  Mail, Loader2, Plus, Copy, Check, CheckCircle2,
  Wand2, Download, Search as SearchIcon,
} from "lucide-react"
import { Checkbox } from "@/components/ui-crm/checkbox"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { format, startOfWeek, startOfMonth, subDays, subMonths, endOfMonth, eachDayOfInterval } from "date-fns"
import type {
  CallingLead, CallAttempt,
  WorkflowStage, PriorityLevel, CallStatus, CallOutcome,
} from "@/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKLY_TARGET  = 25
const MONTHLY_TARGET = 100

const STAGE_CFG: Record<WorkflowStage, { label: string; color: string; bg: string }> = {
  raw:              { label: "Raw",               color: "#9ca3af", bg: "rgba(156,163,175,.15)" },
  needs_cleaning:   { label: "Needs Cleaning",    color: "#f97316", bg: "rgba(249,115,22,.15)"  },
  needs_enrichment: { label: "Needs Enrichment",  color: "#f59e0b", bg: "rgba(245,158,11,.15)"  },
  lusha_lookup:     { label: "Lusha Lookup",      color: "#3b82f6", bg: "rgba(59,130,246,.15)"  },
  direct_phone:     { label: "Direct Phone ✓",   color: "#06b6d4", bg: "rgba(6,182,212,.15)"   },
  operator_route:   { label: "Operator Route",    color: "#a78bfa", bg: "rgba(167,139,250,.15)" },
  ready_to_call:    { label: "Ready to Call",     color: "#818cf8", bg: "rgba(129,140,248,.15)" },
  called:           { label: "Called",            color: "#0ea5e9", bg: "rgba(14,165,233,.15)"  },
  follow_up:        { label: "Follow-up",         color: "#eab308", bg: "rgba(234,179,8,.15)"   },
  warm:             { label: "Warm 🔥",           color: "#10b981", bg: "rgba(16,185,129,.15)"  },
  disqualified:     { label: "Disqualified",      color: "#ef4444", bg: "rgba(239,68,68,.15)"   },
}

const PRIORITY_CFG: Record<string, { color: string; bg: string }> = {
  A: { color: "#ef4444", bg: "rgba(239,68,68,.15)" },
  B: { color: "#f59e0b", bg: "rgba(245,158,11,.15)" },
  C: { color: "#9ca3af", bg: "rgba(156,163,175,.15)" },
}

const CALL_STATUS_CFG: Record<CallStatus, { label: string; color: string }> = {
  connected:        { label: "Connected",        color: "#10b981" },
  no_answer:        { label: "No Answer",        color: "#9ca3af" },
  voicemail:        { label: "Voicemail",        color: "#3b82f6" },
  wrong_number:     { label: "Wrong Number",     color: "#ef4444" },
  invalid_number:   { label: "Invalid Number",   color: "#ef4444" },
  operator_blocked: { label: "Operator Blocked", color: "#f97316" },
  call_later:       { label: "Call Later",       color: "#f59e0b" },
  not_relevant:     { label: "Not Relevant",     color: "#6b7280" },
}

const CALL_OUTCOME_CFG: Record<CallOutcome, { label: string; color: string }> = {
  interested:         { label: "Interested",          color: "#10b981" },
  send_email:         { label: "Send Email",           color: "#3b82f6" },
  wrong_person:       { label: "Wrong Person",         color: "#f59e0b" },
  no_authority:       { label: "No Authority",         color: "#f97316" },
  existing_supplier:  { label: "Existing Supplier",    color: "#8b5cf6" },
  future_need:        { label: "Future Need",          color: "#06b6d4" },
  disqualified:       { label: "Disqualified",         color: "#ef4444" },
  follow_up_required: { label: "Follow-up Required",   color: "#eab308" },
}

const QUICK_FILTERS = [
  { id: "all",           label: "All"            },
  { id: "ready_to_call", label: "Ready to Call"  },
  { id: "follow_up",     label: "Follow-up Due"  },
  { id: "priority_a",    label: "Priority A"     },
  { id: "warm",          label: "Warm"           },
  { id: "no_phone",      label: "No Phone"       },
  { id: "needs_cleaning",label: "Needs Cleaning" },
]

const DEPARTMENTS = [
  "Maintenance Department",
  "Procurement Department",
  "Logistics Department",
  "Defense Programs",
  "Technical Department",
  "Workshop Operations",
  "After-sales / Service",
]

// ─── Script Builders ──────────────────────────────────────────────────────────

function buildCallScript(lead: CallingLead): string {
  const firstName = (lead.full_name ?? "there").split(" ")[0]
  const company   = lead.company ?? "your organization"
  const seg       = (lead.segment ?? "").toLowerCase()
  let vp = "specialized equipment for removing and installing run-flat systems on armored and tactical vehicle tires"
  if (seg.includes("mainten") || seg.includes("workshop"))
    vp = "equipment that makes run-flat replacement safer, faster, and more controlled in armored vehicle workshops"
  else if (seg.includes("oem") || seg.includes("manufactur"))
    vp = "equipment that improves after-sales and service capability for vehicles equipped with run-flat systems"
  else if (seg.includes("contractor") || seg.includes("defense"))
    vp = "equipment that supports field maintenance and reduces dependency on external tire service"
  else if (seg.includes("procur"))
    vp = "equipment that improves operational efficiency, workshop safety, and long-term service readiness"
  return `Hi ${firstName}, this is Batuhan from GM Defensive. We manufacture ${vp}. I'm trying to understand whether ${company} handles this type of maintenance equipment or if there's someone more relevant I should speak with.`
}

function buildOperatorScripts(lead: CallingLead) {
  const dept = (lead.position ?? "").toLowerCase().includes("procur")
    ? "Procurement Department"
    : (lead.position ?? "").toLowerCase().includes("mainten")
    ? "Maintenance Department"
    : "Maintenance or Procurement Department"
  return [
    {
      label: "Main Opener",
      text: `Hello, this is Batuhan from GM Defensive. We are trying to reach the person responsible for military vehicle maintenance equipment, run-flat tire service, or fleet maintenance solutions. Could you please connect me to the ${dept}?`,
    },
    ...(lead.full_name ? [{
      label: "If Contact Name Known",
      text: `Hello, I'm trying to reach ${lead.full_name} from the ${dept} regarding military vehicle maintenance equipment. Could you please connect me?`,
    }] : []),
    {
      label: "If Asked for Reason",
      text: `It's regarding specialized equipment for removing and installing run-flat systems on armored and tactical vehicle tires. We'd like to understand whether this is relevant to your maintenance or procurement team.`,
    },
    {
      label: "If Not Connected",
      text: `Could you please tell me the best department or email address for this type of technical equipment inquiry?`,
    },
  ]
}

function getWeekNumber(d: Date) {
  const s = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7)
}

// ─── Monthly Report helpers ─────────────────────────────────────────────────

interface MonthStats {
  monthStr: string
  total: number
  uniqueLeads: number
  repeatLeads: number
  repeatDetail: { company: string; contact: string; times: number }[]
  connected: number
  connectRate: number
  interestedCount: number
  interestRate: number
  statusCounts: Record<string, number>
  outcomeCounts: Record<string, number>
  priorityCounts: Record<string, number>
  weeklyData: { week: string; calls: number }[]
  objections: { text: string; count: number }[]
  highlights: { company: string; contact: string; outcome: CallOutcome; notes: string; date: string }[]
  missingNextAction: number
  noPhoneCount: number
}

function statsForMonth(monthStr: string, attempts: CallAttempt[], leads: CallingLead[]): MonthStats {
  const leadById = new Map(leads.map(l => [l.id, l]))
  const start   = `${monthStr}-01`
  const endStr  = format(endOfMonth(new Date(`${start}T00:00:00`)), "yyyy-MM-dd")
  const inMonth = attempts.filter(a => a.call_date >= start && a.call_date <= endStr)

  const byLead: Record<string, CallAttempt[]> = {}
  inMonth.forEach(a => { (byLead[a.lead_id] ||= []).push(a) })
  const uniqueLeads   = Object.keys(byLead).length
  const repeatEntries = Object.entries(byLead).filter(([, v]) => v.length > 1)
  const repeatDetail  = repeatEntries.map(([id, v]) => {
    const l = leadById.get(id)
    return { company: l?.company ?? "—", contact: l?.full_name ?? "—", times: v.length }
  })

  const statusCounts: Record<string, number> = {}
  inMonth.forEach(a => { statusCounts[a.call_status] = (statusCounts[a.call_status] ?? 0) + 1 })
  const connected    = statusCounts["connected"] ?? 0
  const connectRate  = inMonth.length > 0 ? Math.round((connected / inMonth.length) * 100) : 0

  const outcomeCounts: Record<string, number> = {}
  inMonth.forEach(a => { if (a.call_outcome) outcomeCounts[a.call_outcome] = (outcomeCounts[a.call_outcome] ?? 0) + 1 })
  const interestedCount = outcomeCounts["interested"] ?? 0
  const interestRate    = connected > 0 ? Math.round((interestedCount / connected) * 100) : 0

  const priorityCounts: Record<string, number> = {}
  inMonth.forEach(a => {
    const p = leadById.get(a.lead_id)?.priority_level ?? "unscored"
    priorityCounts[p] = (priorityCounts[p] ?? 0) + 1
  })

  const weeks: Record<string, number> = {}
  inMonth.forEach(a => {
    const d   = new Date(`${a.call_date}T00:00:00`)
    const day = (d.getDay() + 6) % 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - day)
    const key = format(monday, "MMM d")
    weeks[key] = (weeks[key] ?? 0) + 1
  })
  const weeklyData = Object.entries(weeks).map(([week, calls]) => ({ week, calls }))

  const objectionCounts: Record<string, number> = {}
  inMonth.forEach(a => {
    const o = a.objection?.trim()
    if (o && o !== "-") objectionCounts[o] = (objectionCounts[o] ?? 0) + 1
  })
  const objections = Object.entries(objectionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([text, count]) => ({ text, count }))

  const highlights = inMonth
    .filter(a => (a.call_outcome === "interested" || a.call_outcome === "future_need") && a.notes)
    .map(a => {
      const l = leadById.get(a.lead_id)
      return { company: l?.company ?? "—", contact: l?.full_name ?? "—", outcome: a.call_outcome as CallOutcome, notes: a.notes!, date: a.call_date }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const missingNextAction = inMonth.filter(a =>
    (a.call_outcome === "interested" || a.call_outcome === "follow_up_required" || a.call_outcome === "future_need") && !a.next_action_date
  ).length

  const noPhoneCount = leads.filter(l => !l.phone && !l.company_phone).length

  return {
    monthStr, total: inMonth.length, uniqueLeads, repeatLeads: repeatEntries.length, repeatDetail,
    connected, connectRate, interestedCount, interestRate, statusCounts, outcomeCounts, priorityCounts,
    weeklyData, objections, highlights, missingNextAction, noPhoneCount,
  }
}

function buildInsights(cur: MonthStats, prev: MonthStats | null, targets: { weekly: number; monthly: number }): string[] {
  const insights: string[] = []
  if (cur.total === 0) return ["Bu ay için kayıtlı arama bulunmuyor."]

  const goalPct = targets.monthly > 0 ? Math.round((cur.uniqueLeads / targets.monthly) * 100) : 0
  insights.push(`Aylık hedefin %${goalPct}'i tamamlandı (${cur.uniqueLeads}/${targets.monthly} tekil kişi arandı).`)

  if (prev && prev.total > 0) {
    const diff = Math.round(((cur.total - prev.total) / prev.total) * 100)
    insights.push(`Toplam arama hacmi bir önceki aya göre ${diff >= 0 ? "+" : ""}${diff}% değişti (${prev.total} → ${cur.total}).`)
  } else if (prev) {
    insights.push("Bir önceki ay için karşılaştırılacak arama kaydı yok.")
  }

  if (cur.repeatLeads > 0) {
    insights.push(`${cur.repeatLeads} kişi bu ay birden fazla kez arandı.`)
  }
  if (cur.missingNextAction > 0) {
    insights.push(`${cur.missingNextAction} ilgili/takip gerektiren görüşmede takip tarihi girilmemiş — kaybolma riski var.`)
  }

  const aP = cur.priorityCounts["A"] ?? 0
  const cP = cur.priorityCounts["C"] ?? 0
  if (cP > aP * 2) {
    insights.push("Aramaların büyük kısmı düşük öncelikli (C) leadlere gitti; A-öncelikli hesaplara odaklanmak dönüşüm oranını artırabilir.")
  }

  if (cur.weeklyData.length >= 2) {
    const first = cur.weeklyData[0].calls
    const last  = cur.weeklyData[cur.weeklyData.length - 1].calls
    if (last < first * 0.5) insights.push("Ay içinde arama hacminde belirgin bir düşüş var — nedenini araştırmakta fayda var.")
  }

  if (cur.noPhoneCount > 0) {
    insights.push(`${cur.noPhoneCount} lead'in hiç telefon numarası yok; bunlar zenginleştirme/Lusha kuyruğuna yönlendirilmeli.`)
  }

  return insights
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function CallingPlanPage() {
  const router         = useRouter()
  const supabase       = useMemo(() => createClient(), [])
  const workspaceId    = useCrmWorkspaceStore((s) => s.activeWorkspaceId)

  const [leads,        setLeads]        = useState<CallingLead[]>([])
  const [attempts,     setAttempts]     = useState<CallAttempt[]>([])
  const [loading,      setLoading]      = useState(true)
  const [selectedLead, setSelectedLead] = useState<CallingLead | null>(null)
  const [sheetOpen,    setSheetOpen]    = useState(false)
  const [filter,       setFilter]       = useState("all")
  const [stageFilter,  setStageFilter]  = useState("all")
  const [search,       setSearch]       = useState("")
  const [saving,       setSaving]       = useState(false)
  const [copied,       setCopied]       = useState<string | null>(null)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [mainTab,      setMainTab]      = useState("board")
  const [autoScoring,  setAutoScoring]  = useState(false)
  const [kpiModal,     setKpiModal]     = useState<string | null>(null)
  const [reportMonth,  setReportMonth]  = useState(() => format(new Date(), "yyyy-MM"))
  const [targets,      setTargets]      = useState({ weekly: WEEKLY_TARGET, monthly: MONTHLY_TARGET })

  const [form, setForm] = useState({
    call_route:       "direct",
    call_status:      "",
    call_outcome:     "",
    notes:            "",
    objection:        "",
    next_action_date: "",
  })

  // ── Load ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    const [lr, ar] = await Promise.all([
      supabase.from("leadboard").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("call_attempts").select("*").eq("workspace_id", workspaceId).order("call_date", { ascending: false }),
    ])
    setLeads((lr.data ?? []) as CallingLead[])
    setAttempts((ar.data ?? []) as CallAttempt[])
    setLoading(false)
  }, [supabase, workspaceId])

  useEffect(() => { load() }, [load])

  // ── Targets (persisted per workspace) ──────────────────────────────────────

  useEffect(() => {
    if (!workspaceId) return
    const raw = localStorage.getItem(`callingPlanTargets:${workspaceId}`)
    if (raw) {
      try { setTargets(JSON.parse(raw)) } catch { setTargets({ weekly: WEEKLY_TARGET, monthly: MONTHLY_TARGET }) }
    } else {
      setTargets({ weekly: WEEKLY_TARGET, monthly: MONTHLY_TARGET })
    }
  }, [workspaceId])

  const updateTargets = useCallback((patch: Partial<{ weekly: number; monthly: number }>) => {
    setTargets(prev => {
      const next = { ...prev, ...patch }
      if (workspaceId) localStorage.setItem(`callingPlanTargets:${workspaceId}`, JSON.stringify(next))
      return next
    })
  }, [workspaceId])

  // ── KPIs ─────────────────────────────────────────────────────────────────

  const now        = new Date()
  const weekStart  = startOfWeek(now, { weekStartsOn: 1 }).toISOString().split("T")[0]
  const monthStart = startOfMonth(now).toISOString().split("T")[0]
  const today      = now.toISOString().split("T")[0]

  // "Called" = either a logged call_attempt OR a lead whose stage advanced to
  // called/follow_up/warm/disqualified (tracked via last_contacted_at).
  const CALLED_STAGES = new Set(["called", "follow_up", "warm", "disqualified"])

  const weekCallLeads = useMemo(() => {
    const ids = new Set(attempts.filter(a => a.call_date >= weekStart).map(a => a.lead_id))
    leads.filter(l => CALLED_STAGES.has(l.workflow_stage) && l.last_contacted_at && l.last_contacted_at.slice(0,10) >= weekStart).forEach(l => ids.add(l.id))
    return leads.filter(l => ids.has(l.id))
  }, [attempts, leads, weekStart])

  const monthCallLeads = useMemo(() => {
    const ids = new Set(attempts.filter(a => a.call_date >= monthStart).map(a => a.lead_id))
    leads.filter(l => CALLED_STAGES.has(l.workflow_stage) && l.last_contacted_at && l.last_contacted_at.slice(0,10) >= monthStart).forEach(l => ids.add(l.id))
    return leads.filter(l => ids.has(l.id))
  }, [attempts, leads, monthStart])

  const connectedLeads = useMemo(() => {
    const ids = new Set(attempts.filter(a => a.call_date >= monthStart && a.call_status === "connected").map(a => a.lead_id))
    return leads.filter(l => ids.has(l.id))
  }, [attempts, leads, monthStart])

  const readyLeads = useMemo(() => leads.filter(l => l.workflow_stage === "ready_to_call"), [leads])
  const dueLeads   = useMemo(() => leads.filter(l => l.next_action_date && l.next_action_date <= today), [leads, today])
  const warmLeads  = useMemo(() => leads.filter(l => l.workflow_stage === "warm"), [leads])

  const weekCalls  = weekCallLeads.length
  const monthCalls = monthCallLeads.length
  const connected  = connectedLeads.length
  const warmCount  = warmLeads.length
  const readyCount = readyLeads.length
  const dueCount   = dueLeads.length

  // ── Filtered leads ────────────────────────────────────────────────────────

  const visible = useMemo(() => {
    let r = leads
    switch (filter) {
      case "ready_to_call":  r = r.filter(l => l.workflow_stage === "ready_to_call"); break
      case "follow_up":      r = r.filter(l => l.next_action_date && l.next_action_date <= today); break
      case "priority_a":     r = r.filter(l => l.priority_level === "A"); break
      case "warm":           r = r.filter(l => l.workflow_stage === "warm"); break
      case "no_phone":       r = r.filter(l => !l.phone && !l.company_phone); break
      case "needs_cleaning": r = r.filter(l => l.workflow_stage === "needs_cleaning"); break
    }
    if (stageFilter !== "all") r = r.filter(l => (l.workflow_stage ?? "raw") === stageFilter)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(l => l.full_name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.position?.toLowerCase().includes(q))
    }
    return r
  }, [leads, filter, stageFilter, search, today])

  // ── Update helpers ────────────────────────────────────────────────────────

  const patchLead = useCallback(async (id: string, patch: Partial<CallingLead>) => {
    // When a lead's stage advances to a "called" stage via inline dropdown,
    // stamp last_contacted_at so it counts toward the weekly/monthly KPI.
    const finalPatch: Partial<CallingLead> = { ...patch }
    if (patch.workflow_stage && ["called","follow_up","warm","disqualified"].includes(patch.workflow_stage)) {
      const existing = leads.find(l => l.id === id)
      if (!existing?.last_contacted_at) {
        finalPatch.last_contacted_at = new Date().toISOString()
      }
    }
    await supabase.from("leadboard").update(finalPatch).eq("id", id)
    setLeads(p => p.map(l => l.id === id ? { ...l, ...finalPatch } : l))
    setSelectedLead(p => p?.id === id ? { ...p, ...finalPatch } : p)
  }, [supabase, leads])

  // ── Log call ─────────────────────────────────────────────────────────────

  const logCall = useCallback(async () => {
    if (!selectedLead || !form.call_status || !workspaceId) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const row = {
        workspace_id:     workspaceId,
        user_id:          user.id,
        lead_id:          selectedLead.id,
        call_date:        today,
        call_time:        now.toTimeString().slice(0, 5),
        phone_number:     form.call_route === "direct" ? (selectedLead.phone ?? null) : (selectedLead.company_phone ?? null),
        call_route:       form.call_route,
        call_status:      form.call_status,
        call_outcome:     form.call_outcome || null,
        notes:            form.notes || null,
        objection:        form.objection || null,
        next_action_date: form.next_action_date || null,
      }
      const { data: saved } = await supabase.from("call_attempts").insert(row).select("*").single()
      if (saved) setAttempts(p => [saved as CallAttempt, ...p])

      // Auto-advance stage
      let newStage: WorkflowStage = selectedLead.workflow_stage
      if (form.call_status === "connected") {
        if (form.call_outcome === "follow_up_required" || form.call_outcome === "send_email") newStage = "follow_up"
        else if (form.call_outcome === "interested")  newStage = "warm"
        else if (form.call_outcome === "disqualified") newStage = "disqualified"
        else newStage = "called"
      } else if (!["called","follow_up","warm","disqualified"].includes(newStage)) {
        newStage = "called"
      }

      await patchLead(selectedLead.id, {
        workflow_stage:   newStage,
        last_contacted_at: now.toISOString(),
        ...(form.next_action_date ? { next_action_date: form.next_action_date } : {}),
      } as Partial<CallingLead>)

      setForm({ call_route: "direct", call_status: "", call_outcome: "", notes: "", objection: "", next_action_date: "" })
    } finally {
      setSaving(false)
    }
  }, [selectedLead, form, workspaceId, supabase, today, now, patchLead])

  // ── Bulk update ───────────────────────────────────────────────────────────

  const bulkUpdate = useCallback(async (patch: Partial<CallingLead>) => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const finalPatch: Partial<CallingLead> = { ...patch }
    if (patch.workflow_stage && ["called","follow_up","warm","disqualified"].includes(patch.workflow_stage))
      finalPatch.last_contacted_at = new Date().toISOString()
    await supabase.from("leadboard").update(finalPatch).in("id", ids)
    setLeads(p => p.map(l => ids.includes(l.id) ? { ...l, ...finalPatch } : l))
    setSelectedIds(new Set())
  }, [selectedIds, supabase])

  // ── Auto-score ────────────────────────────────────────────────────────────

  function scoreLead(l: CallingLead): PriorityLevel {
    const t = [l.company, l.position, l.segment, l.notes].join(" ").toLowerCase()
    const aKw = ["military","armored","armoured","defence","defense","army","navy","nato","tactical","run-flat","runflat","special forces","armament","mrap","armoured vehicle"]
    const bKw = ["logistics","procurement","police","gendarmerie","law enforcement","vehicle parts","tire","wheel","fleet maintenance","border patrol","paramilitary"]
    const hasA = aKw.some(k => t.includes(k))
    const hasB = bKw.some(k => t.includes(k))
    let base: PriorityLevel = hasA ? "A" : hasB ? "B" : "C"
    const s = l.relevance_score ?? 0
    if (s >= 75 && base === "C") base = "B"
    if (s >= 85 && base === "B") base = "A"
    if (s < 25 && base === "A") base = "B"
    return base
  }

  const autoScoreLeads = useCallback(async () => {
    setAutoScoring(true)
    // Score only leads without an existing priority
    const unscored = leads.filter(l => !l.priority_level)
    for (const l of unscored) {
      const prio = scoreLead(l)
      await supabase.from("leadboard").update({ priority_level: prio }).eq("id", l.id)
      setLeads(p => p.map(x => x.id === l.id ? { ...x, priority_level: prio } : x))
    }
    setAutoScoring(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, supabase])

  // ── CSV Export ────────────────────────────────────────────────────────────

  const exportCSV = useCallback(() => {
    const rows = selectedIds.size > 0 ? leads.filter(l => selectedIds.has(l.id)) : visible
    const headers = ["Company","Contact","Position","Email","Phone","Company Phone","Segment","Country","Priority","Stage","Score","Notes"]
    const csv = [
      headers.join(","),
      ...rows.map(l => [
        `"${(l.company ?? "").replace(/"/g,'""')}"`,
        `"${(l.full_name ?? "").replace(/"/g,'""')}"`,
        `"${(l.position ?? "").replace(/"/g,'""')}"`,
        `"${l.email ?? ""}"`,
        `"${l.phone ?? ""}"`,
        `"${l.company_phone ?? ""}"`,
        `"${l.segment ?? ""}"`,
        `"${l.country ?? ""}"`,
        l.priority_level ?? "",
        l.workflow_stage ?? "",
        l.relevance_score ?? "",
        `"${(l.notes ?? "").replace(/"/g,'""')}"`,
      ].join(","))
    ].join("\n")
    const blob = new Blob([csv], { type:"text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = `calling-plan-${today}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [leads, visible, selectedIds, today])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1600) })
  }

  const openSheet = (lead: CallingLead) => {
    setSelectedLead(lead)
    setSheetOpen(true)
    setForm({ call_route: "direct", call_status: "", call_outcome: "", notes: "", objection: "", next_action_date: "" })
  }

  const history = useMemo(() => attempts.filter(a => a.lead_id === selectedLead?.id), [attempts, selectedLead])

  if (!workspaceId) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"var(--text-muted)", fontSize:13 }}>
      Select a workspace to continue.
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* ── Header ── */}
      <div style={{ padding:"20px 24px 0", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:"var(--text-primary)", letterSpacing:"-0.3px" }}>
              Cold Calling Plan
            </h1>
            <p style={{ margin:"3px 0 0", fontSize:12, color:"var(--text-muted)" }}>
              Week {getWeekNumber(now)} · {format(now, "MMMM yyyy")} · Target: {targets.weekly} calls / week
            </p>
          </div>
          <div style={{ display:"flex", gap:7 }}>
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" variant="outline" onClick={autoScoreLeads} disabled={autoScoring} className="gap-1.5">
              {autoScoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Auto-Score
            </Button>
            <Button size="sm" onClick={() => router.push("/prospecting")} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Find Leads
            </Button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:14 }}>
          {([
            { label:"Weekly Calls",   val:weekCalls,  target:targets.weekly,  color:"#6366f1" },
            { label:"Monthly Calls",  val:monthCalls, target:targets.monthly, color:"#8b5cf6" },
            { label:"Connected",      val:connected,  color:"#10b981" },
            { label:"Ready to Call",  val:readyCount, color:"#3b82f6" },
            { label:"Follow-up Due",  val:dueCount,   color:"#f59e0b" },
            { label:"Warm Leads",     val:warmCount,  color:"#ec4899" },
          ] as { label:string; val:number; target?:number; color:string }[]).map(k => (
            <div key={k.label} onClick={() => setKpiModal(k.label)}
              style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"11px 13px", cursor:"pointer", transition:"border-color .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = k.color }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)" }}
            >
              <div style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{k.label}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                <span style={{ fontSize:22, fontWeight:700, color:k.color, lineHeight:1 }}>{k.val}</span>
                {k.target && <span style={{ fontSize:11, color:"var(--text-muted)" }}>/ {k.target}</span>}
              </div>
              {k.target && (
                <div style={{ marginTop:5, height:3, borderRadius:2, background:"var(--border-subtle)", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:2, background:k.color, width:`${Math.min(100,(k.val/k.target)*100)}%`, transition:"width .3s" }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12, flexWrap:"wrap" }}>
          {QUICK_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:500, cursor:"pointer", transition:"all .15s",
              border:`1px solid ${filter===f.id ? "#6366f1" : "var(--border-default)"}`,
              background: filter===f.id ? "rgba(99,102,241,.15)" : "var(--bg-elevated)",
              color: filter===f.id ? "#818cf8" : "var(--text-secondary)",
            }}>{f.label}</button>
          ))}
          <div style={{ flex:1 }} />
          <input
            placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding:"5px 10px", borderRadius:7, fontSize:12, border:"1px solid var(--border-default)", background:"var(--bg-elevated)", color:"var(--text-primary)", outline:"none", width:170 }}
          />
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v ?? "all")}>
            <SelectTrigger style={{ height:30, fontSize:12, width:160 }}>
              <span>{stageFilter==="all" ? "All Stages" : STAGE_CFG[stageFilter as WorkflowStage]?.label ?? stageFilter}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {(Object.keys(STAGE_CFG) as WorkflowStage[]).map(k => (
                <SelectItem key={k} value={k}>{STAGE_CFG[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <Tabs value={mainTab} onValueChange={setMainTab} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"0 24px", flexShrink:0 }}>
          <TabsList style={{ width:"auto" }}>
            <TabsTrigger value="board">Board ({visible.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="report">Monthly Report</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Board Tab ── */}
        <TabsContent value="board" style={{ flex:1, overflow:"auto", padding:"10px 24px 80px", margin:0 }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:180, color:"var(--text-muted)", gap:8 }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
          </div>
        ) : visible.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:180, color:"var(--text-muted)", gap:10 }}>
            <Phone className="h-8 w-8 opacity-20" />
            <p style={{ margin:0, fontSize:13 }}>No leads match this filter.</p>
            <Button size="sm" variant="outline" onClick={() => { setFilter("all"); setStageFilter("all"); setSearch("") }}>Clear filters</Button>
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--border-subtle)" }}>
                <th style={{ padding:"7px 8px", width:32 }}>
                  <Checkbox
                    checked={visible.length > 0 && visible.every(l => selectedIds.has(l.id))}
                    onCheckedChange={v => {
                      if (v) setSelectedIds(new Set(visible.map(l => l.id)))
                      else setSelectedIds(new Set())
                    }}
                  />
                </th>
                {["Company / Contact","Segment","Priority","Stage","Phone","Last Call","Next Action",""].map(h => (
                  <th key={h} style={{ padding:"7px 10px", textAlign:"left", fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(lead => {
                const lastAttempt  = attempts.find(a => a.lead_id === lead.id)
                const stage        = (lead.workflow_stage ?? "raw") as WorkflowStage
                const sc           = STAGE_CFG[stage] ?? STAGE_CFG.raw
                const pc           = lead.priority_level ? PRIORITY_CFG[lead.priority_level] : null
                const overdue      = lead.next_action_date && lead.next_action_date <= today
                const isSelected   = selectedIds.has(lead.id)
                return (
                  <tr key={lead.id} onClick={() => openSheet(lead)}
                    style={{ borderBottom:"1px solid var(--border-subtle)", cursor:"pointer", background: isSelected ? "rgba(99,102,241,.06)" : "transparent" }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background="var(--bg-active)" }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background="transparent" }}
                  >
                    <td style={{ padding:"10px 8px" }} onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={v => {
                        setSelectedIds(prev => { const n = new Set(prev); v ? n.add(lead.id) : n.delete(lead.id); return n })
                      }} />
                    </td>
                    {/* Company/Contact */}
                    <td style={{ padding:"10px 10px", maxWidth:200 }}>
                      <div style={{ fontWeight:600, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.company || "—"}</div>
                      <div style={{ fontSize:11, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.full_name}{lead.position ? ` · ${lead.position}` : ""}</div>
                    </td>
                    {/* Segment */}
                    <td style={{ padding:"10px 10px" }}>
                      <div style={{ fontSize:11, color:"var(--text-secondary)", whiteSpace:"nowrap" }}>{lead.segment || "—"}</div>
                      {lead.country && <div style={{ fontSize:10, color:"var(--text-muted)" }}>{lead.country}</div>}
                    </td>
                    {/* Priority — inline edit */}
                    <td style={{ padding:"10px 10px" }} onClick={e => e.stopPropagation()}>
                      <Select value={lead.priority_level ?? ""} onValueChange={v => patchLead(lead.id, { priority_level: (v as PriorityLevel) || null })}>
                        <SelectTrigger style={{ height:24, width:50, fontSize:12, fontWeight:700, padding:"0 6px", border: pc ? "none" : "1px solid var(--border-subtle)", borderRadius:5, background: pc?.bg ?? "var(--bg-active)", color: pc?.color ?? "var(--text-muted)" }}>
                          <span>{lead.priority_level ?? "—"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          <SelectItem value="A">A — High</SelectItem>
                          <SelectItem value="B">B — Mid</SelectItem>
                          <SelectItem value="C">C — Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    {/* Stage — inline edit */}
                    <td style={{ padding:"10px 10px" }} onClick={e => e.stopPropagation()}>
                      <Select value={stage} onValueChange={v => v && patchLead(lead.id, { workflow_stage: v as WorkflowStage })}>
                        <SelectTrigger style={{ height:24, minWidth:130, fontSize:11, fontWeight:500, padding:"0 8px", border:"none", borderRadius:5, background:sc.bg, color:sc.color }}>
                          <span>{sc.label}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STAGE_CFG) as WorkflowStage[]).map(k => (
                            <SelectItem key={k} value={k}>{STAGE_CFG[k].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* Phone */}
                    <td style={{ padding:"10px 10px" }}>
                      {lead.phone ? (
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <Phone className="h-3 w-3" style={{ color:"#10b981", flexShrink:0 }} />
                          <span style={{ fontSize:11, color:"var(--text-secondary)", fontFamily:"monospace" }}>{lead.phone}</span>
                        </div>
                      ) : lead.company_phone ? (
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <Building2 className="h-3 w-3" style={{ color:"#3b82f6", flexShrink:0 }} />
                          <span style={{ fontSize:11, color:"var(--text-secondary)", fontFamily:"monospace" }}>{lead.company_phone}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize:11, color:"var(--text-muted)" }}>No phone</span>
                      )}
                    </td>
                    {/* Last Call */}
                    <td style={{ padding:"10px 10px" }}>
                      {lastAttempt ? (
                        <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:4, background:`${CALL_STATUS_CFG[lastAttempt.call_status as CallStatus]?.color ?? "#9ca3af"}22`, color:CALL_STATUS_CFG[lastAttempt.call_status as CallStatus]?.color ?? "#9ca3af" }}>
                          {CALL_STATUS_CFG[lastAttempt.call_status as CallStatus]?.label ?? lastAttempt.call_status}
                        </span>
                      ) : <span style={{ fontSize:11, color:"var(--text-muted)" }}>—</span>}
                    </td>
                    {/* Next Action */}
                    <td style={{ padding:"10px 10px" }}>
                      {lead.next_action_date ? (
                        <span style={{ fontSize:11, fontWeight: overdue ? 600 : 400, color: overdue ? "#f59e0b" : "var(--text-secondary)" }}>
                          {overdue ? "⚡ " : ""}{format(new Date(lead.next_action_date + "T00:00:00"), "MMM d")}
                        </span>
                      ) : <span style={{ fontSize:11, color:"var(--text-muted)" }}>—</span>}
                    </td>
                    {/* Log button */}
                    <td style={{ padding:"10px 10px" }}>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={e => { e.stopPropagation(); openSheet(lead) }}>
                        <PhoneCall className="h-3 w-3" /> Log
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics" style={{ flex:1, overflow:"auto", padding:"16px 24px 24px", margin:0 }}>
          {(() => {
            // Calls by day — last 14 days
            const days = eachDayOfInterval({ start: subDays(now, 13), end: now })
            const callsByDay = days.map(d => {
              const ds = format(d, "yyyy-MM-dd")
              const count = attempts.filter(a => a.call_date === ds).length
              const stageCount = leads.filter(l => CALLED_STAGES.has(l.workflow_stage) && l.last_contacted_at?.slice(0,10) === ds).length
              return { day: format(d, "EEE d"), calls: Math.max(count, stageCount) }
            })

            // Outcome distribution
            const outcomeCounts: Record<string, number> = {}
            attempts.forEach(a => { if (a.call_outcome) outcomeCounts[a.call_outcome] = (outcomeCounts[a.call_outcome] ?? 0) + 1 })
            const outcomeData = Object.entries(outcomeCounts).map(([k, v]) => ({
              name: CALL_OUTCOME_CFG[k as CallOutcome]?.label ?? k, value: v,
              color: CALL_OUTCOME_CFG[k as CallOutcome]?.color ?? "#9ca3af",
            }))

            // Stage distribution
            const stageCounts: Record<string, number> = {}
            leads.forEach(l => { const s = l.workflow_stage ?? "raw"; stageCounts[s] = (stageCounts[s] ?? 0) + 1 })
            const stageData = Object.entries(stageCounts)
              .sort((a,b) => b[1]-a[1])
              .map(([k, v]) => ({ name: STAGE_CFG[k as WorkflowStage]?.label ?? k, value: v, color: STAGE_CFG[k as WorkflowStage]?.color ?? "#9ca3af" }))

            const connectedRate = monthCalls > 0 ? Math.round(connected / monthCalls * 100) : 0
            const emailReqCount = attempts.filter(a => a.call_outcome === "send_email" || a.call_outcome === "interested").length
            const disqualCount  = leads.filter(l => l.workflow_stage === "disqualified").length

            return (
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {/* Stat cards */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                  {[
                    { label:"Connected Rate",  val: `${connectedRate}%`, color:"#10b981" },
                    { label:"Email Requested", val: emailReqCount,        color:"#3b82f6" },
                    { label:"Warm / Qualified",val: warmCount,            color:"#ec4899" },
                    { label:"Disqualified",    val: disqualCount,         color:"#ef4444" },
                  ].map(s => (
                    <div key={s.label} style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"12px 14px" }}>
                      <div style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{s.label}</div>
                      <div style={{ fontSize:24, fontWeight:700, color:s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* Calls by day chart */}
                <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"16px" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:12 }}>Calls — Last 14 Days</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={callsByDay} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                      <XAxis dataKey="day" tick={{ fontSize:10, fill:"var(--text-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:10, fill:"var(--text-muted)" }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background:"var(--bg-elevated)", border:"1px solid var(--border-default)", borderRadius:6, fontSize:12 }} />
                      <Bar dataKey="calls" fill="#6366f1" radius={[3,3,0,0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  {/* Outcome pie */}
                  <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"16px" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:12 }}>Call Outcomes</div>
                    {outcomeData.length === 0 ? (
                      <div style={{ textAlign:"center", padding:"30px 0", fontSize:12, color:"var(--text-muted)" }}>No call outcomes yet.</div>
                    ) : (
                      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                        <ResponsiveContainer width={120} height={120}>
                          <PieChart>
                            <Pie data={outcomeData} innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={2}>
                              {outcomeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background:"var(--bg-elevated)", border:"1px solid var(--border-default)", borderRadius:6, fontSize:11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                          {outcomeData.map((e, i) => (
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                              <div style={{ width:8, height:8, borderRadius:2, background:e.color, flexShrink:0 }} />
                              <span style={{ flex:1, color:"var(--text-secondary)" }}>{e.name}</span>
                              <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{e.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage distribution */}
                  <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"16px" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:12 }}>Lead Pipeline</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {stageData.slice(0, 8).map(s => (
                        <div key={s.name}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:2 }}>
                            <span style={{ color:"var(--text-secondary)" }}>{s.name}</span>
                            <span style={{ color:"var(--text-muted)" }}>{s.value}</span>
                          </div>
                          <div style={{ height:4, borderRadius:2, background:"var(--border-subtle)", overflow:"hidden" }}>
                            <div style={{ height:"100%", borderRadius:2, background:s.color, width:`${Math.round(s.value/leads.length*100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </TabsContent>

        {/* ── Monthly Report Tab ── */}
        <TabsContent value="report" style={{ flex:1, overflow:"auto", padding:"16px 24px 24px", margin:0 }}>
          {(() => {
            const availableMonths = Array.from(new Set([
              ...attempts.map(a => a.call_date.slice(0, 7)),
              format(now, "yyyy-MM"),
            ])).sort((a, b) => b.localeCompare(a))

            const cur  = statsForMonth(reportMonth, attempts, leads)
            const prevMonthStr = format(subMonths(new Date(`${reportMonth}-01T00:00:00`), 1), "yyyy-MM")
            const prev = statsForMonth(prevMonthStr, attempts, leads)
            const insights = buildInsights(cur, prev, targets)

            const delta = (a: number, b: number) => b > 0 ? Math.round(((a - b) / b) * 100) : null
            const totalDelta   = delta(cur.total, prev.total)
            const connectDelta = cur.connectRate - prev.connectRate

            const statusData = Object.entries(cur.statusCounts).map(([k, v]) => ({
              name: CALL_STATUS_CFG[k as CallStatus]?.label ?? k, value: v, color: CALL_STATUS_CFG[k as CallStatus]?.color ?? "#9ca3af",
            }))
            const outcomeData = Object.entries(cur.outcomeCounts).map(([k, v]) => ({
              name: CALL_OUTCOME_CFG[k as CallOutcome]?.label ?? k, value: v, color: CALL_OUTCOME_CFG[k as CallOutcome]?.color ?? "#9ca3af",
            }))
            const priorityData = (["A", "B", "C", "unscored"] as const).map(k => ({
              name: k === "unscored" ? "Unscored" : `Priority ${k}`,
              value: cur.priorityCounts[k] ?? 0,
              color: k === "unscored" ? "#6b7280" : PRIORITY_CFG[k]?.color ?? "#9ca3af",
            })).filter(d => d.value > 0)

            return (
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

                {/* Header: month selector + targets */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                  <Select value={reportMonth} onValueChange={v => v && setReportMonth(v)}>
                    <SelectTrigger style={{ height:32, fontSize:13, width:180 }}>
                      <span>{format(new Date(`${reportMonth}-01T00:00:00`), "MMMM yyyy")}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map(m => (
                        <SelectItem key={m} value={m}>{format(new Date(`${m}-01T00:00:00`), "MMMM yyyy")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <Label style={{ fontSize:11, color:"var(--text-muted)" }}>Weekly target</Label>
                      <input type="number" min={1} value={targets.weekly}
                        onChange={e => updateTargets({ weekly: Number(e.target.value) || 1 })}
                        style={{ width:56, padding:"5px 7px", borderRadius:6, fontSize:12, border:"1px solid var(--border-default)", background:"var(--bg-elevated)", color:"var(--text-primary)", outline:"none" }} />
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <Label style={{ fontSize:11, color:"var(--text-muted)" }}>Monthly target</Label>
                      <input type="number" min={1} value={targets.monthly}
                        onChange={e => updateTargets({ monthly: Number(e.target.value) || 1 })}
                        style={{ width:64, padding:"5px 7px", borderRadius:6, fontSize:12, border:"1px solid var(--border-default)", background:"var(--bg-elevated)", color:"var(--text-primary)", outline:"none" }} />
                    </div>
                  </div>
                </div>

                {cur.total === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:"var(--text-muted)", fontSize:13 }}>
                    Bu ay için kayıtlı arama bulunmuyor.
                  </div>
                ) : (
                  <>
                    {/* Macro KPI cards */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
                      {[
                        { label:"Total Calls",      val:cur.total,                                 delta:totalDelta,   color:"#6366f1" },
                        { label:"Unique Contacts",  val:cur.uniqueLeads,                            delta:null,         color:"#8b5cf6" },
                        { label:"Connect Rate",     val:`${cur.connectRate}%`,                      delta:connectDelta, color:"#10b981" },
                        { label:"Interest Rate",    val:`${cur.interestRate}%`,                     delta:null,         color:"#ec4899" },
                        { label:"Monthly Goal",     val:`${Math.round((cur.uniqueLeads/targets.monthly)*100)}%`, delta:null, color:"#f59e0b" },
                      ].map(k => (
                        <div key={k.label} style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"12px 14px" }}>
                          <div style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{k.label}</div>
                          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                            <span style={{ fontSize:22, fontWeight:700, color:k.color }}>{k.val}</span>
                            {k.delta !== null && (
                              <span style={{ fontSize:11, fontWeight:600, color: k.delta >= 0 ? "#10b981" : "#ef4444" }}>
                                {k.delta >= 0 ? "+" : ""}{k.delta}{typeof k.val === "string" && k.val.includes("%") ? "pt" : "%"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Weekly volume */}
                    <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"16px" }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:12 }}>Weekly Call Volume</div>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={cur.weeklyData} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                          <XAxis dataKey="week" tick={{ fontSize:10, fill:"var(--text-muted)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize:10, fill:"var(--text-muted)" }} allowDecimals={false} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background:"var(--bg-elevated)", border:"1px solid var(--border-default)", borderRadius:6, fontSize:12 }} />
                          <Bar dataKey="calls" fill="#6366f1" radius={[3,3,0,0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Status / Outcome / Priority breakdowns */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
                      {[
                        { title:"Call Status",      data:statusData },
                        { title:"Call Outcomes",    data:outcomeData },
                        { title:"Priority Called",  data:priorityData },
                      ].map(block => (
                        <div key={block.title} style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"16px" }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:12 }}>{block.title}</div>
                          {block.data.length === 0 ? (
                            <div style={{ textAlign:"center", padding:"20px 0", fontSize:11, color:"var(--text-muted)" }}>No data.</div>
                          ) : (
                            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                              {block.data.map(d => (
                                <div key={d.name} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                                  <div style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }} />
                                  <span style={{ flex:1, color:"var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</span>
                                  <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{d.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Insights */}
                    <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"16px" }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:10 }}>Insights & Recommendations</div>
                      <ul style={{ margin:0, paddingLeft:18, display:"flex", flexDirection:"column", gap:6 }}>
                        {insights.map((line, i) => (
                          <li key={i} style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.5 }}>{line}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Repeat contacts */}
                    {cur.repeatDetail.length > 0 && (
                      <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"16px" }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:10 }}>Contacted More Than Once ({cur.repeatDetail.length})</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {cur.repeatDetail.map((r, i) => (
                            <span key={i} style={{ fontSize:11, padding:"3px 9px", borderRadius:20, background:"var(--bg-active)", color:"var(--text-secondary)" }}>
                              {r.company !== "—" ? r.company : r.contact} · {r.times}×
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Objections */}
                    {cur.objections.length > 0 && (
                      <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"16px" }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:10 }}>Objections Raised</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {cur.objections.map((o, i) => (
                            <span key={i} style={{ fontSize:11, padding:"3px 9px", borderRadius:20, background:"rgba(239,68,68,.1)", color:"#ef4444" }}>
                              {o.text}{o.count > 1 ? ` (${o.count})` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Highlighted notes */}
                    {cur.highlights.length > 0 && (
                      <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"16px" }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", marginBottom:10 }}>Highlighted Conversations</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          {cur.highlights.map((h, i) => {
                            const oc = CALL_OUTCOME_CFG[h.outcome]
                            return (
                              <div key={i} style={{ borderLeft:`2px solid ${oc?.color ?? "#9ca3af"}`, paddingLeft:10 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                                  <span style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)" }}>{h.company}</span>
                                  <span style={{ fontSize:11, color:"var(--text-muted)" }}>{h.contact}</span>
                                  <span style={{ fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:4, background:`${oc?.color ?? "#9ca3af"}22`, color:oc?.color ?? "#9ca3af" }}>{oc?.label ?? h.outcome}</span>
                                  <span style={{ fontSize:10, color:"var(--text-muted)", marginLeft:"auto" }}>{format(new Date(`${h.date}T00:00:00`), "MMM d")}</span>
                                </div>
                                <p style={{ margin:0, fontSize:12, color:"var(--text-secondary)", lineHeight:1.5 }}>{h.notes}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}
        </TabsContent>
      </Tabs>

      {/* ── Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background:"var(--bg-elevated)", border:"1px solid var(--border-default)",
          borderRadius:12, padding:"10px 16px", display:"flex", alignItems:"center", gap:10,
          boxShadow:"0 8px 32px rgba(0,0,0,.4)", zIndex:50, whiteSpace:"nowrap",
        }}>
          <span style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)", paddingRight:6, borderRight:"1px solid var(--border-subtle)" }}>
            {selectedIds.size} selected
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkUpdate({ workflow_stage:"ready_to_call" })}>
            📞 Ready to Call
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkUpdate({ workflow_stage:"needs_cleaning" })}>
            🧹 Needs Cleaning
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkUpdate({ priority_level:"A" as PriorityLevel })}>
            🔴 Priority A
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkUpdate({ priority_level:"B" as PriorityLevel })}>
            🟡 Priority B
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkUpdate({ workflow_stage:"lusha_lookup" })}>
            🔍 Lusha Lookup
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={exportCSV}>
            <Download className="h-3 w-3" /> Export
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => bulkUpdate({ workflow_stage:"disqualified" })}>
            Disqualify
          </Button>
          <button onClick={() => setSelectedIds(new Set())} style={{ fontSize:11, color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", padding:"2px 4px" }}>
            ✕ Clear
          </button>
        </div>
      )}

      {/* ── Lead Detail Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent style={{ width:520, maxWidth:"100vw", overflowY:"auto", padding:0, display:"flex", flexDirection:"column" }}>
          {selectedLead && (() => {
            const stage = (selectedLead.workflow_stage ?? "raw") as WorkflowStage
            const sc    = STAGE_CFG[stage] ?? STAGE_CFG.raw
            const pc    = selectedLead.priority_level ? PRIORITY_CFG[selectedLead.priority_level] : null
            const scripts = buildOperatorScripts(selectedLead)
            const callScript = buildCallScript(selectedLead)
            return (
              <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>

                {/* Sheet header */}
                <div style={{ padding:"20px 24px 14px", borderBottom:"1px solid var(--border-subtle)" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{selectedLead.company || "—"}</div>
                      <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:2 }}>{selectedLead.full_name}{selectedLead.position ? ` · ${selectedLead.position}` : ""}</div>
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      {pc && <span style={{ fontSize:12, fontWeight:700, padding:"3px 8px", borderRadius:5, background:pc.bg, color:pc.color }}>Priority {selectedLead.priority_level}</span>}
                      <span style={{ fontSize:11, fontWeight:500, padding:"3px 8px", borderRadius:5, background:sc.bg, color:sc.color }}>{sc.label}</span>
                    </div>
                  </div>
                  {/* Quick info */}
                  <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                    {selectedLead.phone && (
                      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
                        <Phone className="h-3.5 w-3.5" style={{ color:"#10b981" }} />
                        <span style={{ color:"var(--text-secondary)", fontFamily:"monospace" }}>{selectedLead.phone}</span>
                        <button onClick={() => copy(selectedLead.phone!, "p")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:2, lineHeight:1 }}>
                          {copied==="p" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                    {selectedLead.company_phone && (
                      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
                        <Building2 className="h-3.5 w-3.5" style={{ color:"#3b82f6" }} />
                        <span style={{ color:"var(--text-secondary)", fontFamily:"monospace" }}>{selectedLead.company_phone}</span>
                        <button onClick={() => copy(selectedLead.company_phone!, "cp")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:2, lineHeight:1 }}>
                          {copied==="cp" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                    {selectedLead.email && (
                      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
                        <Mail className="h-3.5 w-3.5" style={{ color:"var(--text-muted)" }} />
                        <span style={{ color:"var(--text-secondary)" }}>{selectedLead.email}</span>
                      </div>
                    )}
                    {(selectedLead.segment || selectedLead.country) && (
                      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
                        <MapPin className="h-3.5 w-3.5" style={{ color:"var(--text-muted)" }} />
                        <span style={{ color:"var(--text-muted)" }}>{[selectedLead.segment, selectedLead.country].filter(Boolean).join(" · ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Lusha enrichment bar */}
                  {!selectedLead.phone && (
                    <div style={{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(59,130,246,.08)", border:"1px solid rgba(59,130,246,.2)", borderRadius:7, padding:"8px 12px" }}>
                      <div>
                        <span style={{ fontSize:11, fontWeight:600, color:"#60a5fa" }}>No direct phone found</span>
                        <span style={{ fontSize:11, color:"var(--text-muted)", marginLeft:8 }}>{selectedLead.company_phone ? "Company phone available" : "Search via Lusha"}</span>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-blue-500/30 text-blue-400"
                        onClick={() => {
                          patchLead(selectedLead.id, { workflow_stage:"lusha_lookup" })
                          router.push(`/prospecting?q=${encodeURIComponent(selectedLead.company ?? selectedLead.full_name ?? "")}`)
                        }}>
                        <SearchIcon className="h-3 w-3" /> Lusha Lookup
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div style={{ flex:1, overflow:"auto" }}>
                  <Tabs defaultValue="log">
                    <TabsList style={{ margin:"0 24px", marginTop:0, width:"calc(100% - 48px)" }}>
                      <TabsTrigger value="log"     style={{ flex:1 }}>Log Call</TabsTrigger>
                      <TabsTrigger value="scripts" style={{ flex:1 }}>Scripts</TabsTrigger>
                      <TabsTrigger value="history" style={{ flex:1 }}>History ({history.length})</TabsTrigger>
                    </TabsList>

                    {/* ── Log Call ── */}
                    <TabsContent value="log" style={{ padding:"16px 24px" }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                          <div>
                            <Label style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, display:"block" }}>Call Route</Label>
                            <Select value={form.call_route} onValueChange={v => v && setForm(f => ({ ...f, call_route:v }))}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="direct">Direct Phone</SelectItem>
                                <SelectItem value="company_operator">Company Operator</SelectItem>
                                <SelectItem value="department_transfer">Department Transfer</SelectItem>
                                <SelectItem value="referral">Referral</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, display:"block" }}>Call Status *</Label>
                            <Select value={form.call_status} onValueChange={v => v && setForm(f => ({ ...f, call_status:v, call_outcome:"" }))}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select status…" /></SelectTrigger>
                              <SelectContent>
                                {(Object.entries(CALL_STATUS_CFG) as [CallStatus, {label:string;color:string}][]).map(([k,v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {form.call_status === "connected" && (
                          <div>
                            <Label style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, display:"block" }}>Outcome</Label>
                            <Select value={form.call_outcome} onValueChange={v => v && setForm(f => ({ ...f, call_outcome:v }))}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select outcome…" /></SelectTrigger>
                              <SelectContent>
                                {(Object.entries(CALL_OUTCOME_CFG) as [CallOutcome, {label:string;color:string}][]).map(([k,v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div>
                          <Label style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, display:"block" }}>Notes</Label>
                          <Textarea placeholder="Who did you speak with? What happened?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes:e.target.value }))} style={{ minHeight:70, fontSize:13, resize:"vertical" }} />
                        </div>

                        {form.call_status === "connected" && (
                          <div>
                            <Label style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, display:"block" }}>Objection (if any)</Label>
                            <Textarea placeholder="What objection did they raise?" value={form.objection} onChange={e => setForm(f => ({ ...f, objection:e.target.value }))} style={{ minHeight:50, fontSize:13, resize:"vertical" }} />
                          </div>
                        )}

                        <div>
                          <Label style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, display:"block" }}>Next Action Date</Label>
                          <input type="date" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date:e.target.value }))}
                            style={{ padding:"7px 10px", borderRadius:7, fontSize:13, border:"1px solid var(--border-default)", background:"var(--bg-elevated)", color:"var(--text-primary)", outline:"none", width:"100%" }} />
                        </div>

                        <div style={{ display:"flex", gap:8 }}>
                          <Button className="flex-1 gap-2" onClick={logCall} disabled={!form.call_status || saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Save Call Log
                          </Button>
                          {(form.call_outcome === "send_email" || form.call_outcome === "interested") && (
                            <Button variant="outline" className="gap-1.5" onClick={() => router.push("/outreach")}>
                              <Mail className="h-4 w-4" /> Email
                            </Button>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* ── Scripts ── */}
                    <TabsContent value="scripts" style={{ padding:"16px 24px" }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                        {/* Opening script */}
                        <div>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                            <span style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em" }}>Opening Script</span>
                            <button onClick={() => copy(callScript, "cs")} style={{ display:"flex", alignItems:"center", gap:3, fontSize:11, color: copied==="cs" ? "#10b981" : "var(--text-muted)", background:"none", border:"none", cursor:"pointer" }}>
                              {copied==="cs" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
                            </button>
                          </div>
                          <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:8, padding:"12px 14px", fontSize:13, color:"var(--text-secondary)", lineHeight:1.65 }}>
                            {callScript}
                          </div>
                        </div>

                        <Separator />

                        {/* Operator scripts */}
                        <div>
                          <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Operator Route Scripts</div>
                          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                            {scripts.map((s, i) => (
                              <div key={i} style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:8, padding:"10px 12px" }}>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                                  <span style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase" }}>{s.label}</span>
                                  <button onClick={() => copy(s.text, `s${i}`)} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, color: copied===`s${i}` ? "#10b981" : "var(--text-muted)", background:"none", border:"none", cursor:"pointer" }}>
                                    {copied===`s${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
                                  </button>
                                </div>
                                <p style={{ margin:0, fontSize:12, color:"var(--text-secondary)", lineHeight:1.55 }}>{s.text}</p>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop:12 }}>
                            <div style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Departments to ask for</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                              {DEPARTMENTS.map(d => (
                                <span key={d} onClick={() => copy(d, d)} style={{ fontSize:11, padding:"3px 8px", borderRadius:5, background:"var(--bg-active)", color: copied===d ? "#10b981" : "var(--text-secondary)", cursor:"pointer", transition:"color .15s" }}>
                                  {copied===d ? "✓ " : ""}{d}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ── History ── */}
                    <TabsContent value="history" style={{ padding:"16px 24px" }}>
                      {history.length === 0 ? (
                        <div style={{ textAlign:"center", padding:"40px 0", color:"var(--text-muted)" }}>
                          <PhoneMissed className="h-7 w-7 mx-auto mb-3 opacity-20" />
                          <p style={{ margin:0, fontSize:13 }}>No calls logged yet.</p>
                          <p style={{ margin:"4px 0 0", fontSize:12 }}>Switch to Log Call to record your first attempt.</p>
                        </div>
                      ) : (
                        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                          {history.map(a => {
                            const sc2 = CALL_STATUS_CFG[a.call_status as CallStatus]
                            const oc  = a.call_outcome ? CALL_OUTCOME_CFG[a.call_outcome as CallOutcome] : null
                            return (
                              <div key={a.id} style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", borderRadius:8, padding:"11px 13px" }}>
                                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                                    <span style={{ fontSize:11, fontWeight:600, padding:"2px 7px", borderRadius:4, background:`${sc2?.color ?? "#9ca3af"}22`, color:sc2?.color ?? "#9ca3af" }}>{sc2?.label ?? a.call_status}</span>
                                    {oc && <span style={{ fontSize:11, fontWeight:600, padding:"2px 7px", borderRadius:4, background:`${oc.color}22`, color:oc.color }}>{oc.label}</span>}
                                  </div>
                                  <span style={{ fontSize:11, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                                    {format(new Date(a.call_date), "MMM d, yyyy")}{a.call_time ? ` · ${a.call_time}` : ""}
                                  </span>
                                </div>
                                {a.phone_number && <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:3, fontFamily:"monospace" }}>{a.phone_number}{a.call_route ? ` (${a.call_route})` : ""}</div>}
                                {a.notes && <p style={{ margin:"5px 0 0", fontSize:12, color:"var(--text-secondary)", lineHeight:1.5 }}>{a.notes}</p>}
                                {a.objection && <p style={{ margin:"3px 0 0", fontSize:11, color:"#f59e0b" }}>Objection: {a.objection}</p>}
                                {a.next_action_date && <p style={{ margin:"3px 0 0", fontSize:11, color:"#818cf8" }}>Follow-up: {format(new Date(a.next_action_date + "T00:00:00"), "MMM d, yyyy")}</p>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* ── KPI Drilldown Dialog ── */}
      {(() => {
        const KPI_LEAD_MAP: Record<string, { leads: CallingLead[]; color: string }> = {
          "Weekly Calls":  { leads: weekCallLeads,  color:"#6366f1" },
          "Monthly Calls": { leads: monthCallLeads, color:"#8b5cf6" },
          "Connected":     { leads: connectedLeads, color:"#10b981" },
          "Ready to Call": { leads: readyLeads,     color:"#3b82f6" },
          "Follow-up Due": { leads: dueLeads,       color:"#f59e0b" },
          "Warm Leads":    { leads: warmLeads,      color:"#ec4899" },
        }
        const active = kpiModal ? KPI_LEAD_MAP[kpiModal] : null
        return (
          <Dialog open={!!kpiModal} onOpenChange={(o) => { if (!o) setKpiModal(null) }}>
            <DialogContent style={{ maxWidth:560, width:"100%", maxHeight:"80vh", display:"flex", flexDirection:"column", padding:0, overflow:"hidden" }}>
              <DialogHeader style={{ padding:"16px 20px 0" }}>
                <DialogTitle style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:active?.color, display:"inline-block" }} />
                  {kpiModal} <span style={{ color:"var(--text-muted)", fontWeight:400, fontSize:12 }}>({active?.leads.length ?? 0})</span>
                </DialogTitle>
              </DialogHeader>
              <div style={{ overflowY:"auto", padding:"8px 20px 16px", display:"flex", flexDirection:"column", gap:6 }}>
                {!active || active.leads.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"30px 0", color:"var(--text-muted)", fontSize:13 }}>
                    No leads in this group.
                  </div>
                ) : (
                  active.leads.map(lead => {
                    const stage = (lead.workflow_stage ?? "raw") as WorkflowStage
                    const sc    = STAGE_CFG[stage] ?? STAGE_CFG.raw
                    const pc    = lead.priority_level ? PRIORITY_CFG[lead.priority_level] : null
                    return (
                      <div key={lead.id}
                        onClick={() => { setKpiModal(null); openSheet(lead) }}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:8, border:"1px solid var(--border-subtle)", cursor:"pointer", transition:"background .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-active)" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                      >
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.company || "—"}</div>
                          <div style={{ fontSize:11, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.full_name}{lead.position ? ` · ${lead.position}` : ""}</div>
                        </div>
                        {pc && <span style={{ fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:5, background:pc.bg, color:pc.color, flexShrink:0 }}>{lead.priority_level}</span>}
                        <span style={{ fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:5, background:sc.bg, color:sc.color, flexShrink:0, whiteSpace:"nowrap" }}>{sc.label}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}
