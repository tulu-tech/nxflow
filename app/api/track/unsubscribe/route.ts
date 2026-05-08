import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"

const UNSUBSCRIBED_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9f9f9;}
.card{background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:360px;}
h2{margin:0 0 8px;font-size:20px;color:#111;}p{margin:0;color:#666;font-size:14px;}</style></head>
<body><div class="card"><h2>You've been unsubscribed</h2><p>You won't receive further emails from this sender.</p></div></body></html>`

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")

  if (id) {
    const result = createServiceRoleClient()
    if (!("error" in result)) {
      const { supabase } = result
      // Fetch the log to get workspace_id + recipient email
      const { data: log } = await supabase
        .from("email_logs")
        .select("workspace_id, to_email")
        .eq("id", id)
        .single()

      if (log?.workspace_id && log?.to_email) {
        await supabase
          .from("email_unsubscribes")
          .upsert({ workspace_id: log.workspace_id, email: log.to_email.toLowerCase() })
      }
    }
  }

  return new NextResponse(UNSUBSCRIBED_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  })
}
