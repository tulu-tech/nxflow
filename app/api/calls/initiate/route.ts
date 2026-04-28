import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"

async function twilioRequest(
  accountSid: string,
  authUser: string,
  authPass: string,
  path: string,
  body: URLSearchParams,
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/${path}`
  const credentials = Buffer.from(`${authUser}:${authPass}`).toString("base64")
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { leadId, workspaceId } = await req.json()
  if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 })

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  // Load Twilio credentials
  const { data: twilio } = await supabase
    .from("twilio_config")
    .select("account_sid, auth_token, phone_number, api_key_sid, my_number")
    .eq("user_id", user.id)
    .eq("workspace_id", wsId)
    .single()

  if (!twilio?.account_sid || !twilio?.auth_token || !twilio?.phone_number) {
    return NextResponse.json({ error: "Twilio is not configured." }, { status: 400 })
  }
  if (!twilio.my_number) {
    return NextResponse.json(
      { error: "Your personal phone number is not set. Add it in Settings → Twilio → My Phone Number." },
      { status: 400 },
    )
  }

  // Load lead
  const { data: lead } = await supabase
    .from("leadboard")
    .select("id, full_name, phone")
    .eq("id", leadId)
    .eq("workspace_id", wsId)
    .single()

  if (!lead?.phone?.trim()) {
    return NextResponse.json({ error: "This lead has no phone number." }, { status: 400 })
  }

  // Create call_log row first — the UUID becomes our one-time TwiML nonce
  const { data: callLog, error: logError } = await supabase
    .from("call_logs")
    .insert({
      user_id: user.id,
      workspace_id: wsId,
      lead_id: lead.id,
      to_number: lead.phone.trim(),
      from_number: twilio.phone_number,
      my_number: twilio.my_number,
      status: "initiating",
    })
    .select("id")
    .single()

  if (logError || !callLog) {
    return NextResponse.json({ error: "Failed to create call log." }, { status: 500 })
  }

  // Build TwiML callback URL — derived from request origin so it works on any deployment
  const origin = req.nextUrl.origin
  const twimlUrl = `${origin}/api/calls/twiml?callId=${callLog.id}`

  // Initiate two-leg call: Twilio calls MY number first, then bridges to lead
  const authUser = twilio.api_key_sid ?? twilio.account_sid
  const res = await twilioRequest(
    twilio.account_sid,
    authUser,
    twilio.auth_token,
    "Calls.json",
    new URLSearchParams({
      To:   twilio.my_number,
      From: twilio.phone_number,
      Url:  twimlUrl,
    }),
  )

  const twilioData = await res.json().catch(() => null)

  if (!res.ok) {
    // Clean up the pending log
    await supabase.from("call_logs").delete().eq("id", callLog.id)
    const reason = twilioData?.message ?? `Twilio error ${res.status}`
    return NextResponse.json({ error: reason }, { status: 400 })
  }

  // Store the Twilio Call SID
  await supabase
    .from("call_logs")
    .update({ twilio_call_sid: twilioData.sid, status: "ringing" })
    .eq("id", callLog.id)

  // Mark lead as contacted
  await supabase
    .from("leadboard")
    .update({ last_contacted_at: new Date().toISOString(), status: "contacted" })
    .eq("id", lead.id)

  await supabase.from("lead_activities").insert({
    user_id: user.id,
    workspace_id: wsId,
    lead_id: lead.id,
    type: "call",
    description: `Outbound call initiated to ${lead.phone}`,
  })

  return NextResponse.json({
    success: true,
    callLogId: callLog.id,
    callSid: twilioData.sid,
    message: `Calling your phone (${twilio.my_number})… answer to be connected to ${lead.full_name}.`,
  })
}
