import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const updates: Record<string, string | null> = {}
  if ("lushaApiKey" in body) updates.lusha_api_key = body.lushaApiKey || null
  if ("mailchimpApiKey" in body) updates.mailchimp_api_key = body.mailchimpApiKey || null
  if ("mailchimpServerPrefix" in body) updates.mailchimp_server_prefix = body.mailchimpServerPrefix || null
  if ("theme" in body) updates.theme = body.theme
  if ("fullName" in body) updates.full_name = body.fullName

  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// GET: return masked keys (last 4 chars only)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("lusha_api_key, mailchimp_api_key, mailchimp_server_prefix, theme, full_name")
    .eq("id", user.id)
    .single()

  function mask(key: string | null | undefined): string {
    if (!key) return ""
    return "••••••••" + key.slice(-4)
  }

  return NextResponse.json({
    lushaKeyMasked: mask(profile?.lusha_api_key),
    lushaKeySet: !!profile?.lusha_api_key,
    mailchimpKeyMasked: mask(profile?.mailchimp_api_key),
    mailchimpKeySet: !!profile?.mailchimp_api_key,
    mailchimpServerPrefix: profile?.mailchimp_server_prefix ?? "",
    theme: profile?.theme ?? "light",
    fullName: profile?.full_name ?? "",
  })
}
