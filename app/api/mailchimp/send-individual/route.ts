import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

async function sendViaGmail(accessToken: string, from: string, to: string, subject: string, body: string) {
  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ]
  const encoded = Buffer.from(emailLines.join("\r\n")).toString("base64url")

  return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { to, subject, body, leadId } = await req.json()
  if (!to || !subject || !body) {
    return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 })
  }

  // Try Gmail API with stored token
  const { data: gmailToken } = await supabase
    .from("gmail_tokens")
    .select("access_token, refresh_token, expires_at, email")
    .eq("user_id", user.id)
    .single()

  if (!gmailToken?.access_token) {
    return NextResponse.json(
      { error: "Gmail not connected. Go to Settings → API & Credits to connect Gmail." },
      { status: 400 }
    )
  }

  const fromEmail = gmailToken.email ?? user.email ?? "me"

  // First attempt
  let gmailRes = await sendViaGmail(gmailToken.access_token, fromEmail, to, subject, body)

  // If 401 and we have a refresh token, try refreshing
  if (gmailRes.status === 401 && gmailToken.refresh_token) {
    const newAccessToken = await refreshGmailToken(gmailToken.refresh_token)
    if (newAccessToken) {
      // Save refreshed token
      await supabase
        .from("gmail_tokens")
        .update({ access_token: newAccessToken, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)

      // Retry with fresh token
      gmailRes = await sendViaGmail(newAccessToken, fromEmail, to, subject, body)
    }
  }

  if (!gmailRes.ok) {
    const err = await gmailRes.json().catch(() => null)
    const message = err?.error?.message ?? `Gmail send failed (HTTP ${gmailRes.status})`

    // Token is permanently invalid — delete it so user knows to reconnect
    if (gmailRes.status === 401) {
      await supabase.from("gmail_tokens").delete().eq("user_id", user.id)
      return NextResponse.json(
        { error: "Gmail session expired. Please reconnect Gmail in Settings → API & Credits." },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Update lead last_contacted_at
  if (leadId) {
    await supabase
      .from("leadboard")
      .update({ last_contacted_at: new Date().toISOString(), status: "contacted" })
      .eq("id", leadId)
      .eq("user_id", user.id)
  }

  // Log send
  await supabase.from("credit_usage").insert({
    user_id: user.id,
    type: "mailchimp_send",
    amount: 1,
    metadata: { to, lead_id: leadId, method: "gmail" },
  })

  return NextResponse.json({ success: true })
}
