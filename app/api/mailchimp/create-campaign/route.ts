import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"

async function mailchimpRequest(
  serverPrefix: string,
  apiKey: string,
  path: string,
  method: string,
  body?: unknown
) {
  const url = `https://${serverPrefix}.api.mailchimp.com/3.0${path}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, subject, body, workspaceId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Campaign name required" }, { status: 400 })

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  // Prefer Gmail when connected — skip Mailchimp sync entirely. Actual
  // delivery happens at /api/mailchimp/send via the Gmail API.
  const { data: gmailTokens } = await supabase
    .from("gmail_tokens")
    .select("id")
    .eq("user_id", user.id)
    .eq("workspace_id", wsId)
    .limit(1)

  if (gmailTokens && gmailTokens.length > 0) {
    const { data: campaign } = await supabase
      .from("email_campaigns")
      .insert({ user_id: user.id, workspace_id: wsId, name, subject, body, status: "draft", recipient_count: 0 })
      .select()
      .single()
    return NextResponse.json({ campaign, provider: "gmail" })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("mailchimp_api_key, mailchimp_server_prefix")
    .eq("id", user.id)
    .single()

  // If Mailchimp not configured, save as draft in DB only
  if (!profile?.mailchimp_api_key || !profile?.mailchimp_server_prefix) {
    const { data: campaign } = await supabase
      .from("email_campaigns")
      .insert({ user_id: user.id, workspace_id: wsId, name, subject, body, status: "draft", recipient_count: 0 })
      .select()
      .single()
    return NextResponse.json({ campaign, warning: "No email provider configured — saved as local draft. Connect Gmail in Settings to send." })
  }

  // Fetch the first available Mailchimp audience/list
  const listsRes = await mailchimpRequest(
    profile.mailchimp_server_prefix,
    profile.mailchimp_api_key,
    "/lists?count=1",
    "GET"
  )

  let listId: string | null = null
  if (listsRes.ok) {
    const listsData = await listsRes.json()
    listId = listsData.lists?.[0]?.id ?? null
  }

  if (!listId) {
    return NextResponse.json(
      { error: "No Mailchimp audience found. Create an audience at mailchimp.com first." },
      { status: 400 }
    )
  }

  // Create campaign in Mailchimp — with recipients list assigned
  const createRes = await mailchimpRequest(
    profile.mailchimp_server_prefix,
    profile.mailchimp_api_key,
    "/campaigns",
    "POST",
    {
      type: "regular",
      recipients: { list_id: listId },
      settings: {
        subject_line: subject ?? name,
        title: name,
        from_name: "Alba Collective",
        reply_to: user.email,
      },
    }
  )

  if (!createRes.ok) {
    const err = await createRes.json()
    return NextResponse.json({ error: err.detail ?? "Mailchimp campaign creation failed" }, { status: 400 })
  }

  const mcCampaign = await createRes.json()

  // Set campaign content
  if (body) {
    await mailchimpRequest(
      profile.mailchimp_server_prefix,
      profile.mailchimp_api_key,
      `/campaigns/${mcCampaign.id}/content`,
      "PUT",
      { html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">${body.replace(/\n/g, "<br>")}</div>` }
    )
  }

  // Save to DB
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .insert({
      user_id: user.id,
      workspace_id: wsId,
      name,
      subject,
      body,
      mailchimp_campaign_id: mcCampaign.id,
      status: "draft",
      recipient_count: 0,
    })
    .select()
    .single()

  return NextResponse.json({ campaign })
}
