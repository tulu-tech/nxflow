import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: leadId } = await params
  const { remindAt, note } = await req.json()

  const { data, error } = await supabase
    .from("follow_up_reminders")
    .insert({ user_id: user.id, lead_id: leadId, remind_at: remindAt, note })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("lead_activities").insert({
    user_id: user.id,
    lead_id: leadId,
    type: "manual",
    description: `Follow-up reminder set for ${new Date(remindAt).toLocaleDateString()}`,
  })

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: leadId } = await params
  await supabase
    .from("follow_up_reminders")
    .update({ is_done: true })
    .eq("lead_id", leadId)
    .eq("user_id", user.id)
    .eq("is_done", false)

  return NextResponse.json({ success: true })
}
