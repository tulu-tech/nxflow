import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"
import { injectTracking, injectUnsubscribe, appendSignature } from "@/lib/email-tracking"
import { sendViaGmail, refreshGmailToken } from "@/lib/gmail-send"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { to, subject, body, leadId, fromEmail, isHtml, workspaceId } = await req.json()
  if (!to || !subject || !body) {
    return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 })
  }

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  // Fetch workspace signature + unsubscribe blocklist in parallel
  const [wsRes, unsubRes, tokenRes] = await Promise.all([
    supabase.from("crm_workspaces").select("email_signature").eq("id", wsId).single(),
    supabase.from("email_unsubscribes").select("email").eq("workspace_id", wsId).eq("email", to.toLowerCase()).maybeSingle(),
    (() => {
      let q = supabase.from("gmail_tokens").select("id, access_token, refresh_token, expires_at, email").eq("user_id", user.id)
      if (fromEmail) q = q.eq("email", fromEmail)
      return q.limit(1).single()
    })(),
  ])

  // Block if unsubscribed
  if (unsubRes.data) {
    return NextResponse.json({ error: "This recipient has unsubscribed." }, { status: 400 })
  }

  const gmailToken = tokenRes.data
  if (!gmailToken?.access_token) {
    return NextResponse.json(
      { error: "Gmail not connected. Go to Settings → API & Credits to connect Gmail." },
      { status: 400 },
    )
  }

  const signature: string | null = wsRes.data?.email_signature ?? null
  const fromAddr = gmailToken.email ?? user.email ?? "me"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

  // Append workspace signature
  const bodyWithSig = appendSignature(body, signature, !!isHtml)

  // Insert the log row BEFORE sending so we have an ID for tracking URLs
  const { data: logRow } = await supabase
    .from("email_logs")
    .insert({
      user_id: user.id,
      workspace_id: wsId,
      lead_id: leadId ?? null,
      from_email: fromAddr,
      to_email: to,
      subject: subject ?? null,
      body: bodyWithSig,
      is_html: !!isHtml,
    })
    .select("id")
    .single()

  // Inject tracking pixel + click proxying + unsubscribe link for HTML emails
  let finalBody = bodyWithSig
  if (isHtml && logRow?.id && appUrl) {
    finalBody = injectTracking(bodyWithSig, logRow.id, appUrl)
    finalBody = injectUnsubscribe(finalBody, logRow.id, appUrl)
  }

  let gmailRes = await sendViaGmail(gmailToken.access_token, fromAddr, to, subject, finalBody, !!isHtml)

  // 401 → try token refresh
  if (gmailRes.status === 401 && gmailToken.refresh_token) {
    const newAccessToken = await refreshGmailToken(gmailToken.refresh_token)
    if (newAccessToken) {
      await supabase
        .from("gmail_tokens")
        .update({ access_token: newAccessToken, updated_at: new Date().toISOString() })
        .eq("id", gmailToken.id)
      gmailRes = await sendViaGmail(newAccessToken, fromAddr, to, subject, finalBody, !!isHtml)
    }
  }

  if (!gmailRes.ok) {
    const err = await gmailRes.json().catch(() => null)
    const message = err?.error?.message ?? `Gmail send failed (HTTP ${gmailRes.status})`
    if (gmailRes.status === 401) {
      await supabase.from("gmail_tokens").delete().eq("id", gmailToken.id)
      return NextResponse.json(
        { error: "Gmail session expired. Please reconnect Gmail in Settings → API & Credits." },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (leadId) {
    await supabase
      .from("leadboard")
      .update({ last_contacted_at: new Date().toISOString(), status: "contacted" })
      .eq("id", leadId)
      .eq("user_id", user.id)
  }

  await supabase.from("credit_usage").insert({
    user_id: user.id,
    workspace_id: wsId,
    type: "mailchimp_send",
    amount: 1,
    metadata: { to, lead_id: leadId, method: "gmail", from: fromAddr },
  })

  return NextResponse.json({ success: true })
}
