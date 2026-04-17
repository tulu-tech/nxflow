import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/crm-layout/Sidebar"

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, theme")
    .eq("id", user.id)
    .single()

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <Sidebar
        userEmail={user.email}
        userName={profile?.full_name ?? undefined}
      />
      <main
        style={{
          flex: 1,
          overflow: "auto",
          background: "var(--bg-surface)",
        }}
      >
        {children}
      </main>
    </div>
  )
}
