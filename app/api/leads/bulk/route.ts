import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST bulk operations on leads
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action, leadIds, payload } = await req.json()
  if (!leadIds?.length) return NextResponse.json({ error: "No leads selected" }, { status: 400 })

  // Verify all leads belong to this user
  const { data: ownedLeads } = await supabase
    .from("leadboard")
    .select("id")
    .in("id", leadIds)
    .eq("user_id", user.id)

  const validIds = (ownedLeads ?? []).map((l) => l.id)
  if (!validIds.length) return NextResponse.json({ error: "No valid leads" }, { status: 400 })

  switch (action) {
    case "update_status": {
      await supabase.from("leadboard").update({ status: payload.status }).in("id", validIds)
      for (const id of validIds) {
        await supabase.from("lead_activities").insert({
          user_id: user.id, lead_id: id, type: "status_change",
          description: `Status changed to ${payload.status} (bulk)`,
        })
      }
      break
    }
    case "add_tag": {
      const rows = validIds.map((id) => ({ lead_id: id, tag_id: payload.tagId }))
      await supabase.from("lead_tag_assignments").upsert(rows, { onConflict: "lead_id,tag_id" })
      for (const id of validIds) {
        await supabase.from("lead_activities").insert({
          user_id: user.id, lead_id: id, type: "tag_added",
          description: "Tag added (bulk)", metadata: { tag_id: payload.tagId },
        })
      }
      break
    }
    case "remove_tag": {
      await supabase.from("lead_tag_assignments")
        .delete()
        .in("lead_id", validIds)
        .eq("tag_id", payload.tagId)
      break
    }
    case "add_to_segment": {
      // Verify segment belongs to user
      const { data: seg } = await supabase
        .from("smart_segments")
        .select("id")
        .eq("id", payload.segmentId)
        .eq("user_id", user.id)
        .single()
      if (!seg) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

      const rows = validIds.map((id) => ({ lead_id: id, segment_id: payload.segmentId }))
      await supabase
        .from("lead_segment_assignments")
        .upsert(rows, { onConflict: "lead_id,segment_id" })
      break
    }
    case "delete": {
      await supabase.from("leadboard").delete().in("id", validIds).eq("user_id", user.id)
      break
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  return NextResponse.json({ success: true, affected: validIds.length })
}
