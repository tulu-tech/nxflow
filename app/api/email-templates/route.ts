import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get("workspaceId")
  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId ?? "")
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  const { data, error } = await supabase
    .from("email_templates")
    .select("id, name, subject, body, is_html, created_at")
    .eq("workspace_id", wsId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, subject, body, is_html, workspaceId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId ?? "")
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      user_id: user.id,
      workspace_id: wsId,
      name: name.trim(),
      subject: subject ?? "",
      body: body ?? "",
      is_html: !!is_html,
    })
    .select("id, name, subject, body, is_html, created_at")
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

  const { name, subject, body, is_html } = await req.json()
  const update: Record<string, unknown> = {}
  if (name !== undefined) update.name = name.trim()
  if (subject !== undefined) update.subject = subject
  if (body !== undefined) update.body = body
  if (is_html !== undefined) update.is_html = !!is_html

  const { data, error } = await supabase
    .from("email_templates")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, subject, body, is_html, created_at")
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

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
