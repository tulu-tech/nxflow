import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"
import { validateTwilioWebhook, parseTwilioBody } from "@/lib/twilio-webhook"

export const dynamic = "force-dynamic"

// Twilio calls this whenever a message status changes:
// queued → sent → delivered  (or failed / undelivered)
// StatusCallback URL: /api/webhooks/twilio/sms-status?wsId={workspaceId}
export async function POST(req: NextRequest) {
  const result = createServiceRoleClient()
  if ("error" in result) return result.error
  const { supabase } = result

  const wsId = req.nextUrl.searchParams.get("wsId")
  if (!wsId) return new NextResponse("Missing wsId", { status: 400 })

  // Clone before reading so we can read the body twice (parse + validation)
  const params = await parseTwilioBody(req.clone())

  const messageSid    = params["MessageSid"]
  const messageStatus = params["MessageStatus"]  // sent | delivered | undelivered | failed
  const errorCode     = params["ErrorCode"] ?? null

  if (!messageSid || !messageStatus) return new NextResponse("Bad payload", { status: 400 })

  // Validate Twilio signature against the stored auth_token for this workspace
  const twilioSignature = req.headers.get("X-Twilio-Signature") ?? ""
  if (twilioSignature) {
    // Look up auth_token for validation
    const { data: cfg } = await supabase
      .from("twilio_config")
      .select("auth_token")
      .eq("workspace_id", wsId)
      .single()

    if (cfg?.auth_token) {
      const url = req.nextUrl.toString()
      const valid = validateTwilioWebhook(cfg.auth_token, twilioSignature, url, params)
      if (!valid) return new NextResponse("Invalid signature", { status: 403 })
    }
  }

  // Update sms_logs
  const { data: log } = await supabase
    .from("sms_logs")
    .update({
      status: messageStatus,
      error_code: errorCode,
      updated_at: new Date().toISOString(),
    })
    .eq("twilio_message_sid", messageSid)
    .select("id, lead_id, workspace_id, user_id")
    .single()

  // If message failed/undelivered, log an activity on the lead
  if (log?.lead_id && (messageStatus === "failed" || messageStatus === "undelivered")) {
    await supabase.from("lead_activities").insert({
      user_id: log.user_id,
      workspace_id: log.workspace_id,
      lead_id: log.lead_id,
      type: "sms_failed",
      description: `SMS delivery failed (${messageStatus}${errorCode ? ` · error ${errorCode}` : ""})`,
    })
  }

  return new NextResponse("OK", { status: 200 })
}
