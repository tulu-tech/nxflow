import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { campaignId } = await req.json()
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 })

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  if (!campaign.mailchimp_campaign_id) {
    return NextResponse.json({ error: "Campaign not synced to Mailchimp" }, { status: 400 })
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
    }
  )

  if (!sendRes.ok) {
    const err = await sendRes.json()
    return NextResponse.json({ error: err.detail ?? "Send failed" }, { status: 400 })
  }

  // Update DB
  await supabase
    .from("email_campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", campaignId)

  // Log credit
  await supabase.from("credit_usage").insert({
    user_id: user.id,
    type: "mailchimp_send",
    amount: campaign.recipient_count ?? 1,
    metadata: { campaign_id: campaignId },
  })

  return NextResponse.json({ success: true })
}
