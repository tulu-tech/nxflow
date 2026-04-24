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

  const { campaignId, recipientIds, fromEmail, isHtml } = await req.json()
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 })

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  // Prefer Gmail when connected. The user's auth email (e.g. berat@alba.com)
  // won't be a verified Mailchimp sender, so Mailchimp's send API would reject
  // with "Your Campaign is not ready to send. address(es) - ..."
  let tokenQuery = supabase
    .from("gmail_tokens")
    .select("id, access_token, refresh_token, email")
    .eq("user_id", user.id)
  if (fromEmail) tokenQuery = tokenQuery.eq("email", fromEmail)

  const { data: gmailTokens } = await tokenQuery.limit(1)
  const gmailToken = gmailTokens?.[0]

  if (gmailToken?.access_token) {
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json({ error: "No recipients selected" }, { status: 400 })
    }

    const { data: leads } = await supabase
      .from("leadboard")
      .select("id, email, full_name")
      .in("id", recipientIds)
      .eq("user_id", user.id)

    const targets = (leads ?? []).filter((l) => l.email)
    if (targets.length === 0) {
      return NextResponse.json({ error: "No valid recipient emails found" }, { status: 400 })
    }

    const fromAddr = gmailToken.email ?? user.email ?? "me"
    const subject = campaign.subject ?? campaign.name
    const body = campaign.body ?? ""

    let accessToken = gmailToken.access_token
    let sent = 0
    const failures: { email: string; reason: string }[] = []

    for (const lead of targets) {
      let res = await sendViaGmail(accessToken, fromAddr, lead.email, subject, body, !!isHtml)

      if (res.status === 401 && gmailToken.refresh_token) {
        const fresh = await refreshGmailToken(gmailToken.refresh_token)
        if (fresh) {
          accessToken = fresh
          await supabase
            .from("gmail_tokens")
            .update({ access_token: fresh, updated_at: new Date().toISOString() })
            .eq("id", gmailToken.id)
          res = await sendViaGmail(accessToken, fromAddr, lead.email, subject, body, !!isHtml)
        }
      }

      if (res.ok) {
        sent++
        await supabase
          .from("leadboard")
          .update({ last_contacted_at: new Date().toISOString(), status: "contacted" })
          .eq("id", lead.id)
          .eq("user_id", user.id)
      } else {
        const err = await res.json().catch(() => null)
        failures.push({
          email: lead.email,
          reason: err?.error?.message ?? `HTTP ${res.status}`,
        })
      }
    }

    if (sent === 0) {
      return NextResponse.json(
        { error: `All sends failed via Gmail. First: ${failures[0]?.reason ?? "unknown"}` },
        { status: 400 },
      )
    }

    await supabase
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: sent,
      })
      .eq("id", campaignId)

    await supabase.from("credit_usage").insert({
      user_id: user.id,
      type: "mailchimp_send",
      amount: sent,
      metadata: { campaign_id: campaignId, method: "gmail", from: fromAddr, failures: failures.length },
    })

    return NextResponse.json({ success: true, sent, failed: failures.length, failures })
  }

  // Fall back to Mailchimp
  if (!campaign.mailchimp_campaign_id) {
    return NextResponse.json(
      { error: "Gmail not connected and campaign not synced to Mailchimp. Connect Gmail in Settings → API & Credits." },
      { status: 400 },
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("mailchimp_api_key, mailchimp_server_prefix")
    .eq("id", user.id)
    .single()

  if (!profile?.mailchimp_api_key || !profile?.mailchimp_server_prefix) {
    return NextResponse.json({ error: "Mailchimp not configured" }, { status: 400 })
  }

  const sendRes = await fetch(
    `https://${profile.mailchimp_server_prefix}.api.mailchimp.com/3.0/campaigns/${campaign.mailchimp_campaign_id}/actions/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${profile.mailchimp_api_key}`).toString("base64")}`,
      },
    },
  )

  if (!sendRes.ok) {
    const err = await sendRes.json()
    return NextResponse.json({ error: err.detail ?? "Send failed" }, { status: 400 })
  }

  await supabase
    .from("email_campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", campaignId)

  await supabase.from("credit_usage").insert({
    user_id: user.id,
    type: "mailchimp_send",
    amount: campaign.recipient_count ?? 1,
    metadata: { campaign_id: campaignId, method: "mailchimp" },
  })

  return NextResponse.json({ success: true })
}
