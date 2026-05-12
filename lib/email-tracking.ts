/**
 * Appends an email signature to the body.
 * For HTML emails the signature is separated by a horizontal rule.
 * For plain-text emails a blank line separator is used.
 * Returns body unchanged when signature is null/empty.
 */
export function appendSignature(
  body: string,
  signature: string | null | undefined,
  isHtml: boolean,
): string {
  if (!signature?.trim()) return body
  if (isHtml) {
    const divider = `<hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;" />`
    // If the signature doesn't already contain HTML tags, convert newlines to <br> so
    // plain-text signatures render with proper line breaks in HTML emails.
    const hasHtmlTags = /<[a-z][\s\S]*?>/i.test(signature)
    const renderedSig = hasHtmlTags
      ? signature
      : signature.replace(/\n/g, "<br>")
    const sigBlock = `<div class="email-signature" style="color:#555;font-size:13px;line-height:1.6;">${renderedSig}</div>`
    return body.includes("</body>")
      ? body.replace("</body>", `${divider}${sigBlock}</body>`)
      : `${body}${divider}${sigBlock}`
  }
  return `${body}\n\n--\n${signature}`
}

/**
 * Injects open-pixel and click-tracking into an HTML email body.
 * Call this AFTER inserting the email_logs row (so the ID exists)
 * and BEFORE base64-encoding the MIME payload for Gmail.
 *
 * Only applied to HTML emails — plain-text bodies are returned unchanged.
 */
export function injectTracking(
  html: string,
  logId: string,
  appUrl: string,
): string {
  // Rewrite every http/https href through the click-tracking proxy
  const tracked = html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_, url) =>
      `href="${appUrl}/api/track/click?id=${logId}&url=${Buffer.from(url).toString("base64url")}"`,
  )

  // 1×1 transparent GIF pixel — hidden from the recipient but fetched by the mail client
  const pixel = `<img src="${appUrl}/api/track/open?id=${logId}" width="1" height="1" style="display:none;max-height:0;overflow:hidden;" alt="" />`

  // Insert before </body> when present; otherwise append to end
  return tracked.includes("</body>")
    ? tracked.replace("</body>", `${pixel}</body>`)
    : tracked + pixel
}

/**
 * Injects an unsubscribe link footer into an HTML email body.
 * Call after injectTracking() so the unsubscribe href is NOT rewritten by the click proxy.
 */
export function injectUnsubscribe(html: string, logId: string, appUrl: string): string {
  const link = `<p style="text-align:center;margin-top:32px;font-size:11px;color:#aaa;font-family:sans-serif;">` +
    `<a href="${appUrl}/api/track/unsubscribe?id=${logId}" style="color:#aaa;text-decoration:underline;">Unsubscribe</a>` +
    `</p>`
  return html.includes("</body>")
    ? html.replace("</body>", `${link}</body>`)
    : html + link
}
