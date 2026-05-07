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
