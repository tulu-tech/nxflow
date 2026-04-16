import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("sequences")
    .select("*, sequence_steps(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, steps } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const { data: seq, error } = await supabase
    .from("sequences")
    .insert({ user_id: user.id, name: name.trim(), description })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (steps?.length) {
    const stepRows = steps.map((s: { subject: string; body: string; delay_days: number }, i: number) => ({
      sequence_id: seq.id,
      step_number: i + 1,
      subject: s.subject,
      body: s.body,
      delay_days: s.delay_days ?? 0,
    }))
    await supabase.from("sequence_steps").insert(stepRows)
  }

  return NextResponse.json(seq)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  await supabase.from("sequences").delete().eq("id", id).eq("user_id", user.id)
  return NextResponse.json({ success: true })
}
