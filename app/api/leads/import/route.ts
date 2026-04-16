import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { rows } = await req.json()
  // rows: Array<{ full_name, email, company?, position?, notes? }>

  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "No rows provided" }, { status: 400 })

  // Fetch existing emails to detect duplicates
  const emails = rows.map((r) => r.email?.toLowerCase()).filter(Boolean)
  const { data: existing } = await supabase
    .from("leadboard")
    .select("email")
    .eq("user_id", user.id)
    .in("email", emails)

  const existingEmails = new Set((existing ?? []).map((e) => e.email?.toLowerCase()))

  const toInsert: Record<string, unknown>[] = []
  const duplicates: string[] = []

  for (const row of rows) {
    const email = row.email?.toLowerCase()?.trim()
    if (!email || !row.full_name?.trim()) continue
    if (existingEmails.has(email)) {
      duplicates.push(email)
      continue
    }
    toInsert.push({
      user_id: user.id,
      full_name: row.full_name.trim(),
      email,
      company:  row.company?.trim()  || null,
      position: row.position?.trim() || null,
      notes:    row.notes?.trim()    || null,
      status:   "new",
      relevance_score: 0,
    })
  }

  let inserted = 0
  if (toInsert.length > 0) {
    const { data: insertedRows, error } = await supabase
      .from("leadboard")
      .insert(toInsert)
      .select("id")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted = insertedRows?.length ?? 0

    // Log activity for each imported lead
    for (const row of insertedRows ?? []) {
      await supabase.from("lead_activities").insert({
        user_id: user.id,
        lead_id: row.id,
        type: "added",
        description: "Imported from CSV",
      })
    }
  }

  return NextResponse.json({ inserted, duplicates, skipped: duplicates.length })
}
