import { createHmac } from "crypto"

/**
 * Validate that a webhook request genuinely came from Twilio.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function validateTwilioWebhook(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  // Concatenate sorted POST params as key+value
  const paramStr = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], "")

  const expected = createHmac("sha1", authToken)
    .update(url + paramStr)
    .digest("base64")

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== twilioSignature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ twilioSignature.charCodeAt(i)
  }
  return diff === 0
}

/** Parse application/x-www-form-urlencoded Twilio webhook body */
export async function parseTwilioBody(req: Request): Promise<Record<string, string>> {
  const text = await req.text()
  const params: Record<string, string> = {}
  for (const pair of text.split("&")) {
    const [k, v] = pair.split("=").map(decodeURIComponent)
    if (k) params[k] = v ?? ""
  }
  return params
}
