import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST assign a tag to a lead
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: leadId } = await params
  const { tagId } = await req.json()

  const { error } = await supabase
    .from("lead_tag_assignments")
    .insert({ lead_id: leadId, tag_id: tagId })

  if (error && error.code !== "23505") // ignore duplicate
    return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity
  await supabase.from("lead_activities").insert({
    user_id: user.id,
    lead_id: leadId,
    type: "tag_added",
    description: "Tag added",
    metadata: { tag_id: tagId },
  })

  return NextResponse.json({ success: true })
}

// DELETE remove a tag from a lead
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: leadId } = await params
  const { tagId } = await req.json()

  await supabase
    .from("lead_tag_assignments")
    .delete()
    .eq("lead_id", leadId)
    .eq("tag_id", tagId)

  await supabase.from("lead_activities").insert({
    user_id: user.id,
    lead_id: leadId,
    type: "tag_removed",
    description: "Tag removed",
    metadata: { tag_id: tagId },
  })

  return NextResponse.json({ success: true })
}
