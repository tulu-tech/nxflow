"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { DragEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui-crm/button"
import { Input } from "@/components/ui-crm/input"
import { Label } from "@/components/ui-crm/label"
import { Textarea } from "@/components/ui-crm/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-crm/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui-crm/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui-crm/sheet"
import { Switch } from "@/components/ui-crm/switch"
import { Checkbox } from "@/components/ui-crm/checkbox"
import { Separator } from "@/components/ui-crm/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui-crm/dropdown-menu"
import {
  Target, Loader2, Search, Plus, Trash2, BrainCircuit,
  Mail, X, Upload, Download, Tag, ArrowRight, Send,
  FileText, Clock, Zap, ChevronRight, ChevronDown,
  LayoutList, Columns, Bell, SlidersHorizontal,
  AlertCircle, Calendar, Check, Bookmark, Users,
  MoreHorizontal, FolderOpen,
} from "lucide-react"
import type { LeadboardEntry, LeadStatus, ScoringRule } from "@/types"
import { LEAD_STATUS_CONFIG } from "@/types"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"

// ─── Local Types ──────────────────────────────────────────────────────────────

interface LeadTag {
  id: string
  name: string
  color: string
}

interface LeadWithTags extends LeadboardEntry {
  tagIds: string[]
}

interface Segment {
  id: string
  name: string
  color: string
  filters: Record<string, unknown>
}

interface DueReminder {
  id: string
  lead_id: string
  remind_at: string
  note?: string
  leadboard: { full_name: string } | null
}

interface Activity {
  id: string
  lead_id: string
  type: string
  description: string
  created_at: string
  metadata?: Record<string, unknown>
}

interface Sequence {
  id: string
  name: string
  description?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAG_PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
]

const KANBAN_STATUSES: LeadStatus[] = ["new", "contacted", "replied", "converted", "rejected"]

type SortOption = "score_desc" | "score_asc" | "name" | "date_added" | "last_contacted"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreBadgeClass(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
  if (score >= 50) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
  return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
}

function activityIcon(type: string) {
  switch (type) {
    case "status_change": return <ArrowRight className="h-3.5 w-3.5" />
    case "email_sent":    return <Send className="h-3.5 w-3.5" />
    case "tag_added":     return <Tag className="h-3.5 w-3.5" />
    case "tag_removed":   return <Tag className="h-3.5 w-3.5 opacity-50" />
    case "note_added":    return <FileText className="h-3.5 w-3.5" />
    case "manual":        return <Clock className="h-3.5 w-3.5" />
    case "added":         return <Plus className="h-3.5 w-3.5" />
    case "score_updated": return <Zap className="h-3.5 w-3.5" />
    default:              return <Clock className="h-3.5 w-3.5" />
  }
}

// ─── CSV Parser ────────────────────────────────────────────────────────────────

// Proper RFC-4180 CSV parser — handles quoted fields with commas/newlines inside
function parseCSVLine(line: string): string[] {
  const cells: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ } // escaped quote
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      cells.push(cur.trim()); cur = ""
    } else {
      cur += c
    }
  }
  cells.push(cur.trim())
  return cells
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Strip BOM if present
  const clean = text.replace(/^\uFEFF/, "")
  const lines = clean.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const cells = parseCSVLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = cells[i] ?? "" })
    return obj
  })
  return { headers, rows }
}

