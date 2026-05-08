import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"
import { injectTracking, injectUnsubscribe, appendSignature } from "@/lib/email-tracking"
import { sendViaGmail, refreshGmailToken, fillMergeTags } from "@/lib/gmail-send"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { campaignId, recipientIds, fromEmail, isHtml, workspaceId } = await req.json()
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 })

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  const [campaignRes, wsRes] = await Promise.all([
    supabase.from("email_campaigns").select("*").eq("id", campaignId).eq("user_id", user.id).eq("workspace_id", wsId).single(),
    supabase.from("crm_workspaces").select("email_signature").eq("id", wsId).single(),
  ])

  const campaign = campaignRes.data
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  const signature: string | null = wsRes.data?.email_signature ?? null

  // Prefer Gmail when connected
  let tokenQuery = supabase.from("gmail_tokens").select("id, access_token, refresh_token, email").eq("user_id", user.id)
  if (fromEmail) tokenQuery = tokenQuery.eq("email", fromEmail)
  const { data: gmailTokens } = await tokenQuery.limit(1)
  const gmailToken = gmailTokens?.[0]

  if (gmailToken?.access_token) {
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json({ error: "No recipients selected" }, { status: 400 })
    }

    const [leadsRes, unsubRes] = await Promise.all([
      supabase.from("leadboard").select("id, email, full_name, position, company").in("id", recipientIds).eq("user_id", user.id),
      supabase.from("email_unsubscribes").select("email").eq("workspace_id", wsId),
    ])

    const unsubEmails = new Set((unsubRes.data ?? []).map((r: { email: string }) => r.email.toLowerCase()))
    const targets = (leadsRes.data ?? []).filter((l) => l.email && !unsubEmails.has(l.email.toLowerCase()))

    if (targets.length === 0) {
      return NextResponse.json({ error: "No valid recipient emails found (all may have unsubscribed)" }, { status: 400 })
    }

    const fromAddr = gmailToken.email ?? user.email ?? "me"
    const subjectTemplate = campaign.subject ?? campaign.name
    const subjectBTemplate: string | null = campaign.subject_b ?? null
    const bodyTemplate = campaign.body ?? ""
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

    // A/B split: shuffle targets, first half gets subject A, second half gets subject B
    const shuffled = [...targets].sort(() => Math.random() - 0.5)
    const splitIndex = subjectBTemplate ? Math.ceil(shuffled.length / 2) : shuffled.length

    let accessToken = gmailToken.access_token
    let sent = 0
    const failures: { email: string; reason: string }[] = []

    for (let i = 0; i < shuffled.length; i++) {
      const lead = shuffled[i]
      const variant: "a" | "b" = subjectBTemplate && i >= splitIndex ? "b" : "a"
      const chosenSubjectTemplate = variant === "b" ? (subjectBTemplate ?? subjectTemplate) : subjectTemplate

      const personalizedSubject = fillMergeTags(chosenSubjectTemplate, lead)
      const personalizedBody = appendSignature(
        fillMergeTags(bodyTemplate, lead),
        signature,
        !!isHtml,
      )

      // Insert log row before sending to get an ID for tracking URLs
      const { data: logRow } = await supabase
        .from("email_logs")
        .insert({
          user_id: user.id,
          workspace_id: wsId,
          lead_id: lead.id,
          campaign_id: campaignId,
          subject_variant: subjectBTemplate ? variant : null,
          from_email: fromAddr,
          to_email: lead.email,
          subject: personalizedSubject,
          body: personalizedBody,
          is_html: !!isHtml,
        })
        .select("id")
        .single()

      let finalBody = personalizedBody
      if (isHtml && logRow?.id && appUrl) {
        finalBody = injectTracking(personalizedBody, logRow.id, appUrl)
        finalBody = injectUnsubscribe(finalBody, logRow.id, appUrl)
      }

      let res = await sendViaGmail(accessToken, fromAddr, lead.email, personalizedSubject, finalBody, !!isHtml)

      if (res.status === 401 && gmailToken.refresh_token) {
        const fresh = await refreshGmailToken(gmailToken.refresh_token)
        if (fresh) {
          accessToken = fresh
          await supabase.from("gmail_tokens").update({ access_token: fresh, updated_at: new Date().toISOString() }).eq("id", gmailToken.id)
          res = await sendViaGmail(accessToken, fromAddr, lead.email, personalizedSubject, finalBody, !!isHtml)
        }
      }

      if (res.ok) {
        sent++
        await supabase.from("leadboard").update({ last_contacted_at: new Date().toISOString(), status: "contacted" }).eq("id", lead.id).eq("user_id", user.id)
      } else {
        const err = await res.json().catch(() => null)
        failures.push({ email: lead.email, reason: err?.error?.message ?? `HTTP ${res.status}` })
      }
    }

    if (sent === 0) {
      return NextResponse.json(
        { error: `All sends failed via Gmail. First: ${failures[0]?.reason ?? "unknown"}` },
        { status: 400 },
      )
    }

    await supabase.from("email_campaigns").update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: sent }).eq("id", campaignId)
    await supabase.from("credit_usage").insert({
      user_id: user.id,
      workspace_id: wsId,
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

  const { data: profile } = await supabase.from("profiles").select("mailchimp_api_key, mailchimp_server_prefix").eq("id", user.id).single()
  if (!profile?.mailchimp_api_key || !profile?.mailchimp_server_prefix) {
    return NextResponse.json({ error: "Mailchimp not configured" }, { status: 400 })
  }

  const sendRes = await fetch(
    `https://${profile.mailchimp_server_prefix}.api.mailchimp.com/3.0/campaigns/${campaign.mailchimp_campaign_id}/actions/send`,
    { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`anystring:${profile.mailchimp_api_key}`).toString("base64")}` } },
  )

  if (!sendRes.ok) {
    const err = await sendRes.json()
    return NextResponse.json({ error: err.detail ?? "Send failed" }, { status: 400 })
  }

  await supabase.from("email_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaignId)
  await supabase.from("credit_usage").insert({
    user_id: user.id,
    workspace_id: wsId,
    type: "mailchimp_send",
    amount: campaign.recipient_count ?? 1,
    metadata: { campaign_id: campaignId, method: "mailchimp" },
  })

  return NextResponse.json({ success: true })
}
