import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"
import { injectTracking } from "@/lib/email-tracking"

async function refreshGmailToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token ?? null
  } catch {
    return null
  }
}

async function sendViaGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  body: string,
  isHtml = false,
) {
  const contentType = isHtml ? "text/html; charset=utf-8" : "text/plain; charset=utf-8"
  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${contentType}`,
    ``,
    body,
  ]
  const encoded = Buffer.from(emailLines.join("\r\n")).toString("base64url")

  return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { to, subject, body, leadId, fromEmail, isHtml, workspaceId } = await req.json()
  if (!to || !subject || !body) {
    return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 })
  }

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  // Look up specified Gmail account, or first connected if none specified
  let tokenQuery = supabase
    .from("gmail_tokens")
    .select("id, access_token, refresh_token, expires_at, email")
    .eq("user_id", user.id)

  if (fromEmail) tokenQuery = tokenQuery.eq("email", fromEmail)

  const { data: gmailToken } = await tokenQuery.limit(1).single()

  if (!gmailToken?.access_token) {
    return NextResponse.json(
      { error: "Gmail not connected. Go to Settings → API & Credits to connect Gmail." },
      { status: 400 },
    )
  }

  const fromAddr = gmailToken.email ?? user.email ?? "me"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

  // Insert the log row BEFORE sending so we have an ID to embed in tracking URLs
  const { data: logRow } = await supabase
    .from("email_logs")
    .insert({
      user_id: user.id,
      workspace_id: wsId,
      lead_id: leadId ?? null,
      from_email: fromAddr,
      to_email: to,
      subject: subject ?? null,
      body: body ?? null,
      is_html: !!isHtml,
    })
    .select("id")
    .single()

  // Inject tracking pixel + rewrite links for HTML emails
  const finalBody =
    isHtml && logRow?.id && appUrl
      ? injectTracking(body, logRow.id, appUrl)
      : body

  let gmailRes = await sendViaGmail(gmailToken.access_token, fromAddr, to, subject, finalBody, !!isHtml)

  // 401 → try token refresh
  if (gmailRes.status === 401 && gmailToken.refresh_token) {
    const newAccessToken = await refreshGmailToken(gmailToken.refresh_token)
    if (newAccessToken) {
      await supabase
        .from("gmail_tokens")
        .update({ access_token: newAccessToken, updated_at: new Date().toISOString() })
        .eq("id", gmailToken.id)
      gmailRes = await sendViaGmail(newAccessToken, fromAddr, to, subject, finalBody, !!isHtml)
    }
  }

  if (!gmailRes.ok) {
    const err = await gmailRes.json().catch(() => null)
    const message = err?.error?.message ?? `Gmail send failed (HTTP ${gmailRes.status})`
    if (gmailRes.status === 401) {
      await supabase.from("gmail_tokens").delete().eq("id", gmailToken.id)
      return NextResponse.json(
        { error: "Gmail session expired. Please reconnect Gmail in Settings → API & Credits." },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (leadId) {
    await supabase
      .from("leadboard")
      .update({ last_contacted_at: new Date().toISOString(), status: "contacted" })
      .eq("id", leadId)
      .eq("user_id", user.id)
  }

  await supabase.from("credit_usage").insert({
    user_id: user.id,
    workspace_id: wsId,
    type: "mailchimp_send",
    amount: 1,
    metadata: { to, lead_id: leadId, method: "gmail", from: fromAddr },
  })

  return NextResponse.json({ success: true })
}
