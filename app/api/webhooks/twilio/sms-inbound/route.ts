import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"
import { validateTwilioWebhook, parseTwilioBody } from "@/lib/twilio-webhook"

export const dynamic = "force-dynamic"

// Twilio calls this when an SMS is received on your Twilio number.
// Configure in Twilio Console → Phone Numbers → [your number] → Messaging → A message comes in
// Webhook URL: https://your-domain.com/api/webhooks/twilio/sms-inbound
export async function POST(req: NextRequest) {
  const result = createServiceRoleClient()
  if ("error" in result) return result.error
  const { supabase } = result

  const params = await parseTwilioBody(req.clone())

  const messageSid = params["MessageSid"]
  const from       = params["From"]   // sender's phone (the lead)
  const to         = params["To"]     // your Twilio number
  const body       = params["Body"] ?? ""

  if (!messageSid || !from || !to) return new NextResponse("Bad payload", { status: 400 })

  // Find workspace by Twilio phone number
  const { data: cfg } = await supabase
    .from("twilio_config")
    .select("user_id, workspace_id, auth_token")
    .eq("phone_number", to)
    .single()

  if (!cfg) {
    // Unknown number — accept but ignore (Twilio needs a 200)
    return twimlEmpty()
  }

  // Validate Twilio signature
  const twilioSignature = req.headers.get("X-Twilio-Signature") ?? ""
  if (twilioSignature && cfg.auth_token) {
    const url = req.nextUrl.toString()
    const valid = validateTwilioWebhook(cfg.auth_token, twilioSignature, url, params)
    if (!valid) return new NextResponse("Invalid signature", { status: 403 })
  }

  // Try to find an existing lead by phone number
  const { data: lead } = await supabase
    .from("leadboard")
    .select("id, full_name")
    .eq("workspace_id", cfg.workspace_id)
    .eq("phone", from)
    .maybeSingle()

  // Store inbound message
  await supabase.from("sms_logs").insert({
    user_id: cfg.user_id,
    workspace_id: cfg.workspace_id,
    lead_id: lead?.id ?? null,
    twilio_message_sid: messageSid,
    direction: "inbound",
    to_number: to,
    from_number: from,
    body,
    status: "received",
    sent_at: new Date().toISOString(),
  })

  // Log activity on lead (if known)
  if (lead) {
    await supabase.from("lead_activities").insert({
      user_id: cfg.user_id,
      workspace_id: cfg.workspace_id,
      lead_id: lead.id,
      type: "sms_received",
      description: `Replied via SMS: "${body.slice(0, 120)}${body.length > 120 ? "…" : ""}"`,
    })

    // Bump status to "replied"
    await supabase
      .from("leadboard")
      .update({ status: "replied", last_contacted_at: new Date().toISOString() })
      .eq("id", lead.id)
      .eq("status", "contacted")  // only upgrade, don't downgrade converted/rejected
  }

  // Empty TwiML response — no auto-reply (for now)
  return twimlEmpty()
}

function twimlEmpty() {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  })
}
