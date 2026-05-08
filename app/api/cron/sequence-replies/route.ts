import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get("authorization") === `Bearer ${secret}`
}

async function fetchGmailMessages(accessToken: string): Promise<{ id: string; from: string }[]> {
  try {
    // Search inbox for messages newer than 7 days
    const searchRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=newer_than:7d+in:inbox&maxResults=50",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const messageIds: string[] = (searchData.messages ?? []).map((m: { id: string }) => m.id)

    const results: { id: string; from: string }[] = []
    // Fetch headers for each message (metadata only — fast)
    await Promise.all(
      messageIds.slice(0, 30).map(async (id) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (!msgRes.ok) return
        const msg = await msgRes.json()
        const fromHeader = (msg.payload?.headers ?? []).find((h: { name: string }) => h.name === "From")
        const fromValue: string = fromHeader?.value ?? ""
        // Extract email from "Name <email@domain.com>" or bare "email@domain.com"
        const emailMatch = fromValue.match(/<([^>]+)>/) ?? fromValue.match(/^([^\s]+@[^\s]+)$/)
        if (emailMatch) results.push({ id, from: emailMatch[1].toLowerCase() })
      }),
    )
    return results
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = createServiceRoleClient()
  if ("error" in result) return NextResponse.json({ error: "Service role unavailable" }, { status: 500 })
  const { supabase } = result

  // Get all distinct user_ids with active enrollments
  const { data: activeEnrollments } = await supabase
    .from("sequence_enrollments")
    .select("user_id, lead_id, sequence_id, id")
    .eq("status", "active")

  if (!activeEnrollments || activeEnrollments.length === 0) {
    return NextResponse.json({ checked: 0, replied: 0 })
  }

  // Group by user_id
  const byUser = new Map<string, typeof activeEnrollments>()
  for (const e of activeEnrollments) {
    if (!byUser.has(e.user_id)) byUser.set(e.user_id, [])
    byUser.get(e.user_id)!.push(e)
  }

  // Fetch enrolled lead emails for quick lookup
  const allLeadIds = [...new Set(activeEnrollments.map((e: { lead_id: string }) => e.lead_id))]
  const { data: leads } = await supabase
    .from("leadboard")
    .select("id, email")
    .in("id", allLeadIds)

  const leadEmailMap = new Map<string, string>()
  for (const l of leads ?? []) {
    if (l.email) leadEmailMap.set(l.id, l.email.toLowerCase())
  }

  let replied = 0

  for (const [userId, enrollments] of byUser.entries()) {
    const { data: token } = await supabase
      .from("gmail_tokens")
      .select("access_token")
      .eq("user_id", userId)
      .limit(1)
      .single()

    if (!token?.access_token) continue

    const messages = await fetchGmailMessages(token.access_token)
    if (messages.length === 0) continue

    const inboxFromEmails = new Set(messages.map((m) => m.from))

    for (const enrollment of enrollments) {
      const leadEmail = leadEmailMap.get(enrollment.lead_id)
      if (!leadEmail) continue
      if (inboxFromEmails.has(leadEmail)) {
        await supabase
          .from("sequence_enrollments")
          .update({ status: "replied" })
          .eq("id", enrollment.id)
        replied++
      }
    }
  }

  return NextResponse.json({ checked: activeEnrollments.length, replied })
}
