import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"
import type { MatchedEmail } from "@/types"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { workspaceId } = await req.json()
  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  // Get Gmail token
  const { data: gmailToken } = await supabase
    .from("gmail_tokens")
    .select("access_token, expires_at")
    .eq("user_id", user.id)
    .eq("workspace_id", wsId)
    .single()

  if (!gmailToken?.access_token) {
    return NextResponse.json({ error: "Gmail not connected. Connect Gmail in Settings." }, { status: 400 })
  }

  // Get active response rules
  const { data: rules } = await supabase
    .from("response_rules")
    .select("*")
    .eq("user_id", user.id)
    .eq("workspace_id", wsId)
    .eq("is_active", true)

  if (!rules?.length) {
    return NextResponse.json({ matches: [], message: "No active response rules." })
  }

  // Fetch recent inbox messages
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=50",
    {
      headers: { Authorization: `Bearer ${gmailToken.access_token}` },
    }
  )

  if (!listRes.ok) {
    return NextResponse.json({ error: "Failed to fetch Gmail messages" }, { status: 400 })
  }

  const listData = await listRes.json()
  const messageIds: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id)

  const matches: MatchedEmail[] = []

  // Fetch message details in batches of 10
  for (const msgId of messageIds.slice(0, 30)) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
      { headers: { Authorization: `Bearer ${gmailToken.access_token}` } }
    )
    if (!msgRes.ok) continue

    const msg = await msgRes.json()

    const headers = msg.payload?.headers ?? []
    const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value ?? ""
    const from = headers.find((h: { name: string }) => h.name === "From")?.value ?? ""
    const snippet = msg.snippet ?? ""

    // Extract body text
    let bodyText = snippet
    const parts = msg.payload?.parts ?? []
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        bodyText = Buffer.from(part.body.data, "base64").toString("utf-8")
        break
      }
    }

    const combinedText = `${subject} ${bodyText}`.toLowerCase()

    // Check against each rule
    for (const rule of rules) {
      const matchedKeywords = rule.keywords.filter((kw: string) =>
        combinedText.includes(kw.toLowerCase())
      )
      if (matchedKeywords.length > 0) {
        matches.push({
          messageId: msgId,
          subject,
          from,
          snippet,
          body: bodyText,
          matchedRuleId: rule.id,
          matchedRuleName: rule.rule_name,
          matchedKeywords,
        })
        break // Only match first rule per email
      }
    }
  }

  return NextResponse.json({ matches })
}
