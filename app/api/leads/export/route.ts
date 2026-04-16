import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { leadIds } = body // optional: export specific leads

  let query = supabase
    .from("leadboard")
    .select("full_name, email, company, position, relevance_score, status, notes, created_at")
    .eq("user_id", user.id)
    .order("relevance_score", { ascending: false })

  if (leadIds?.length) query = query.in("id", leadIds)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build CSV
  const headers = ["Name", "Email", "Company", "Position", "Score", "Status", "Notes", "Added On"]
  const csvRows = [
    headers.join(","),
    ...(data ?? []).map((row) =>
      [
        `"${(row.full_name ?? "").replace(/"/g, '""')}"`,
        `"${(row.email ?? "").replace(/"/g, '""')}"`,
        `"${(row.company ?? "").replace(/"/g, '""')}"`,
        `"${(row.position ?? "").replace(/"/g, '""')}"`,
        row.relevance_score ?? 0,
        row.status ?? "",
        `"${(row.notes ?? "").replace(/"/g, '""')}"`,
        row.created_at ? new Date(row.created_at).toLocaleDateString() : "",
      ].join(",")
    ),
  ]

  const csv = csvRows.join("\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leadboard-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
