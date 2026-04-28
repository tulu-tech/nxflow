import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Twilio hits this endpoint when the first leg (user's phone) is answered.
// We return TwiML that dials out to the lead's number, bridging the call.
// The callId UUID acts as a one-time nonce — no auth header needed.
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  return handleTwiml(req)
}

export async function GET(req: NextRequest) {
  return handleTwiml(req)
}

async function handleTwiml(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("callId")
  if (!callId) return twimlError("Missing callId")

  // Use service-role to bypass RLS — this endpoint is called by Twilio, not a browser session
  const supabase = await createClient()

  const { data: log } = await supabase
    .from("call_logs")
    .select("id, to_number, from_number, twiml_fetched")
    .eq("id", callId)
    .single()

  if (!log) return twimlError("Call not found")
  if (log.twiml_fetched) return twimlError("TwiML already consumed")

  // Mark consumed so this nonce can't be replayed
  await supabase
    .from("call_logs")
    .update({ twiml_fetched: true, status: "in-progress" })
    .eq("id", callId)

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(log.from_number ?? "")}">
    <Number>${escapeXml(log.to_number)}</Number>
  </Dial>
</Response>`

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  })
}

function twimlError(msg: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(msg)}</Say>
  <Hangup/>
</Response>`
  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  })
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
