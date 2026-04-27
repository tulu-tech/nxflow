import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function redirectWithError(req: NextRequest, code: string, detail?: string) {
  const url = new URL("/settings?tab=api", req.url)
  url.searchParams.set("gmail_error", code)
  if (detail) url.searchParams.set("gmail_detail", detail.slice(0, 300))
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", req.url))

  const googleErr = req.nextUrl.searchParams.get("error")
  if (googleErr) return redirectWithError(req, `google_${googleErr}`)

  const code = req.nextUrl.searchParams.get("code")
  if (!code) return redirectWithError(req, "no_code")

  // Decode workspaceId from state param
  let workspaceId: string | null = null
  const stateRaw = req.nextUrl.searchParams.get("state")
  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, "base64").toString("utf-8"))
      workspaceId = decoded.workspaceId ?? null
    } catch {
      // ignore malformed state
    }
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  const tokenPayload = await tokenRes.json().catch(() => null)
  if (!tokenRes.ok || !tokenPayload?.access_token) {
    return redirectWithError(
      req,
      "token_exchange",
      `${tokenRes.status} ${tokenPayload?.error ?? ""} ${tokenPayload?.error_description ?? ""}`,
    )
  }

  const tokens = tokenPayload as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

  // Resolve Gmail address. Try userinfo first (preferred — it matches the
  // identity the user logged in as). Fall back to Gmail profile if userinfo
  // scopes weren't granted, so users with older consents still work.
  let email: string | null = null
  const userinfoRes = await fetch("https://www.googleapis.com/userinfo/v2/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (userinfoRes.ok) {
    const info = await userinfoRes.json()
    email = info.email ?? null
  }
  if (!email) {
    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (profileRes.ok) {
      const prof = await profileRes.json()
      email = prof.emailAddress ?? null
    }
  }

  if (!email) return redirectWithError(req, "no_email")

  // Explicit check-then-insert/update on (user_id, email). Avoids upsert
  // onConflict, which fails with PGRST 42P10 if the unique constraint name
  // doesn't match the production DB migration state.
  const { data: existing, error: selectErr } = await supabase
    .from("gmail_tokens")
    .select("id, refresh_token")
    .eq("user_id", user.id)
    .eq("email", email)
    .limit(1)

  if (selectErr) return redirectWithError(req, "select_failed", selectErr.message)

  const nowIso = new Date().toISOString()
  const row = existing?.[0]

  if (row) {
    const updatePayload: Record<string, unknown> = {
      access_token: tokens.access_token,
      expires_at: expiresAt,
      updated_at: nowIso,
    }
    // Only overwrite refresh_token if Google issued a new one
    if (tokens.refresh_token) updatePayload.refresh_token = tokens.refresh_token
    // Update workspace_id if provided
    if (workspaceId) updatePayload.workspace_id = workspaceId

    const { error: updateErr } = await supabase
      .from("gmail_tokens")
      .update(updatePayload)
      .eq("id", row.id)

    if (updateErr) return redirectWithError(req, "update_failed", updateErr.message)
  } else {
    const { error: insertErr } = await supabase.from("gmail_tokens").insert({
      user_id: user.id,
      workspace_id: workspaceId ?? null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      email,
      updated_at: nowIso,
    })

    if (insertErr) return redirectWithError(req, "insert_failed", insertErr.message)
  }

  return NextResponse.redirect(new URL("/settings?tab=api&gmail=connected", req.url))
}
