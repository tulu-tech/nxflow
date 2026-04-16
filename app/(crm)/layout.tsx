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
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex shrink-0">
        <Sidebar
          userEmail={user.email}
          userName={profile?.full_name ?? undefined}
        />
      </aside>
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
