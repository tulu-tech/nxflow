import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"
import { sendViaGmail, refreshGmailToken, fillMergeTags } from "@/lib/gmail-send"
import { appendSignature, injectTracking, injectUnsubscribe } from "@/lib/email-tracking"

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = createServiceRoleClient()
  if ("error" in result) return NextResponse.json({ error: "Service role unavailable" }, { status: 500 })
  const { supabase } = result

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const now = new Date().toISOString()

  const { data: campaigns } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .limit(20)

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const summary: { campaign_id: string; sent: number; errors: number }[] = []

  for (const campaign of campaigns) {
    try {
      if (!campaign.recipient_ids?.length || !campaign.user_id) {
        await supabase.from("email_campaigns").update({ status: "sent", sent_at: now }).eq("id", campaign.id)
        continue
      }

      // Fetch leads, gmail token, workspace signature, and unsubscribe list in parallel
      const [leadsRes, wsRes, tokenRes, unsubRes] = await Promise.all([
        supabase.from("leadboard").select("id, email, full_name, position, company").in("id", campaign.recipient_ids).eq("user_id", campaign.user_id),
        supabase.from("crm_workspaces").select("email_signature").eq("id", campaign.workspace_id).single(),
        (() => {
          let q = supabase.from("gmail_tokens").select("id, access_token, refresh_token, email").eq("user_id", campaign.user_id)
          if (campaign.from_email) q = q.eq("email", campaign.from_email)
          return q.limit(1).single()
        })(),
        supabase.from("email_unsubscribes").select("email").eq("workspace_id", campaign.workspace_id),
      ])

      const gmailToken = tokenRes.data
      if (!gmailToken?.access_token) {
        await supabase.from("email_campaigns").update({ status: "draft" }).eq("id", campaign.id)
        continue
      }

      const signature: string | null = wsRes.data?.email_signature ?? null
      const unsubEmails = new Set((unsubRes.data ?? []).map((r: { email: string }) => r.email.toLowerCase()))
      const targets = (leadsRes.data ?? []).filter((l: { email: string | null }) => l.email && !unsubEmails.has(l.email.toLowerCase()))

      const fromAddr = gmailToken.email ?? "me"
      const isHtml = !!campaign.is_html
      const subjectTemplate = campaign.subject ?? campaign.name
      const subjectBTemplate: string | null = campaign.subject_b ?? null
      const bodyTemplate = campaign.body ?? ""

      const shuffled = [...targets].sort(() => Math.random() - 0.5)
      const splitIndex = subjectBTemplate ? Math.ceil(shuffled.length / 2) : shuffled.length

      let accessToken = gmailToken.access_token
      let sent = 0
      let failCount = 0

      for (let i = 0; i < shuffled.length; i++) {
        const lead = shuffled[i]
        const variant: "a" | "b" = subjectBTemplate && i >= splitIndex ? "b" : "a"
        const chosenSubjectTemplate = variant === "b" ? (subjectBTemplate ?? subjectTemplate) : subjectTemplate

        const personalizedSubject = fillMergeTags(chosenSubjectTemplate, lead)
        const personalizedBody = appendSignature(fillMergeTags(bodyTemplate, lead), signature, isHtml)

        const { data: logRow } = await supabase
          .from("email_logs")
          .insert({
            user_id: campaign.user_id,
            workspace_id: campaign.workspace_id,
            lead_id: lead.id,
            campaign_id: campaign.id,
            subject_variant: subjectBTemplate ? variant : null,
            from_email: fromAddr,
            to_email: lead.email,
            subject: personalizedSubject,
            body: personalizedBody,
            is_html: isHtml,
          })
          .select("id")
          .single()

        let finalBody = personalizedBody
        if (isHtml && logRow?.id && appUrl) {
          finalBody = injectTracking(personalizedBody, logRow.id, appUrl)
          finalBody = injectUnsubscribe(finalBody, logRow.id, appUrl)
        }

        let res = await sendViaGmail(accessToken, fromAddr, lead.email, personalizedSubject, finalBody, isHtml)

        if (res.status === 401 && gmailToken.refresh_token) {
          const fresh = await refreshGmailToken(gmailToken.refresh_token)
          if (fresh) {
            accessToken = fresh
            await supabase.from("gmail_tokens").update({ access_token: fresh, updated_at: new Date().toISOString() }).eq("id", gmailToken.id)
            res = await sendViaGmail(accessToken, fromAddr, lead.email, personalizedSubject, finalBody, isHtml)
          }
        }

        if (res.ok) {
          sent++
          await supabase.from("leadboard").update({ last_contacted_at: now, status: "contacted" }).eq("id", lead.id)
        } else {
          failCount++
        }
      }

      await supabase.from("email_campaigns").update({ status: "sent", sent_at: now, recipient_count: sent }).eq("id", campaign.id)
      summary.push({ campaign_id: campaign.id, sent, errors: failCount })

    } catch (err) {
      summary.push({ campaign_id: campaign.id, sent: 0, errors: 1 })
      console.error("Scheduled campaign error:", campaign.id, err)
    }
  }

  return NextResponse.json({ processed: campaigns.length, summary })
}
