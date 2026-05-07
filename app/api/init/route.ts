import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidatedWorkspaceId } from "@/lib/workspace"

export const dynamic = "force-dynamic"

/**
 * GET /api/init?workspaceId=
 *
 * Returns tags, segments, groups, and sequences in a single request.
 * Replaces 4 separate API calls on page load, cutting 3 redundant
 * auth round-trips and 3 workspace validations.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get("workspaceId")
  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId)
  if (!wsId) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 })

  const [tagsRes, segmentsRes, groupsRes, sequencesRes] = await Promise.all([
    supabase
      .from("lead_tags")
      .select("*")
      .eq("user_id", user.id)
      .eq("workspace_id", wsId)
      .order("name"),
    supabase
      .from("smart_segments")
      .select("*")
      .eq("user_id", user.id)
      .eq("workspace_id", wsId)
      .order("created_at"),
    supabase
      .from("lead_groups")
      .select("id, name, color, position")
      .eq("user_id", user.id)
      .eq("workspace_id", wsId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("sequences")
      .select("*, sequence_steps(*)")
      .eq("user_id", user.id)
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false }),
  ])

  const segments = segmentsRes.data ?? []

  // Fetch all segment memberships in ONE query instead of N per-segment calls
  let segmentMembers: Record<string, string[]> = {}
  if (segments.length > 0) {
    const segIds = segments.map((s: { id: string }) => s.id)
    const { data: assignments } = await supabase
      .from("lead_segment_assignments")
      .select("segment_id, lead_id")
      .in("segment_id", segIds)

    for (const row of assignments ?? []) {
      if (!segmentMembers[row.segment_id]) segmentMembers[row.segment_id] = []
      segmentMembers[row.segment_id].push(row.lead_id)
    }
  }

  return NextResponse.json({
    tags: tagsRes.data ?? [],
    segments,
    segmentMembers,
    groups: groupsRes.data ?? [],
    sequences: sequencesRes.data ?? [],
  })
}
