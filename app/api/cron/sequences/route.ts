import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"
import { sendViaGmail, refreshGmailToken, fillMergeTags } from "@/lib/gmail-send"
import { appendSignature, injectTracking, injectUnsubscribe } from "@/lib/email-tracking"

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // allow in dev when not set
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = createServiceRoleClient()
  if ("error" in result) return NextResponse.json({ error: "Service role unavailable" }, { status: 500 })
  const { supabase } = result

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const now = new Date().toISOString()

  // Fetch due enrollments with sequence and workspace info
  const { data: enrollments } = await supabase
    .from("sequence_enrollments")
    .select("*, sequences(workspace_id, user_id, name, from_email)")
    .eq("status", "active")
    .lte("next_send_at", now)
    .limit(100)

  if (!enrollments || enrollments.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0 })
  }

  let sent = 0
  const errors: string[] = []

  for (const enrollment of enrollments) {
    try {
      const sequence = enrollment.sequences as { workspace_id: string; user_id: string; name: string; from_email?: string | null } | null
      if (!sequence) continue

      // Fetch all steps for this sequence
      const { data: steps } = await supabase
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", enrollment.sequence_id)
        .order("step_number", { ascending: true })

      if (!steps || steps.length === 0) continue

      const currentStep = steps[enrollment.current_step]
      if (!currentStep) continue
      const nextStep = steps[enrollment.current_step + 1] ?? null

      // Fetch lead and gmail token in parallel.
      // For the gmail token: prefer the token matching sequence.from_email (if set),
      // then the workspace-scoped token, then any token for the user as fallback.
      const [leadRes, wsRes] = await Promise.all([
        supabase.from("leadboard").select("id, email, full_name, position, company").eq("id", enrollment.lead_id).single(),
        supabase.from("crm_workspaces").select("email_signature").eq("id", sequence.workspace_id).single(),
      ])

      // Workspace-scoped token, filtered by from_email if the sequence specifies one
      const seqFromEmail = sequence.from_email ?? null
      let tokenQuery = supabase
        .from("gmail_tokens")
        .select("id, access_token, refresh_token, email")
        .eq("user_id", enrollment.user_id)
        .eq("workspace_id", sequence.workspace_id)
      if (seqFromEmail) tokenQuery = tokenQuery.eq("email", seqFromEmail)
      let tokenRes = await tokenQuery.limit(1).single()

      // Fallback: any token for this user (ignores workspace — handles legacy data)
      if (!tokenRes.data) {
        let fallbackQuery = supabase
          .from("gmail_tokens")
          .select("id, access_token, refresh_token, email")
          .eq("user_id", enrollment.user_id)
        if (seqFromEmail) fallbackQuery = fallbackQuery.eq("email", seqFromEmail)
        tokenRes = await fallbackQuery.limit(1).single()
      }

      const lead = leadRes.data
      const gmailToken = tokenRes.data
      const signature: string | null = wsRes.data?.email_signature ?? null
      if (!lead?.email || !gmailToken?.access_token) continue

      const fromAddr = seqFromEmail ?? gmailToken.email ?? "me"

      const personalizedSubject = fillMergeTags(currentStep.subject, lead)
      const personalizedBody = appendSignature(fillMergeTags(currentStep.body, lead), signature, false)

      // Insert log row before sending
      const { data: logRow } = await supabase
        .from("email_logs")
        .insert({
          user_id: enrollment.user_id,
          workspace_id: sequence.workspace_id,
          lead_id: lead.id,
          from_email: fromAddr,
          to_email: lead.email,
          subject: personalizedSubject,
          body: personalizedBody,
          is_html: false,
        })
        .select("id")
        .single()

      // HTML detection: if body contains tags, treat as HTML
      const isHtml = /<[a-z][\s\S]*>/i.test(currentStep.body)
      let finalBody = personalizedBody
      if (isHtml && logRow?.id && appUrl) {
        finalBody = injectTracking(personalizedBody, logRow.id, appUrl)
        finalBody = injectUnsubscribe(finalBody, logRow.id, appUrl)
      }

      let accessToken = gmailToken.access_token
      let res = await sendViaGmail(accessToken, fromAddr, lead.email, personalizedSubject, finalBody, isHtml)

      if (res.status === 401 && gmailToken.refresh_token) {
        const fresh = await refreshGmailToken(gmailToken.refresh_token)
        if (fresh) {
          accessToken = fresh
          await supabase.from("gmail_tokens").update({ access_token: fresh, updated_at: new Date().toISOString() }).eq("id", gmailToken.id)
          res = await sendViaGmail(accessToken, fromAddr, lead.email, personalizedSubject, finalBody, isHtml)
        }
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        errors.push(`${lead.email}: ${err?.error?.message ?? `HTTP ${res.status}`}`)
        continue
      }

      sent++

      // Advance or complete enrollment
      if (nextStep) {
        const nextSendAt = new Date(Date.now() + nextStep.delay_days * 86400000).toISOString()
        await supabase
          .from("sequence_enrollments")
          .update({ current_step: enrollment.current_step + 1, next_send_at: nextSendAt })
          .eq("id", enrollment.id)
      } else {
        await supabase.from("sequence_enrollments").update({ status: "completed" }).eq("id", enrollment.id)
      }

      await supabase
        .from("leadboard")
        .update({ last_contacted_at: new Date().toISOString(), status: "contacted" })
        .eq("id", lead.id)

    } catch (err) {
      errors.push(`enrollment ${enrollment.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ processed: enrollments.length, sent, errors })
}
