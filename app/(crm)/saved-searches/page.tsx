"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"
import { Button } from "@/components/ui-crm/button"
import { Card, CardContent } from "@/components/ui-crm/card"
import { Badge } from "@/components/ui-crm/badge"
import { Bookmark, Search, Trash2, Loader2, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import type { LushaSearchFilters } from "@/types"

interface SavedSearch {
  id: string
  name: string
  filters: Partial<LushaSearchFilters>
  created_at: string
}

const FILTER_LABELS: Record<string, string> = {
  jobTitles: "Job Titles",
  seniority: "Seniority",
  departments: "Departments",
  searchText: "Keyword",
  country: "Country",
  state: "State",
  city: "City",
  companyName: "Companies",
  companyDomain: "Domains",
  companySize: "Company Size",
  companyCountry: "Company Country",
  hasEmail: "Has Email",
  hasPhone: "Has Phone",
  hasMobilePhone: "Has Mobile",
}

export default function SavedSearchesPage() {
  const router = useRouter()
  const activeWorkspaceId = useCrmWorkspaceStore((s) => s.activeWorkspaceId)
  const [list, setList] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    if (!activeWorkspaceId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/saved-searches?workspaceId=${activeWorkspaceId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setList(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [activeWorkspaceId])

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved search?")) return
    setDeletingId(id)
    try {
      const res = await fetch("/api/saved-searches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, workspaceId: activeWorkspaceId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setList((l) => l.filter((s) => s.id !== id))
    } catch (e) {
      alert("Delete failed: " + (e as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  function handleLoad(id: string) {
    router.push(`/prospecting?saved=${id}`)
  }

  function summarize(filters: Partial<LushaSearchFilters>): Array<{ label: string; value: string }> {
    const out: Array<{ label: string; value: string }> = []
    for (const [k, v] of Object.entries(filters)) {
      if (v === "" || v === false || v === undefined || v === null) continue
      const label = FILTER_LABELS[k] ?? k
      let value: string
      if (typeof v === "boolean") value = "Yes"
      else value = String(v)
      if (value.length > 40) value = value.slice(0, 37) + "…"
      out.push({ label, value })
    }
    return out
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Bookmark className="h-5 w-5" /> Saved Searches
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Re-run prospecting filters you saved earlier. Click to load into Prospecting.
          </p>
        </div>
        <Button onClick={() => router.push("/prospecting")} className="gap-1.5">
          <Search className="h-4 w-4" /> New Search
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-base font-medium">No saved searches yet</p>
            <p className="text-sm mt-1">
              Go to Prospecting, set up filters, and click <b>Save Search</b> to create one.
            </p>
            <Button onClick={() => router.push("/prospecting")} className="mt-4 gap-1.5">
              <Search className="h-4 w-4" /> Go to Prospecting
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((s) => {
            const chips = summarize(s.filters)
            return (
              <Card key={s.id} className="group hover:border-primary/40 transition-colors">
                <CardContent className="pt-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{s.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(s.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    {chips.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No filters set</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {chips.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-normal h-auto py-0.5">
                            <span className="text-muted-foreground mr-1">{c.label}:</span>
                            <span className="text-foreground">{c.value}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleLoad(s.id)}
                      className="gap-1.5"
                    >
                      <Search className="h-3.5 w-3.5" /> Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
