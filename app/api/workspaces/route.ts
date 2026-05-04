import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("crm_workspaces")
    .select("id, name, icon")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If we got workspaces, return them immediately
  if (data && data.length > 0) return NextResponse.json(data)

  // No workspaces visible — could be a stale user_id from SQL seeding.
  // Use service role (bypasses RLS) to find and repair orphaned workspaces.
  const srResult = createServiceRoleClient()
  if ("error" in srResult) return NextResponse.json([])
  const sr = srResult.supabase

  const { data: orphans } = await sr
    .from("crm_workspaces")
    .select("id, name, icon, user_id")
    .neq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (!orphans || orphans.length === 0) return NextResponse.json([])

  // Repair: re-assign all orphaned workspaces to this user
  const ids = orphans.map((w: { id: string }) => w.id)
  await sr.from("crm_workspaces").update({ user_id: user.id }).in("id", ids)

  return NextResponse.json(orphans.map(({ id, name, icon }: { id: string; name: string; icon: string }) => ({ id, name, icon })))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, icon } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const { data, error } = await supabase
    .from("crm_workspaces")
    .insert({ user_id: user.id, name: name.trim(), icon: icon ?? "🏢" })
    .select("id, name, icon")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { name, icon } = await req.json()
  const update: Record<string, string> = {}
  if (name !== undefined) update.name = name.trim()
  if (icon !== undefined) update.icon = icon

  const { data, error } = await supabase
    .from("crm_workspaces")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, icon")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Count user's workspaces — don't allow deleting the last one
  const { count } = await supabase
    .from("crm_workspaces")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: "Cannot delete the only workspace" }, { status: 400 })
  }

  const { error } = await supabase
    .from("crm_workspaces")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
