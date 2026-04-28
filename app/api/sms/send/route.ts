import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"

function fillMergeTags(template: string, lead: { full_name: string; company?: string | null; email?: string | null; phone?: string | null }) {
  const parts = lead.full_name.trim().split(/\s+/)
  return template
    .replace(/\{\{first_name\}\}/gi, parts[0] ?? "")
    .replace(/\{\{last_name\}\}/gi, parts.slice(1).join(" "))
    .replace(/\{\{full_name\}\}/gi, lead.full_name)
    .replace(/\{\{company\}\}/gi, lead.company ?? "")
    .replace(/\{\{email\}\}/gi, lead.email ?? "")
    .replace(/\{\{phone\}\}/gi, lead.phone ?? "")
}

async function sendTwilioSMS(
  accountSid: string,
  authUser: string,  // accountSid or apiKeySid
  authPass: string,  // authToken or apiKeySecret
  from: string,
  to: string,
  body: string,
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const credentials = Buffer.from(`${authUser}:${authPass}`).toString("base64")

  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { recipientIds, message, campName, workspaceId } = await req.json()

  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 })
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return NextResponse.json({ error: "No recipients selected" }, { status: 400 })
  }

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  // Load Twilio credentials
  const { data: twilio } = await supabase
    .from("twilio_config")
    .select("account_sid, auth_token, phone_number, api_key_sid")
    .eq("user_id", user.id)
    .eq("workspace_id", wsId)
    .single()

  if (!twilio?.account_sid || !twilio?.auth_token || !twilio?.phone_number) {
    return NextResponse.json(
      { error: "Twilio is not configured. Go to Settings → API & Credits to set up Twilio." },
      { status: 400 }
    )
  }

  // Determine auth method
  // API Key auth: api_key_sid (SK...) as username, auth_token (API Key Secret) as password
  // Classic auth: account_sid (AC...) as username, auth_token as password
  const authUser = twilio.api_key_sid ?? twilio.account_sid
  const authPass = twilio.auth_token

  // Load leads with phone numbers
  const { data: leads } = await supabase
    .from("leadboard")
    .select("id, full_name, email, company, phone")
    .in("id", recipientIds)
    .eq("workspace_id", wsId)
    .not("phone", "is", null)

  const targets = (leads ?? []).filter((l) => l.phone?.trim())

  if (targets.length === 0) {
    return NextResponse.json(
      { error: "None of the selected leads have a phone number. Add phone numbers in Leadboard." },
      { status: 400 }
    )
  }

  let sent = 0
  const failures: { name: string; phone: string; reason: string }[] = []

  for (const lead of targets) {
    const personalizedMsg = fillMergeTags(message, lead)

    try {
      const res = await sendTwilioSMS(
        twilio.account_sid,
        authUser,
        authPass,
        twilio.phone_number,
        lead.phone!,
        personalizedMsg,
      )

      if (res.ok) {
        sent++
        // Mark lead as contacted
        await supabase
          .from("leadboard")
          .update({ last_contacted_at: new Date().toISOString(), status: "contacted" })
          .eq("id", lead.id)
      } else {
        const err = await res.json().catch(() => null)
        const reason = err?.message ?? `HTTP ${res.status}`
        failures.push({ name: lead.full_name, phone: lead.phone!, reason })
      }
    } catch (e) {
      failures.push({ name: lead.full_name, phone: lead.phone!, reason: String(e) })
    }
  }

  // Log credit usage
  if (sent > 0) {
    await supabase.from("credit_usage").insert({
      user_id: user.id,
      workspace_id: wsId,
      type: "sms_send",
      amount: sent,
      metadata: { camp_name: campName, sent, failed: failures.length },
    })
  }

  if (sent === 0) {
    return NextResponse.json(
      { error: `All sends failed. First error: ${failures[0]?.reason ?? "unknown"}`, failures },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    sent,
    failed: failures.length,
    skipped: recipientIds.length - targets.length,
    failures,
  })
}
