/**
 * Shared Gmail API helpers.
 * Imported by send-individual, send (mass), and cron/sequences routes
 * to avoid duplicating the same logic in every file.
 */

export async function refreshGmailToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token ?? null
  } catch {
    return null
  }
}

export async function sendViaGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  body: string,
  isHtml = false,
  cc?: string,
): Promise<Response> {
  const contentType = isHtml ? "text/html; charset=utf-8" : "text/plain; charset=utf-8"
  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${contentType}`,
    ``,
    body,
  ]
  const encoded = Buffer.from(emailLines.join("\r\n")).toString("base64url")

  return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  })
}

/** Fill {{merge_tag}} variables from a lead object. */
export function fillMergeTags(
  template: string,
  lead: { full_name?: string | null; position?: string | null; company?: string | null; email?: string | null },
): string {
  const parts = (lead.full_name ?? "").trim().split(/\s+/)
  const firstName = parts[0] ?? ""
  const lastName = parts.slice(1).join(" ")
  return template
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{last_name\}\}/gi, lastName)
    .replace(/\{\{full_name\}\}/gi, lead.full_name ?? "")
    .replace(/\{\{position\}\}/gi, lead.position ?? "")
    .replace(/\{\{company\}\}/gi, lead.company ?? "")
    .replace(/\{\{email\}\}/gi, lead.email ?? "")
}
