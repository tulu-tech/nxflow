import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { full_name, email, company, position, notes } = await req.json()

  if (!full_name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  if (!email?.trim())     return NextResponse.json({ error: "Email is required" }, { status: 400 })

  // Duplicate check
  const { data: existing } = await supabase
    .from("leadboard")
    .select("id, full_name")
    .eq("user_id", user.id)
    .eq("email", email.toLowerCase().trim())
    .single()

  if (existing) {
    return NextResponse.json(
      { error: "duplicate", existingId: existing.id, existingName: existing.full_name },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from("leadboard")
    .insert({
      user_id: user.id,
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      company:  company?.trim()  || null,
      position: position?.trim() || null,
      notes:    notes?.trim()    || null,
      status: "new",
      relevance_score: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("lead_activities").insert({
    user_id: user.id,
    lead_id: data.id,
    type: "added",
    description: "Manually added to Leadboard",
  })

  return NextResponse.json(data)
}