function mapCSVRow(row: Record<string, string>, headers: string[]) {
  // Case-insensitive fuzzy column finder — also accepts partial matches
  const find = (...keys: string[]) => {
    for (const k of keys) {
      // exact match first
      const exact = headers.find((h) => h.toLowerCase().trim() === k.toLowerCase().trim())
      if (exact) return row[exact]?.trim() ?? ""
    }
    // partial match fallback (e.g. "email address" contains "email")
    for (const k of keys) {
      const partial = headers.find((h) => h.toLowerCase().includes(k.toLowerCase()))
      if (partial) return row[partial]?.trim() ?? ""
    }
    return ""
  }
  return {
    full_name: find("full_name", "fullname", "name", "contact name", "full name"),
    email:     find("email", "e-mail", "email address", "work email", "mail"),
    company:   find("company", "company name", "organization", "org", "employer", "account"),
    position:  find("position", "job title", "title", "jobtitle", "role", "job role", "designation"),
    notes:     find("notes", "note", "comment", "comments", "description"),
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadboardPage() {
  const supabase = createClient()

  // ── Core data ──────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<LeadWithTags[]>([])
  const [allTags, setAllTags] = useState<LeadTag[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [dueReminders, setDueReminders] = useState<DueReminder[]>([])
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)

  // ── View ────────────────────────────────────────────────────────────────────
  const [view, setView] = useState<"table" | "kanban">("table")

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [minScore, setMinScore] = useState(0)
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>("score_desc")
  const [groupByCompany, setGroupByCompany] = useState(false)
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set())

  // ── Selection ───────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Panels ──────────────────────────────────────────────────────────────────
  const [selectedLead, setSelectedLead] = useState<LeadWithTags | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ── Dialogs ─────────────────────────────────────────────────────────────────
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [segmentSaveOpen, setSegmentSaveOpen] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [sequencePickerOpen, setSequencePickerOpen] = useState(false)

  // ── Add Lead form ────────────────────────────────────────────────────────────
  const [addForm, setAddForm] = useState({ full_name: "", email: "", company: "", position: "", notes: "" })
  const [addLoading, setAddLoading] = useState(false)
  const [addDuplicate, setAddDuplicate] = useState<{ id: string; name: string } | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  // ── Import ──────────────────────────────────────────────────────────────────
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvParsed, setCsvParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [csvDragOver, setCsvDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Notes / Sheet ────────────────────────────────────────────────────────────
  const [notesDraft, setNotesDraft] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)

  // ── Activities ───────────────────────────────────────────────────────────────
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  // ── Tags in Sheet ────────────────────────────────────────────────────────────
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_PRESET_COLORS[0])
  const [creatingTag, setCreatingTag] = useState(false)

  // ── Reminders ────────────────────────────────────────────────────────────────
  const [reminderDate, setReminderDate] = useState("")
  const [reminderNote, setReminderNote] = useState("")
  const [savingReminder, setSavingReminder] = useState(false)
  const [existingReminder, setExistingReminder] = useState<DueReminder | null>(null)

  // ── Segments ─────────────────────────────────────────────────────────────────
  const [segmentName, setSegmentName] = useState("")
  const [segmentColor, setSegmentColor] = useState(TAG_PRESET_COLORS[0])
  const [savingSegment, setSavingSegment] = useState(false)
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null)
  // segmentMembers: segmentId → Set of lead IDs
  const [segmentMembers, setSegmentMembers] = useState<Record<string, Set<string>>>({})
  const [togglingSegment, setTogglingSegment] = useState<string | null>(null)

  // ── Scoring ──────────────────────────────────────────────────────────────────
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)

  // ── Bulk ─────────────────────────────────────────────────────────────────────
  const [bulkStatusValue, setBulkStatusValue] = useState<string>("")
  const [bulkTagValue, setBulkTagValue] = useState<string>("")
  const [bulkLoading, setBulkLoading] = useState(false)

  // ── Sequence picker ──────────────────────────────────────────────────────────
  const [enrollingSequenceId, setEnrollingSequenceId] = useState<string>("")
  const [enrollLoading, setEnrollLoading] = useState(false)

  // ── Kanban drag state ─────────────────────────────────────────────────────────
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null)

  // ─── Data Loading ─────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [leadsRes, tagsRes, segmentsRes, remindersRes, rulesRes, seqRes] = await Promise.all([
      supabase
        .from("leadboard")
        .select("*, lead_tag_assignments(tag_id)")
        .eq("user_id", user.id)
        .order("relevance_score", { ascending: false }),
      fetch("/api/tags"),
      fetch("/api/segments"),
      supabase
        .from("follow_up_reminders")
        .select("*, leadboard(full_name)")
        .eq("user_id", user.id)
        .eq("is_done", false)
        .lte("remind_at", new Date().toISOString()),
      supabase.from("scoring_rules").select("*").order("created_at", { ascending: false }),
      fetch("/api/sequences"),
    ])

    const rawLeads = (leadsRes.data ?? []) as (LeadboardEntry & { lead_tag_assignments: { tag_id: string }[] })[]
    setLeads(rawLeads.map((l) => ({ ...l, tagIds: (l.lead_tag_assignments ?? []).map((a) => a.tag_id) })))

    if (tagsRes.ok) setAllTags(await tagsRes.json())
    const segs: Segment[] = segmentsRes.ok ? await segmentsRes.json() : []
    setSegments(segs)

    // Load members for all segments
    if (segs.length > 0) {
      const memberResults = await Promise.all(
        segs.map((s) => fetch(`/api/segments/${s.id}/members`).then((r) => r.ok ? r.json() : []))
      )
      const membersMap: Record<string, Set<string>> = {}
      segs.forEach((s, i) => { membersMap[s.id] = new Set(memberResults[i] ?? []) })
      setSegmentMembers(membersMap)
    }

    setDueReminders((remindersRes.data ?? []) as DueReminder[])
    setRules((rulesRes.data ?? []) as ScoringRule[])
    if (seqRes.ok) setSequences(await seqRes.json())

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadAll() }, [loadAll])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedLead) {
      setNotesDraft(selectedLead.notes ?? "")
      loadActivities(selectedLead.id)
      loadExistingReminder(selectedLead.id)
    }
  // We intentionally only re-run when the selected lead ID changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead?.id])

  async function loadActivities(leadId: string) {
    setActivitiesLoading(true)
    const res = await fetch(`/api/leads/${leadId}/activities`)
    if (res.ok) setActivities(await res.json())
    setActivitiesLoading(false)
  }

  async function loadExistingReminder(leadId: string) {
    const { data } = await supabase
      .from("follow_up_reminders")
      .select("*")
      .eq("lead_id", leadId)
      .eq("is_done", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    setExistingReminder(data as DueReminder | null)
    if (data) {
      setReminderDate((data as DueReminder).remind_at?.slice(0, 10) ?? "")
      setReminderNote((data as DueReminder).note ?? "")
    } else {
      setReminderDate("")
      setReminderNote("")
    }
  }

  // ─── Filtering & Sorting ──────────────────────────────────────────────────────

  const filteredLeads = leads.filter((l) => {
    if (activeSegmentId && !segmentMembers[activeSegmentId]?.has(l.id)) return false
    if (statusFilter !== "all" && l.status !== statusFilter) return false
    if (l.relevance_score < minScore) return false
    if (tagFilter.length > 0 && !tagFilter.every((tid) => l.tagIds.includes(tid))) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.full_name.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q) ||
        (l.position ?? "").toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      )
    }
    return true
  })

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    switch (sortBy) {
      case "score_desc": return b.relevance_score - a.relevance_score
      case "score_asc":  return a.relevance_score - b.relevance_score
      case "name":       return a.full_name.localeCompare(b.full_name)
      case "date_added": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case "last_contacted":
        return (new Date(b.last_contacted_at ?? 0).getTime()) - (new Date(a.last_contacted_at ?? 0).getTime())
      default: return 0
    }
  })

  // ─── Company Groups ───────────────────────────────────────────────────────────

  interface CompanyGroup {
    company: string
    leads: LeadWithTags[]
    avgScore: number
  }

  const companyGroups: CompanyGroup[] = groupByCompany
    ? (() => {
        const map = new Map<string, LeadWithTags[]>()
        for (const l of sortedLeads) {
          const key = l.company ?? "(No Company)"
          if (!map.has(key)) map.set(key, [])
          map.get(key)!.push(l)
        }
        return Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([company, cLeads]) => ({
            company,
            leads: [...cLeads].sort((a, b) => b.relevance_score - a.relevance_score),
            avgScore: Math.round(cLeads.reduce((s, l) => s + l.relevance_score, 0) / cLeads.length),
          }))
      })()
    : []

  // ─── Kanban Groups ────────────────────────────────────────────────────────────

  const kanbanGroups = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status] = filteredLeads.filter((l) => l.status === status)
    return acc
  }, {} as Record<LeadStatus, LeadWithTags[]>)

  // ─── Selection ────────────────────────────────────────────────────────────────

  const allVisibleIds = sortedLeads.map((l) => l.id)
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id))
  const someSelected = selectedIds.size > 0

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allVisibleIds))
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Status Change ────────────────────────────────────────────────────────────

  async function handleStatusChange(leadId: string, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status } : l))
    if (selectedLead?.id === leadId) setSelectedLead((l) => l ? { ...l, status } : l)
    await supabase.from("leadboard").update({ status }).eq("id", leadId)
  }

  // ─── Notes ───────────────────────────────────────────────────────────────────

  async function handleSaveNotes() {
    if (!selectedLead) return
    setSavingNotes(true)
    await supabase.from("leadboard").update({ notes: notesDraft }).eq("id", selectedLead.id)
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, notes: notesDraft } : l))
    setSelectedLead((l) => l ? { ...l, notes: notesDraft } : l)
    setSavingNotes(false)
  }

  // ─── Delete Lead ──────────────────────────────────────────────────────────────

  async function handleDeleteLead(id: string) {
    await supabase.from("leadboard").delete().eq("id", id)
    setLeads((prev) => prev.filter((l) => l.id !== id))
    if (selectedLead?.id === id) setSelectedLead(null)
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  // ─── Add Lead ─────────────────────────────────────────────────────────────────

  async function handleAddLead() {
    setAddError(null)
    setAddDuplicate(null)
    if (!addForm.full_name.trim() || !addForm.email.trim()) {
      setAddError("Name and email are required.")
      return
    }
    setAddLoading(true)
    const res = await fetch("/api/leads/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    if (res.status === 409) {
      setAddDuplicate({ id: data.existingId, name: data.existingName })
      setAddLoading(false)
      return
    }
    if (!res.ok) {
      setAddError(data.error ?? "Failed to add lead.")
      setAddLoading(false)
      return
    }
    setLeads((prev) => [{ ...data, tagIds: [] }, ...prev])
    setAddForm({ full_name: "", email: "", company: "", position: "", notes: "" })
    setAddLeadOpen(false)
    setAddLoading(false)
  }

  // ─── Import CSV ───────────────────────────────────────────────────────────────

  function handleCSVFile(file: File) {
    setCsvFile(file)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvParsed(parseCSV(text))
    }
    reader.readAsText(file)
  }

  function handleCSVDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setCsvDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith(".csv")) handleCSVFile(file)
  }

  async function handleImportSubmit() {
    if (!csvParsed) return
    setImportLoading(true)
    const rows = csvParsed.rows.map((r) => mapCSVRow(r, csvParsed.headers)).filter((r) => r.full_name && r.email)
    const res = await fetch("/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    })
    const result = await res.json()
    setImportResult({ inserted: result.inserted ?? 0, skipped: result.skipped ?? 0 })
    setImportLoading(false)
    if ((result.inserted ?? 0) > 0) await loadAll()
  }

  // ─── Export CSV ───────────────────────────────────────────────────────────────

  async function handleExport() {
    const leadIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined
    const res = await fetch("/api/leads/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds }),
    })
    if (!res.ok) return
    const csv = await res.text()
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leadboard-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Tags ─────────────────────────────────────────────────────────────────────

  async function handleToggleTag(leadId: string, tagId: string, hasTag: boolean) {
    setLeads((prev) => prev.map((l) => {
      if (l.id !== leadId) return l
      return {
        ...l,
        tagIds: hasTag ? l.tagIds.filter((t) => t !== tagId) : [...l.tagIds, tagId],
      }
    }))
    if (selectedLead?.id === leadId) {
      setSelectedLead((l) => l ? {
        ...l,
        tagIds: hasTag ? l.tagIds.filter((t) => t !== tagId) : [...l.tagIds, tagId],
      } : l)
    }
    if (hasTag) {
      await fetch(`/api/leads/${leadId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      })
    } else {
      await fetch(`/api/leads/${leadId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      })
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    setCreatingTag(true)
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    })
    if (res.ok) {
      const tag = await res.json()
      setAllTags((prev) => [...prev, tag])
      setNewTagName("")
    }
    setCreatingTag(false)
  }

  async function handleDeleteTag(tagId: string) {
    await fetch("/api/tags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    })
    setAllTags((prev) => prev.filter((t) => t.id !== tagId))
    setLeads((prev) => prev.map((l) => ({ ...l, tagIds: l.tagIds.filter((t) => t !== tagId) })))
  }

  // ─── Activities ───────────────────────────────────────────────────────────────

  async function handleAddNote() {
    if (!selectedLead || !newNote.trim()) return
    setAddingNote(true)
    const res = await fetch(`/api/leads/${selectedLead.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "manual", description: newNote.trim() }),
    })
    if (res.ok) {
      const act = await res.json()
      setActivities((prev) => [act, ...prev])
      setNewNote("")
    }
    setAddingNote(false)
  }

  // ─── Reminder ─────────────────────────────────────────────────────────────────

  async function handleSetReminder() {
    if (!selectedLead || !reminderDate) return
    setSavingReminder(true)
    await fetch(`/api/leads/${selectedLead.id}/reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindAt: new Date(reminderDate).toISOString(), note: reminderNote }),
    })
    await loadExistingReminder(selectedLead.id)
    setSavingReminder(false)
  }

  async function handleClearReminder() {
    if (!selectedLead) return
    await fetch(`/api/leads/${selectedLead.id}/reminder`, { method: "DELETE" })
    setExistingReminder(null)
    setReminderDate("")
    setReminderNote("")
  }

  // ─── Segments ─────────────────────────────────────────────────────────────────

  async function handleSaveSegment() {
    if (!segmentName.trim()) return
    setSavingSegment(true)
    const filters = { search, statusFilter, minScore, tagFilter, sortBy }
    const res = await fetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: segmentName.trim(), color: segmentColor, filters }),
    })
    if (res.ok) {
      const seg = await res.json()
      setSegments((prev) => [...prev, seg])
    }
    setSegmentName("")
    setSegmentSaveOpen(false)
    setSavingSegment(false)
  }

  function handleApplySegment(seg: Segment) {
    const f = seg.filters
    if (typeof f.search === "string") setSearch(f.search)
    if (typeof f.statusFilter === "string") setStatusFilter(f.statusFilter as LeadStatus | "all")
    if (typeof f.minScore === "number") setMinScore(f.minScore)
    if (Array.isArray(f.tagFilter)) setTagFilter(f.tagFilter as string[])
    if (typeof f.sortBy === "string") setSortBy(f.sortBy as SortOption)
  }

  async function handleDeleteSegment(id: string) {
    await fetch("/api/segments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setSegments((prev) => prev.filter((s) => s.id !== id))
    if (activeSegmentId === id) setActiveSegmentId(null)
  }

  async function handleToggleLeadSegment(leadId: string, segmentId: string) {
    const isMember = segmentMembers[segmentId]?.has(leadId)
    setTogglingSegment(segmentId)
    try {
      const res = await fetch(`/api/segments/${segmentId}/members`, {
        method: isMember ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      })
      if (res.ok) {
        setSegmentMembers((prev) => {
          const next = { ...prev }
          const members = new Set(prev[segmentId] ?? [])
          if (isMember) members.delete(leadId)
          else members.add(leadId)
          next[segmentId] = members
          return next
        })
      }
    } finally {
      setTogglingSegment(null)
    }
  }

  // ─── Bulk Actions ─────────────────────────────────────────────────────────────

  async function handleBulkStatus() {
    if (!bulkStatusValue || !someSelected) return
    setBulkLoading(true)
    const leadIds = Array.from(selectedIds)
    await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", leadIds, payload: { status: bulkStatusValue } }),
    })
    const status = bulkStatusValue as LeadStatus
    setLeads((prev) => prev.map((l) => selectedIds.has(l.id) ? { ...l, status } : l))
    setBulkStatusValue("")
    setBulkLoading(false)
  }

  async function handleAddTagToLead(leadId: string, tagId: string) {
    await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_tag", leadIds: [leadId], payload: { tagId } }),
    })
    setLeads((prev) => prev.map((l) =>
      l.id === leadId && !l.tagIds.includes(tagId)
        ? { ...l, tagIds: [...l.tagIds, tagId] }
        : l
    ))
  }

  async function handleBulkTag() {
    if (!bulkTagValue || !someSelected) return
    setBulkLoading(true)
    const leadIds = Array.from(selectedIds)
    await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_tag", leadIds, payload: { tagId: bulkTagValue } }),
    })
    setLeads((prev) => prev.map((l) =>
      selectedIds.has(l.id) && !l.tagIds.includes(bulkTagValue)
        ? { ...l, tagIds: [...l.tagIds, bulkTagValue] }
        : l
    ))
    setBulkTagValue("")
    setBulkLoading(false)
  }

  async function handleBulkDelete() {
    setBulkLoading(true)
    const leadIds = Array.from(selectedIds)
    await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", leadIds }),
    })
    setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)))
    if (selectedLead && selectedIds.has(selectedLead.id)) setSelectedLead(null)
    setSelectedIds(new Set())
    setBulkDeleteConfirmOpen(false)
    setBulkLoading(false)
  }

  // ─── Sequence Enroll ──────────────────────────────────────────────────────────

  async function handleEnrollSequence() {
    if (!enrollingSequenceId || !someSelected) return
    setEnrollLoading(true)
    await fetch("/api/sequences/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequenceId: enrollingSequenceId, leadIds: Array.from(selectedIds) }),
    })
    setEnrollingSequenceId("")
    setSequencePickerOpen(false)
    setEnrollLoading(false)
  }

  // ─── Score All ────────────────────────────────────────────────────────────────

  async function handleScoreAll() {
    const activeRule = rules.find((r) => r.is_active)
    if (!activeRule) { setScoreError("No active scoring directive. Add one below."); return }
    if (!leads.length) return
    setScoring(true)
    setScoreError(null)
    try {
      const res = await fetch("/api/leadboard/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: leads.map((l) => l.id), directive: activeRule.directive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadAll()
    } catch (e) {
      setScoreError((e as Error).message)
    } finally {
      setScoring(false)
      setScoreOpen(false)
    }
  }

  async function handleToggleRule(id: string, current: boolean) {
    if (!current) await supabase.from("scoring_rules").update({ is_active: false }).neq("id", id)
    await supabase.from("scoring_rules").update({ is_active: !current }).eq("id", id)
    const { data } = await supabase.from("scoring_rules").select("*").order("created_at", { ascending: false })
    setRules((data as ScoringRule[]) ?? [])
  }

  async function handleDeleteRule(id: string) {
    await supabase.from("scoring_rules").delete().eq("id", id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleAddRule(directive: string) {
    if (!directive.trim()) return
    await supabase.from("scoring_rules").insert({ directive: directive.trim(), is_active: true })
    await supabase.from("scoring_rules").update({ is_active: false }).neq("directive", directive.trim())
    const { data } = await supabase.from("scoring_rules").select("*").order("created_at", { ascending: false })
    setRules((data as ScoringRule[]) ?? [])
  }

  // ─── Kanban HTML5 Drag & Drop ─────────────────────────────────────────────────

  function handleKanbanDragStart(e: DragEvent<HTMLDivElement>, leadId: string) {
    setDraggingLeadId(leadId)
    e.dataTransfer.setData("leadId", leadId)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleKanbanDragEnd() {
    setDraggingLeadId(null)
    setDragOverColumn(null)
  }

  function handleColumnDragOver(e: DragEvent<HTMLDivElement>, status: LeadStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverColumn(status)
  }

  function handleColumnDragLeave() {
    setDragOverColumn(null)
  }

  async function handleColumnDrop(e: DragEvent<HTMLDivElement>, newStatus: LeadStatus) {
    e.preventDefault()
    setDragOverColumn(null)
    const leadId = e.dataTransfer.getData("leadId")
    if (!leadId) return
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.status === newStatus) return
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l))
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  // ─── Tag Filter Toggle ────────────────────────────────────────────────────────

  function toggleTagFilter(tagId: string) {
    setTagFilter((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  // ─── Company Collapse ─────────────────────────────────────────────────────────

  function toggleCompany(company: string) {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev)
      if (next.has(company)) next.delete(company)
      else next.add(company)
      return next
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">

      {/* ── Smart Segments Sidebar ── */}
      <div className={cn(
        "shrink-0 border-r bg-muted/20 transition-all duration-200 overflow-hidden flex flex-col",
        sidebarOpen ? "w-52" : "w-0"
      )}>
        <div className="p-3 border-b flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Segments</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSegmentSaveOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {activeSegmentId && (
              <button
                onClick={() => setActiveSegmentId(null)}
                className="w-full text-left flex items-center gap-1.5 px-2 py-1 mb-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" /> Show all leads
              </button>
            )}
            {segments.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">No segments yet</p>
            )}
            {segments.map((seg) => {
              const count = segmentMembers[seg.id]?.size ?? 0
              const isActive = activeSegmentId === seg.id
              return (
                <div
                  key={seg.id}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                    isActive ? "bg-muted" : "hover:bg-muted/60"
                  )}
                  onClick={() => setActiveSegmentId(isActive ? null : seg.id)}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs flex-1 truncate text-foreground">{seg.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{count}</span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSegment(seg.id) }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        <div className="p-2 border-t shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => setSegmentSaveOpen(true)}
          >
            <Bookmark className="h-3 w-3" />
            Save filters
          </Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-6 max-w-full space-y-4">

          {/* ── Due Reminders Banner ── */}
          {dueReminders.map((rem) => (
            <div key={rem.id} className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5 text-sm">
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="flex-1 text-amber-800 dark:text-amber-300">
                <span className="font-medium">{rem.leadboard?.full_name ?? "A lead"}</span>
                {" "}— Follow-up due{" "}
                <span className="font-medium">{formatDistanceToNow(new Date(rem.remind_at), { addSuffix: true })}</span>
                {rem.note && <span className="text-amber-700 dark:text-amber-400"> · {rem.note}</span>}
              </span>
              <button
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400"
                onClick={() => setDueReminders((prev) => prev.filter((r) => r.id !== rem.id))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarOpen((v) => !v)}
                title="Toggle segments sidebar"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Leadboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{leads.length} leads</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Toggle */}
              <div className="flex items-center border rounded-md overflow-hidden">
                <button
                  onClick={() => setView("table")}
                  className={cn(
                    "px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors",
                    view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <LayoutList className="h-3.5 w-3.5" /> Table
                </button>
                <button
                  onClick={() => setView("kanban")}
                  className={cn(
                    "px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors border-l",
                    view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <Columns className="h-3.5 w-3.5" /> Kanban
                </button>
              </div>

              <Button variant="outline" size="sm" onClick={() => setAddLeadOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Lead
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCsvFile(null); setCsvParsed(null); setImportResult(null); setImportOpen(true) }}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                <Download className="h-4 w-4" />
                {selectedIds.size > 0 ? `Export ${selectedIds.size}` : "Export"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setScoreOpen(true)} className="gap-1.5">
                <BrainCircuit className="h-4 w-4" /> Score All
              </Button>
            </div>
          </div>

          {scoreError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{scoreError}</span>
              <button onClick={() => setScoreError(null)}><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {/* ── Filters Row ── */}
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => { if (v !== null) setStatusFilter(v as LeadStatus | "all") }}
            >
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{LEAD_STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(v) => { if (v !== null) setSortBy(v as SortOption) }}
            >
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score_desc">Score: High → Low</SelectItem>
                <SelectItem value="score_asc">Score: Low → High</SelectItem>
                <SelectItem value="name">Name A → Z</SelectItem>
                <SelectItem value="date_added">Date Added</SelectItem>
                <SelectItem value="last_contacted">Last Contacted</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Min score</Label>
              <Input
                type="number"
                min={0}
                max={100}
                className="w-16 h-9 text-sm"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              />
            </div>
            {/* Tag filter badges */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTagFilter(tag.id)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all",
                      tagFilter.includes(tag.id) ? "opacity-100" : "opacity-50 hover:opacity-80"
                    )}
                    style={{ backgroundColor: tag.color + "22", borderColor: tag.color, color: tag.color }}
                  >
                    {tagFilter.includes(tag.id) && <Check className="h-2.5 w-2.5" />}
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
            {/* Group by company toggle (table only) */}
            {view === "table" && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Switch
                  id="group-company"
                  checked={groupByCompany}
                  onCheckedChange={setGroupByCompany}
                />
                <Label htmlFor="group-company" className="text-xs cursor-pointer whitespace-nowrap">
                  <Users className="inline h-3.5 w-3.5 mr-1" />
                  Group by company
                </Label>
              </div>
            )}
          </div>

          {/* ── Loading ── */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : view === "table" ? (
            /* ════════════════ TABLE VIEW ════════════════ */
            filteredLeads.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No leads found</p>
                <p className="text-xs mt-1">Try adjusting your filters or add new leads</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2.5 w-8">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">#</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Position</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden lg:table-cell">Email</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Score</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Tags</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupByCompany
                      ? companyGroups.map((group) => {
                          const collapsed = collapsedCompanies.has(group.company)
                          return (
                            <>
                              {/* Company header row */}
                              <tr
                                key={`cg-${group.company}`}
                                className="bg-muted/30 border-b border-t cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleCompany(group.company)}
                              >
                                <td className="px-3 py-2" colSpan={2} />
                                <td className="px-4 py-2" colSpan={7}>
                                  <div className="flex items-center gap-2">
                                    {collapsed
                                      ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    }
                                    <span className="font-semibold text-xs text-foreground">{group.company}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {group.leads.length} lead{group.leads.length !== 1 ? "s" : ""} · avg score {group.avgScore}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {/* Lead rows */}
                              {!collapsed && group.leads.map((lead, i) => (
                                <LeadRow
                                  key={lead.id}
                                  lead={lead}
                                  index={i + 1}
                                  allTags={allTags}
                                  segments={segments}
                                  segmentMembers={segmentMembers}
                                  selected={selectedIds.has(lead.id)}
                                  onSelect={() => toggleSelect(lead.id)}
                                  onClick={() => setSelectedLead(lead)}
                                  onStatusChange={handleStatusChange}
                                  onDelete={handleDeleteLead}
                                  onAddTag={handleAddTagToLead}
                                  onToggleSegment={handleToggleLeadSegment}
                                />
                              ))}
                            </>
                          )
                        })
                      : sortedLeads.map((lead, i) => (
                          <LeadRow
                            key={lead.id}
                            lead={lead}
                            index={i + 1}
                            allTags={allTags}
                            segments={segments}
                            segmentMembers={segmentMembers}
                            selected={selectedIds.has(lead.id)}
                            onSelect={() => toggleSelect(lead.id)}
                            onClick={() => setSelectedLead(lead)}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteLead}
                            onAddTag={handleAddTagToLead}
                            onToggleSegment={handleToggleLeadSegment}
                          />
                        ))
                    }
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* ════════════════ KANBAN VIEW ════════════════ */
            <div className="flex gap-4 overflow-x-auto pb-4">
              {KANBAN_STATUSES.map((status) => {
                const cfg = LEAD_STATUS_CONFIG[status]
                const columnLeads = kanbanGroups[status] ?? []
                const isOver = dragOverColumn === status
                return (
                  <div
                    key={status}
                    className="flex-shrink-0 w-64"
                    onDragOver={(e) => handleColumnDragOver(e, status)}
                    onDragLeave={handleColumnDragLeave}
                    onDrop={(e) => handleColumnDrop(e, status)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", cfg.className)}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{columnLeads.length}</span>
                    </div>
                    <div className={cn(
                      "min-h-40 rounded-lg border bg-muted/20 p-2 space-y-2 transition-colors",
                      isOver && "bg-muted/40 border-primary/50 ring-1 ring-primary/30"
                    )}>
                      {columnLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleKanbanDragStart(e, lead.id)}
                          onDragEnd={handleKanbanDragEnd}
                          className={cn(
                            "bg-background rounded-md border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none",
                            draggingLeadId === lead.id && "opacity-50 ring-2 ring-primary/30"
                          )}
                          onClick={() => setSelectedLead(lead)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium text-xs text-foreground leading-tight line-clamp-2">{lead.full_name}</p>
                            <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0", scoreBadgeClass(lead.relevance_score))}>
                              {lead.relevance_score}
                            </span>
                          </div>
                          {lead.company && (
                            <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                          )}
                          {lead.position && (
                            <p className="text-xs text-muted-foreground truncate">{lead.position}</p>
                          )}
                          {lead.tagIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {lead.tagIds.slice(0, 3).map((tid) => {
                                const tag = allTags.find((t) => t.id === tid)
                                if (!tag) return null
                                return (
                                  <span
                                    key={tid}
                                    className="inline-flex text-xs px-1.5 rounded-full"
                                    style={{ backgroundColor: tag.color + "33", color: tag.color }}
                                  >
                                    {tag.name}
                                  </span>
                                )
                              })}
                              {lead.tagIds.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{lead.tagIds.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {columnLeads.length === 0 && !isOver && (
                        <div className="text-center py-6 text-xs text-muted-foreground/40">Drop here</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          FLOATING BULK ACTION BAR
         ══════════════════════════════════════════════════════ */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background border shadow-2xl rounded-xl px-4 py-2.5 flex-wrap justify-center">
          <span className="text-sm font-medium text-foreground mr-1">
            {selectedIds.size} selected
          </span>
          <Separator orientation="vertical" className="h-5" />

          {/* Change Status */}
          <Select
            value={bulkStatusValue || undefined}
            onValueChange={(v) => { if (v !== null && v !== undefined) setBulkStatusValue(v) }}
          >
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{LEAD_STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!bulkStatusValue || bulkLoading}
            onClick={handleBulkStatus}
          >
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>

          {/* Add Tag */}
          <Select
            value={bulkTagValue || undefined}
            onValueChange={(v) => { if (v !== null && v !== undefined) setBulkTagValue(v) }}
          >
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Add tag" />
            </SelectTrigger>
            <SelectContent>
              {allTags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!bulkTagValue || bulkLoading}
            onClick={handleBulkTag}
          >
            <Tag className="h-3 w-3" />
          </Button>

          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleExport}>
            <Download className="h-3 w-3" /> Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => setSequencePickerOpen(true)}
          >
            <Mail className="h-3 w-3" /> Enroll
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs gap-1"
            onClick={() => setBulkDeleteConfirmOpen(true)}
            disabled={bulkLoading}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          LEAD DETAIL SHEET
         ══════════════════════════════════════════════════════ */}
      <Sheet open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
        <SheetContent className="w-full sm:w-[420px] p-0 flex flex-col overflow-hidden">
          {selectedLead && (
            <>
              <SheetHeader className="px-5 py-4 border-b shrink-0">
                <SheetTitle className="text-base font-semibold">{selectedLead.full_name}</SheetTitle>
                {selectedLead.position && (
                  <p className="text-xs text-muted-foreground">{selectedLead.position}{selectedLead.company ? ` @ ${selectedLead.company}` : ""}</p>
                )}
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                <div className="px-5 py-4 space-y-5">

                  {/* Contact info */}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-mono text-xs break-all">{selectedLead.email}</span>
                  </div>

                  {/* Score */}
                  <div className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Relevance Score</span>
                      <span className={cn("text-lg font-bold px-2 py-0.5 rounded-full", scoreBadgeClass(selectedLead.relevance_score))}>
                        {selectedLead.relevance_score}
                      </span>
                    </div>
                    {selectedLead.scoring_reason && (
                      <p className="text-xs text-muted-foreground italic leading-relaxed">{selectedLead.scoring_reason}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(selectedLead.id, s)}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full font-medium transition-opacity",
                            LEAD_STATUS_CONFIG[s].className,
                            selectedLead.status !== s && "opacity-35 hover:opacity-70"
                          )}
                        >
                          {LEAD_STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tags</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map((tag) => {
                        const has = selectedLead.tagIds.includes(tag.id)
                        return (
                          <button
                            key={tag.id}
                            onClick={() => handleToggleTag(selectedLead.id, tag.id, has)}
                            className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all",
                              has ? "opacity-100" : "opacity-40 hover:opacity-70"
                            )}
                            style={{ backgroundColor: tag.color + "22", borderColor: tag.color, color: tag.color }}
                          >
                            {has && <Check className="h-2.5 w-2.5" />}
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>

                    {/* Create new tag */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex gap-1 shrink-0">
                        {TAG_PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            className={cn(
                              "h-4 w-4 rounded-full border-2 transition-transform",
                              newTagColor === c ? "border-foreground scale-125" : "border-transparent hover:scale-110"
                            )}
                            style={{ backgroundColor: c }}
                            onClick={() => setNewTagColor(c)}
                          />
                        ))}
                      </div>
                      <Input
                        className="h-7 text-xs flex-1"
                        placeholder="New tag name..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag() }}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 shrink-0"
                        onClick={handleCreateTag}
                        disabled={creatingTag || !newTagName.trim()}
                      >
                        {creatingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>

                    {/* Tag delete list */}
                    {allTags.length > 0 && (
                      <div className="space-y-0.5 pt-0.5">
                        {allTags.map((tag) => (
                          <div key={tag.id} className="flex items-center justify-between text-xs py-0.5">
                            <span style={{ color: tag.color }} className="font-medium">{tag.name}</span>
                            <button onClick={() => handleDeleteTag(tag.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Segments */}
                  {segments.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Bookmark className="h-3 w-3" /> Segments
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {segments.map((seg) => {
                          const isMember = segmentMembers[seg.id]?.has(selectedLead.id)
                          const loading = togglingSegment === seg.id
                          return (
                            <button
                              key={seg.id}
                              onClick={() => handleToggleLeadSegment(selectedLead.id, seg.id)}
                              disabled={!!loading}
                              className={cn(
                                "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all",
                                isMember ? "opacity-100" : "opacity-40 hover:opacity-70"
                              )}
                              style={{ backgroundColor: seg.color + "22", borderColor: seg.color, color: seg.color }}
                            >
                              {loading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : isMember && <Check className="h-2.5 w-2.5" />}
                              {seg.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      onBlur={handleSaveNotes}
                      rows={3}
                      className="text-sm resize-none"
                      placeholder="Add notes..."
                    />
                    {savingNotes && <p className="text-xs text-muted-foreground">Saving...</p>}
                  </div>

                  <Separator />

                  {/* Follow-up Reminder */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Bell className="h-3 w-3" /> Follow-up Reminder
                    </Label>
                    {existingReminder && (
                      <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-amber-800 dark:text-amber-300">
                        <Bell className="h-3 w-3 shrink-0" />
                        <span className="flex-1">
                          {format(new Date(existingReminder.remind_at), "MMM d, yyyy")}
                          {existingReminder.note && ` · ${existingReminder.note}`}
                        </span>
                        <button onClick={handleClearReminder} className="hover:text-destructive shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className="flex-1 h-8 rounded-md border bg-background px-2 text-xs text-foreground"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs shrink-0"
                        disabled={!reminderDate || savingReminder}
                        onClick={handleSetReminder}
                      >
                        {savingReminder ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calendar className="h-3 w-3" />}
                      </Button>
                    </div>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Optional note..."
                      value={reminderNote}
                      onChange={(e) => setReminderNote(e.target.value)}
                    />
                  </div>

                  <Separator />

                  {/* Activity Timeline */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Activity Timeline
                    </Label>
                    {/* Add Note */}
                    <div className="flex gap-2">
                      <Textarea
                        className="text-xs resize-none flex-1"
                        rows={2}
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="self-end h-8 text-xs shrink-0"
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addingNote}
                      >
                        {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>
                    {activitiesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : activities.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No activity yet</p>
                    ) : (
                      <div className="space-y-2 mt-1">
                        {activities.map((act) => (
                          <div key={act.id} className="flex gap-2.5 text-xs">
                            <div className="mt-0.5 text-muted-foreground shrink-0">
                              {activityIcon(act.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground leading-snug">{act.description}</p>
                              <p className="text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Sheet Actions */}
                  <div className="flex flex-col gap-2 pb-2">
                    <a
                      href={`/outreach?lead=${selectedLead.id}`}
                      className="inline-flex items-center justify-center gap-1.5 w-full h-8 px-3 text-xs font-medium rounded-md border hover:bg-muted transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" /> Go to Outreach
                    </a>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5 w-full"
                      onClick={() => handleDeleteLead(selectedLead.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove Lead
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════
          ADD LEAD DIALOG
         ══════════════════════════════════════════════════════ */}
      <Dialog
        open={addLeadOpen}
        onOpenChange={(o) => {
          setAddLeadOpen(o)
          if (!o) { setAddDuplicate(null); setAddError(null) }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Lead
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {addDuplicate && (
              <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-amber-800 dark:text-amber-300 flex-1">
                  Already in Leadboard: <span className="font-medium">{addDuplicate.name}</span>
                </span>
                <button
                  onClick={() => {
                    setAddLeadOpen(false)
                    setSelectedLead(leads.find((l) => l.id === addDuplicate!.id) ?? null)
                  }}
                  className="text-xs underline text-amber-700 dark:text-amber-400 whitespace-nowrap"
                >
                  View Lead
                </button>
              </div>
            )}
            {addError && !addDuplicate && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{addError}</div>
            )}
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Full Name *</Label>
                <Input
                  className="h-9 text-sm"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  className="h-9 text-sm"
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="jane@company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Company</Label>
                  <Input
                    className="h-9 text-sm"
                    value={addForm.company}
                    onChange={(e) => setAddForm((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Position</Label>
                  <Input
                    className="h-9 text-sm"
                    value={addForm.position}
                    onChange={(e) => setAddForm((p) => ({ ...p, position: e.target.value }))}
                    placeholder="CEO"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  className="text-sm resize-none"
                  rows={2}
                  value={addForm.notes}
                  onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Any notes..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLeadOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={addLoading} className="gap-1.5">
              {addLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          IMPORT CSV DIALOG
         ══════════════════════════════════════════════════════ */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Import CSV
            </DialogTitle>
          </DialogHeader>

          {!csvParsed ? (
            <div
              className={cn(
                "border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-12 gap-3 transition-colors cursor-pointer",
                csvDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/60"
              )}
              onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true) }}
              onDragLeave={() => setCsvDragOver(false)}
              onDrop={handleCSVDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Drop your CSV file here</p>
                <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
              </div>
              <p className="text-xs text-muted-foreground">Supports: name, email, company, position, notes</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCSVFile(f) }}
              />
            </div>
          ) : importResult ? (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
                <Check className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Import complete</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {importResult.inserted} imported · {importResult.skipped} duplicates skipped
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCsvParsed(null); setCsvFile(null); setImportResult(null) }}
              >
                Import another file
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Preview: <span className="font-medium text-foreground">{csvFile?.name}</span> ({csvParsed.rows.length} rows)
                </p>
                <button
                  onClick={() => { setCsvParsed(null); setCsvFile(null) }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Change file
                </button>
              </div>
              <div className="rounded-lg border overflow-auto max-h-60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      {["Name", "Email", "Company", "Position", "Notes"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvParsed.rows.slice(0, 5).map((row, i) => {
                      const mapped = mapCSVRow(row, csvParsed.headers)
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2">{mapped.full_name || <span className="text-muted-foreground italic">—</span>}</td>
                          <td className="px-3 py-2 font-mono">{mapped.email || <span className="text-muted-foreground italic">—</span>}</td>
                          <td className="px-3 py-2">{mapped.company || <span className="text-muted-foreground italic">—</span>}</td>
                          <td className="px-3 py-2">{mapped.position || <span className="text-muted-foreground italic">—</span>}</td>
                          <td className="px-3 py-2 truncate max-w-24">{mapped.notes || <span className="text-muted-foreground italic">—</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {csvParsed.rows.length > 5 && (
                <p className="text-xs text-muted-foreground">… and {csvParsed.rows.length - 5} more rows</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            {csvParsed && !importResult && (
              <Button onClick={handleImportSubmit} disabled={importLoading} className="gap-1.5">
                {importLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Import {csvParsed.rows.length} rows
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          SCORE ALL DIALOG
         ══════════════════════════════════════════════════════ */}
      <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4" /> Scoring Directives
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Write a natural language directive. Claude will score each lead 0–100.
              Only one directive can be active at a time.
            </p>
            {rules.length > 0 && (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-3 text-sm",
                      rule.is_active && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground leading-snug">{rule.directive}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(rule.created_at), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleRule(rule.id, rule.is_active)}
                      />
                      <button onClick={() => handleDeleteRule(rule.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <AddRuleInline onAdd={handleAddRule} />
            {scoreError && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{scoreError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreOpen(false)}>Close</Button>
            <Button
              onClick={handleScoreAll}
              disabled={!rules.some((r) => r.is_active) || scoring || !leads.length}
              className="gap-1.5"
            >
              {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {scoring ? `Scoring ${leads.length} leads...` : "Run Scoring"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          SAVE SEGMENT DIALOG
         ══════════════════════════════════════════════════════ */}
      <Dialog open={segmentSaveOpen} onOpenChange={setSegmentSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" /> Save Current Filters
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Segment Name</Label>
              <Input
                className="h-9 text-sm"
                placeholder="e.g. Hot leads Q2"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2">
                {TAG_PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      "h-5 w-5 rounded-full border-2 transition-transform",
                      segmentColor === c ? "border-foreground scale-125" : "border-transparent hover:scale-110"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setSegmentColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegmentSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSegment} disabled={!segmentName.trim() || savingSegment} className="gap-1.5">
              {savingSegment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bookmark className="h-3.5 w-3.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          BULK DELETE CONFIRMATION DIALOG
         ══════════════════════════════════════════════════════ */}
      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Delete {selectedIds.size} leads?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. All selected leads and their activity history will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading} className="gap-1.5">
              {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          SEQUENCE PICKER DIALOG
         ══════════════════════════════════════════════════════ */}
      <Dialog open={sequencePickerOpen} onOpenChange={setSequencePickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Enroll in Sequence
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enroll {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} into a sequence.
            </p>
            {sequences.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No sequences found. Create one in the Outreach section.</p>
            ) : (
              <Select
                value={enrollingSequenceId || undefined}
                onValueChange={(v) => { if (v !== null && v !== undefined) setEnrollingSequenceId(v) }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select a sequence..." />
                </SelectTrigger>
                <SelectContent>
                  {sequences.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>{seq.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSequencePickerOpen(false)}>Cancel</Button>
            <Button onClick={handleEnrollSequence} disabled={!enrollingSequenceId || enrollLoading} className="gap-1.5">
              {enrollLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface LeadRowProps {
  lead: LeadWithTags
  index: number
  allTags: LeadTag[]
  segments: Segment[]
  segmentMembers: Record<string, Set<string>>
  selected: boolean
  onSelect: () => void
  onClick: () => void
  onStatusChange: (id: string, status: LeadStatus) => void
  onDelete: (id: string) => void
  onAddTag: (leadId: string, tagId: string) => void
  onToggleSegment: (leadId: string, segmentId: string) => void
}

function LeadRow({
  lead, index, allTags, segments, segmentMembers,
  selected, onSelect, onClick, onStatusChange, onDelete,
  onAddTag, onToggleSegment,
}: LeadRowProps) {
  return (
    <tr
      className={cn(
        "border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors",
        selected && "bg-primary/5"
      )}
      onClick={onClick}
    >
      <td className="px-3 py-3 w-8" onClick={(e) => { e.stopPropagation(); onSelect() }}>
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs">{index}</td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-foreground text-sm">{lead.full_name}</p>
          {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
          {lead.tagIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {lead.tagIds.slice(0, 3).map((tid) => {
                const tag = allTags.find((t) => t.id === tid)
                if (!tag) return null
                return (
                  <span
                    key={tid}
                    className="inline-flex text-xs px-1.5 py-0 rounded-full"
                    style={{ backgroundColor: tag.color + "33", color: tag.color }}
                  >
                    {tag.name}
                  </span>
                )
              })}
              {lead.tagIds.length > 3 && (
                <span className="text-xs text-muted-foreground">+{lead.tagIds.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-sm hidden md:table-cell">{lead.position ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground text-xs font-mono hidden lg:table-cell">{lead.email}</td>
      <td className="px-4 py-3">
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", scoreBadgeClass(lead.relevance_score))}>
          {lead.relevance_score}
        </span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Select
          value={lead.status}
          onValueChange={(v) => { if (v !== null) onStatusChange(lead.id, v as LeadStatus) }}
        >
          <SelectTrigger className="h-7 text-xs w-32 border-0 bg-transparent p-0 [&>svg]:hidden">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", LEAD_STATUS_CONFIG[lead.status]?.className)}>
              {LEAD_STATUS_CONFIG[lead.status]?.label}
            </span>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{LEAD_STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onClick}>
              <FileText className="h-3.5 w-3.5 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* Add Tag submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Tag className="h-3.5 w-3.5 mr-2" /> Add Tag
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {allTags.length === 0 ? (
                  <DropdownMenuItem disabled>No tags yet</DropdownMenuItem>
                ) : allTags.map((tag) => {
                  const hasTag = lead.tagIds.includes(tag.id)
                  return (
                    <DropdownMenuItem
                      key={tag.id}
                      onClick={() => { if (!hasTag) onAddTag(lead.id, tag.id) }}
                      className={cn(hasTag && "opacity-50 cursor-default")}
                    >
                      <span
                        className="h-2 w-2 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                      {hasTag && <Check className="h-3 w-3 ml-auto" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Add to Segment submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderOpen className="h-3.5 w-3.5 mr-2" /> Add to Segment
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {segments.length === 0 ? (
                  <DropdownMenuItem disabled>No segments yet</DropdownMenuItem>
                ) : segments.map((seg) => {
                  const isMember = segmentMembers[seg.id]?.has(lead.id)
                  return (
                    <DropdownMenuItem
                      key={seg.id}
                      onClick={() => onToggleSegment(lead.id, seg.id)}
                    >
                      <span
                        className="h-2 w-2 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      {seg.name}
                      {isMember && <Check className="h-3 w-3 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(lead.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

// Inline "Add Rule" form used inside the scoring dialog
function AddRuleInline({ onAdd }: { onAdd: (directive: string) => Promise<void> }) {
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!value.trim()) return
    setLoading(true)
    await onAdd(value.trim())
    setValue("")
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">New Directive</Label>
      <Textarea
        placeholder="e.g. Prioritize marketing directors at SaaS companies with 50+ employees."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        className="text-sm resize-none"
      />
      <Button size="sm" onClick={submit} disabled={!value.trim() || loading} className="gap-1.5">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        Add & Activate
      </Button>
    </div>
  )
}
