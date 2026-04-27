import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { emailBody, emailSubject, fromEmail, ruleId, workspaceId } = await req.json()

  if (!emailBody || !ruleId) {
    return NextResponse.json({ error: "emailBody and ruleId are required" }, { status: 400 })
  }

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  // Fetch the rule
  const { data: rule } = await supabase
    .from("response_rules")
    .select("*")
    .eq("id", ruleId)
    .eq("user_id", user.id)
    .eq("workspace_id", wsId)
    .single()

  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 })

  const prompt = `${rule.claude_prompt}

---

You received the following email:
From: ${fromEmail ?? "Unknown"}
Subject: ${emailSubject ?? "No subject"}

Email body:
${emailBody}

---

Write a professional, personalized reply email. Do not include subject line or headers — just the email body text.
Sign off with best regards from "Alba Collective Team".`

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  })

  const draft = res.content[0].type === "text" ? res.content[0].text : ""

  // Log token usage
  const tokens = (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0)
  await supabase.from("credit_usage").insert({
    user_id: user.id,
    workspace_id: wsId,
    type: "claude_tokens",
    amount: tokens,
    metadata: { rule_id: ruleId, action: "response_draft" },
  })

  // Auto-send if rule has auto_send enabled
  if (rule.auto_send) {
    const { data: gmailToken } = await supabase
      .from("gmail_tokens")
      .select("access_token, email")
      .eq("user_id", user.id)
      .eq("workspace_id", wsId)
      .single()

    if (gmailToken?.access_token && fromEmail) {
      const reSubject = emailSubject?.startsWith("Re:") ? emailSubject : `Re: ${emailSubject ?? ""}`
      const rawEmail = [
        `From: ${gmailToken.email ?? user.email}`,
        `To: ${fromEmail}`,
        `Subject: ${reSubject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        draft,
      ].join("\r\n")

      const encoded = Buffer.from(rawEmail).toString("base64url")
      await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gmailToken.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      })

      return NextResponse.json({ draft, autoSent: true })
    }
  }

  return NextResponse.json({ draft, autoSent: false })
}
