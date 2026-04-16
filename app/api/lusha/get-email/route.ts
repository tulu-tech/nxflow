import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("lusha_api_key")
    .eq("id", user.id)
    .single()

  if (!profile?.lusha_api_key) {
    return NextResponse.json({ error: "Lusha API key not configured" }, { status: 400 })
  }

  const { lushaPersonId, prospectId, prospectData, requestId } = await req.json()

  let email: string | null = null
  let isMock = false

  // ── Mock mode ───────────────────────────────────────────────────────────────
  if (lushaPersonId.startsWith("mock-")) {
    isMock = true
    const name    = (prospectData?.fullName ?? "user") as string
    const company = (prospectData?.company  ?? "company") as string
    const [first, last] = name.toLowerCase().replace(/[^a-z ]/g, "").split(" ")
    const domain  = company.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) + ".com"
    email = `${first ?? "user"}.${last ?? "x"}@${domain}`

  // ── Real Lusha enrichment ────────────────────────────────────────────────────
  } else {
    try {
      const enrichBody: Record<string, unknown> = {
        contactIds: [lushaPersonId],
      }
      // requestId is required to tie enrich back to the originating search
      if (requestId) enrichBody.requestId = requestId

      const lushaRes = await fetch("https://api.lusha.com/prospecting/contact/enrich", {
        method: "POST",
        headers: {
          "x-api-key": profile.lusha_api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(enrichBody),
      })

      if (lushaRes.ok) {
        const data = await lushaRes.json()
        // Lusha returns an array of enriched contacts
        const contact = Array.isArray(data.contacts)
          ? data.contacts[0]
          : data.contacts?.[lushaPersonId]

        // Try multiple possible response shapes
        email =
          contact?.data?.emailAddresses?.[0]?.email ??
          contact?.data?.workEmail ??
          contact?.emailAddresses?.[0]?.email ??
          contact?.email ??
          null
      } else {
        const errText = await lushaRes.text()
        console.error("Lusha enrich error:", lushaRes.status, errText)
      }
    } catch (err) {
      console.error("Lusha enrich network error:", err)
    }
  }

  if (!email) {
    return NextResponse.json({ error: "Could not retrieve email for this contact" }, { status: 404 })
  }

  // ── Persist to DB ────────────────────────────────────────────────────────────
  if (prospectId) {
    await supabase
      .from("prospects")
      .update({
        email,
        email_fetched_at: new Date().toISOString(),
        credits_used: 1,
      })
      .eq("id", prospectId)
  }

  // Log credit usage (only for real API calls)
  if (!isMock) {
    await supabase.from("credit_usage").insert({
      user_id: user.id,
      type:    "lusha_email",
      amount:  1,
      metadata: { lusha_person_id: lushaPersonId, prospect_id: prospectId ?? null },
    })
  }

  return NextResponse.json({ email, mock: isMock })
}
