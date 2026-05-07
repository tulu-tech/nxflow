import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"

// Smallest valid GIF89a — 1×1 transparent pixel
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
)

const PIXEL_RESPONSE = new NextResponse(PIXEL, {
  status: 200,
  headers: {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  },
})

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")

  if (id) {
    const result = createServiceRoleClient()
    if (!("error" in result)) {
      // Fire-and-forget — pixel response returns immediately
      result.supabase.rpc("increment_email_open", { log_id: id }).then(() => {})
    }
  }

  return PIXEL_RESPONSE
}
