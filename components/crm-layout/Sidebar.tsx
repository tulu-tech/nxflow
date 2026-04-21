"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Search,
  Target,
  Send,
  MessageSquare,
  Settings,
  LogOut,
  GitBranch,
  ArrowLeft,
  Bookmark,
  Newspaper,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

interface NavSection {
  label: string | null
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Prospecting",
    items: [
      { href: "/prospecting", label: "Prospecting", icon: Search },
      { href: "/saved-searches", label: "Saved Searches", icon: Bookmark },
      { href: "/leadboard", label: "Leadboard", icon: Target },
    ],
  },
  {
    label: "Outreach",
    items: [
      { href: "/outreach", label: "Outreach", icon: Send },
      { href: "/outreach/sequences", label: "Sequences", icon: GitBranch },
      { href: "/responses", label: "Responses", icon: MessageSquare },
    ],
  },
  {
    label: "Intelligence",
    items: [{ href: "/news", label: "News Feed", icon: Newspaper }],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
]

interface SidebarProps {
  userEmail?: string
  userName?: string
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? "A"

  return (
    <aside
      style={{
        width: "220px",
        flexShrink: 0,
        background: "var(--bg-base)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "14px 16px 10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Target size={14} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13.5,
              color: "var(--text-primary)",
              letterSpacing: "-0.2px",
              lineHeight: 1.2,
            }}
          >
            Alba Collective
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              lineHeight: 1.3,
            }}
          >
            CRM
          </div>
        </div>
      </div>

      {/* Back link */}
      <div style={{ padding: "6px 8px 2px" }}>
        <div
          className="sidebar-item"
          onClick={() => router.push("/")}
          style={{ gap: 8, color: "var(--text-muted)", fontSize: 12 }}
        >
          <ArrowLeft size={13} />
          <span>Back to NXFlow</span>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />

      {/* Nav sections */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 8px" }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: section.label ? 14 : 6 }}>
            {section.label && (
              <div
                style={{
                  padding: "4px 10px 6px",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className={`sidebar-item${active ? " active" : ""}`}
                    style={{ gap: 8 }}
                  >
                    <Icon size={14} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* User footer */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userName || userEmail || "User"}
            </div>
            {userName && userEmail && (
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userEmail}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 2,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#e2445c"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
