import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { leadIds, sequenceId } = await req.json()
  if (!leadIds?.length || !sequenceId)
    return NextResponse.json({ error: "leadIds and sequenceId required" }, { status: 400 })

  // Get first step to set next_send_at
  const { data: firstStep } = await supabase
    .from("sequence_steps")
    .select("delay_days")
    .eq("sequence_id", sequenceId)
    .order("step_number")
    .limit(1)
    .single()

  const delayDays = firstStep?.delay_days ?? 0
  const nextSendAt = new Date()
  nextSendAt.setDate(nextSendAt.getDate() + delayDays)

  const rows = leadIds.map((id: string) => ({
    user_id: user.id,
    lead_id: id,
    sequence_id: sequenceId,
    current_step: 0,
    status: "active",
    next_send_at: nextSendAt.toISOString(),
  }))

  const { error } = await supabase
    .from("sequence_enrollments")
    .upsert(rows, { onConflict: "lead_id,sequence_id" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const id of leadIds) {
    await supabase.from("lead_activities").insert({
      user_id: user.id,
      lead_id: id,
      type: "manual",
      description: "Enrolled in email sequence",
      metadata: { sequence_id: sequenceId },
    })
  }

  return NextResponse.json({ success: true, enrolled: leadIds.length })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const enrollmentId = req.nextUrl.searchParams.get("enrollmentId")
  if (!enrollmentId) return NextResponse.json({ error: "enrollmentId required" }, { status: 400 })

  // Verify ownership via user_id before deleting
  const { error } = await supabase
    .from("sequence_enrollments")
    .delete()
    .eq("id", enrollmentId)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
