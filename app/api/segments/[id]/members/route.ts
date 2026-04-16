import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/segments/[id]/members — assign a lead to this segment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: segmentId } = await params
  const { leadId } = await req.json()

  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 })

  // Verify segment belongs to user
  const { data: seg } = await supabase
    .from("smart_segments")
    .select("id")
    .eq("id", segmentId)
    .eq("user_id", user.id)
    .single()

  if (!seg) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

  const { error } = await supabase
    .from("lead_segment_assignments")
    .insert({ lead_id: leadId, segment_id: segmentId })

  if (error && error.code !== "23505") { // ignore unique violation
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/segments/[id]/members — remove a lead from this segment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: segmentId } = await params
  const { leadId } = await req.json()

  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 })

  // Verify segment belongs to user
  const { data: seg } = await supabase
    .from("smart_segments")
    .select("id")
    .eq("id", segmentId)
    .eq("user_id", user.id)
    .single()

  if (!seg) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

  await supabase
    .from("lead_segment_assignments")
    .delete()
    .eq("lead_id", leadId)
    .eq("segment_id", segmentId)

  return NextResponse.json({ ok: true })
}

// GET /api/segments/[id]/members — list lead IDs in this segment
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: segmentId } = await params

  // Verify segment belongs to user
  const { data: seg } = await supabase
    .from("smart_segments")
    .select("id")
    .eq("id", segmentId)
    .eq("user_id", user.id)
    .single()

  if (!seg) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

  const { data } = await supabase
    .from("lead_segment_assignments")
    .select("lead_id")
    .eq("segment_id", segmentId)

  return NextResponse.json((data ?? []).map((r) => r.lead_id))
}
