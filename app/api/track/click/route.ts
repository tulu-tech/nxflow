import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  const urlParam = req.nextUrl.searchParams.get("url")

  // Decode destination — base64url encoded original href
  let destination = "/"
  if (urlParam) {
    try {
      destination = Buffer.from(urlParam, "base64url").toString("utf-8")
      // Basic safety check — only allow http(s) URLs
      if (!/^https?:\/\//i.test(destination)) destination = "/"
    } catch {
      destination = "/"
    }
  }

  if (id) {
    const result = createServiceRoleClient()
    if (!("error" in result)) {
      // Fire-and-forget — redirect returns immediately
      result.supabase.rpc("increment_email_click", { log_id: id }).then(() => {})
    }
  }

  return NextResponse.redirect(destination, { status: 302 })
}
