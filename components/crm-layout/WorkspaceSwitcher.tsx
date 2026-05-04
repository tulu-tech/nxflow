"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Plus, Loader2, Pencil, Trash2, X } from "lucide-react"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"
import type { CrmWorkspace } from "@/store/crmWorkspaceStore"

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, setWorkspaces, updateWorkspace, removeWorkspace } =
    useCrmWorkspaceStore()

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState("🎯")
  const [saving, setSaving] = useState(false)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameSaving, setRenameSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setRenamingId(null)
        setDeletingId(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
      })
      if (res.ok) {
        const ws: CrmWorkspace = await res.json()
        setWorkspaces([...workspaces, ws])
        setActiveWorkspace(ws.id)
        setNewName("")
        setNewIcon("🎯")
        setCreating(false)
        setOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleRename(id: string) {
    const name = renameValue.trim()
    if (!name) { setRenamingId(null); return }
    setRenameSaving(true)
    try {
      const res = await fetch(`/api/workspaces?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) updateWorkspace(id, { name })
    } finally {
      setRenameSaving(false)
      setRenamingId(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/workspaces?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        removeWorkspace(id)
        setDeletingId(null)
        setOpen(false)
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!active) return null

  const ICONS = ["🏢", "🎯", "🚀", "⚡", "🛡️", "💼", "🌍", "🔮"]
  const canDelete = workspaces.length > 1

  return (
    <div ref={dropdownRef} style={{ position: "relative", padding: "6px 8px" }}>
      {/* ── Trigger ── */}
      <button
        onClick={() => { setOpen((o) => !o); setCreating(false); setRenamingId(null); setDeletingId(null) }}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: "var(--bg-raised, #1e1e2e)", border: "1px solid var(--border-subtle)", cursor: "pointer", transition: "background 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover, #252535)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-raised, #1e1e2e)")}
      >
        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{active.icon}</span>
        <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active.name}
        </span>
        <ChevronDown size={13} style={{ flexShrink: 0, color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 8, right: 8, zIndex: 100, background: "var(--bg-raised, #1e1e2e)", border: "1px solid var(--border-subtle)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", overflow: "hidden" }}>

          <style>{`.ws-row:hover .ws-actions { opacity: 1 !important; }`}</style>

          {workspaces.map((ws) => (
            <div key={ws.id} className="ws-row" style={{ position: "relative" }}>

              {/* Delete confirm */}
              {deletingId === ws.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "rgba(239,68,68,0.1)" }}>
                  <span style={{ flex: 1, fontSize: 11, color: "var(--text-primary)" }}>Delete &ldquo;{ws.name}&rdquo;?</span>
                  <button
                    onClick={() => handleDelete(ws.id)}
                    disabled={deleteLoading}
                    style={{ padding: "3px 8px", borderRadius: 5, background: "#ef4444", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                  >
                    {deleteLoading && <Loader2 size={10} />} Delete
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    style={{ padding: "3px 6px", borderRadius: 5, background: "none", border: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>

              ) : renamingId === ws.id ? (
                /* Inline rename */
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{ws.icon}</span>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(ws.id)
                      if (e.key === "Escape") setRenamingId(null)
                    }}
                    style={{ flex: 1, padding: "3px 6px", borderRadius: 5, border: "1px solid #6366f1", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 12, outline: "none" }}
                  />
                  <button
                    onClick={() => handleRename(ws.id)}
                    disabled={renameSaving || !renameValue.trim()}
                    style={{ padding: "4px 6px", borderRadius: 5, background: "#6366f1", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    {renameSaving ? <Loader2 size={10} /> : <Check size={10} />}
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    style={{ padding: "4px 5px", borderRadius: 5, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <X size={11} />
                  </button>
                </div>

              ) : (
                /* Normal row */
                <div style={{ display: "flex", alignItems: "center" }}>
                  <button
                    onClick={() => { setActiveWorkspace(ws.id); setOpen(false) }}
                    style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover, #252535)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{ws.icon}</span>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: ws.id === activeWorkspaceId ? 600 : 400, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ws.name}
                    </span>
                    {ws.id === activeWorkspaceId && <Check size={12} style={{ flexShrink: 0, color: "#6366f1" }} />}
                  </button>

                  {/* Hover actions */}
                  <div className="ws-actions" style={{ display: "flex", alignItems: "center", gap: 1, paddingRight: 8, opacity: 0, transition: "opacity 0.1s", flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRenamingId(ws.id); setRenameValue(ws.name) }}
                      title="Rename"
                      style={{ padding: "4px 5px", borderRadius: 5, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <Pencil size={11} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingId(ws.id) }}
                        title="Delete"
                        style={{ padding: "4px 5px", borderRadius: 5, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ height: 1, background: "var(--border-subtle)", margin: "2px 0" }} />

          {/* Create new workspace */}
          {creating ? (
            <div style={{ padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setNewIcon(ic)}
                    style={{ fontSize: 16, padding: "3px 5px", borderRadius: 6, border: ic === newIcon ? "1px solid #6366f1" : "1px solid transparent", background: ic === newIcon ? "rgba(99,102,241,0.15)" : "none", cursor: "pointer", lineHeight: 1 }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Workspace name…"
                style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={handleCreate}
                  disabled={saving || !newName.trim()}
                  style={{ flex: 1, padding: "5px 8px", borderRadius: 6, background: "#6366f1", border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: saving || !newName.trim() ? "not-allowed" : "pointer", opacity: saving || !newName.trim() ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  {saving && <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />}
                  Create
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName("") }}
                  style={{ padding: "5px 8px", borderRadius: 6, background: "none", border: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover, #252535)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <Plus size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>New workspace</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
