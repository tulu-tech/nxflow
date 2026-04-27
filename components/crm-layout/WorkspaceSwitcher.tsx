"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Plus, Loader2 } from "lucide-react"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"
import type { CrmWorkspace } from "@/store/crmWorkspaceStore"

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, setWorkspaces } = useCrmWorkspaceStore()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState("🎯")
  const [saving, setSaving] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
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

  if (!active) return null

  const ICONS = ["🏢", "🎯", "🚀", "⚡", "🛡️", "💼", "🌍", "🔮"]

  return (
    <div ref={dropdownRef} style={{ position: "relative", padding: "6px 8px" }}>
      {/* Trigger */}
      <button
        onClick={() => { setOpen((o) => !o); setCreating(false) }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 8,
          background: "var(--bg-raised, #1e1e2e)",
          border: "1px solid var(--border-subtle)",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover, #252535)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-raised, #1e1e2e)")}
      >
        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{active.icon}</span>
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {active.name}
        </span>
        <ChevronDown
          size={13}
          style={{
            flexShrink: 0,
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 8,
            right: 8,
            zIndex: 100,
            background: "var(--bg-raised, #1e1e2e)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          {/* Workspace list */}
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => { setActiveWorkspace(ws.id); setOpen(false) }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "background 0.1s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover, #252535)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{ws.icon}</span>
              <span
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  fontWeight: ws.id === activeWorkspaceId ? 600 : 400,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ws.name}
              </span>
              {ws.id === activeWorkspaceId && (
                <Check size={12} style={{ flexShrink: 0, color: "#6366f1" }} />
              )}
            </button>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border-subtle)", margin: "2px 0" }} />

          {/* Create new workspace */}
          {creating ? (
            <div style={{ padding: "10px 12px" }}>
              {/* Icon picker */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setNewIcon(ic)}
                    style={{
                      fontSize: 16,
                      padding: "3px 5px",
                      borderRadius: 6,
                      border: ic === newIcon ? "1px solid #6366f1" : "1px solid transparent",
                      background: ic === newIcon ? "rgba(99,102,241,0.15)" : "none",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
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
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  outline: "none",
                  marginBottom: 6,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={handleCreate}
                  disabled={saving || !newName.trim()}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    borderRadius: 6,
                    background: "#6366f1",
                    border: "none",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: saving || !newName.trim() ? "not-allowed" : "pointer",
                    opacity: saving || !newName.trim() ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  {saving ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : null}
                  Create
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName("") }}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 6,
                    background: "none",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
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
