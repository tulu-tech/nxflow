import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"

export const dynamic = "force-dynamic"

// GET /api/groups?workspaceId=
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get("workspaceId")
  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  const { data } = await supabase
    .from("lead_groups")
    .select("id, name, color, position")
    .eq("user_id", user.id)
    .eq("workspace_id", wsId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  return NextResponse.json(data ?? [])
}

// POST /api/groups — create a new group
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, color, workspaceId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  // Put new group at the end
  const { data: last } = await supabase
    .from("lead_groups")
    .select("position")
    .eq("workspace_id", wsId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const position = (last?.position ?? -1) + 1

  const { data, error } = await supabase
    .from("lead_groups")
    .insert({ user_id: user.id, workspace_id: wsId, name: name.trim(), color: color ?? "#6366f1", position })
    .select("id, name, color, position")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
