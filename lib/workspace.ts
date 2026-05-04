import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createServiceRoleClient } from "@/lib/supabase/serviceRole"

/**
 * Validate that the given workspaceId belongs to the given user.
 * Returns the workspace ID on success, null if invalid/not found.
 *
 * Uses maybeSingle (never errors on 0 rows) and auto-repairs workspaces whose
 * user_id was seeded with a wrong value (e.g. the default workspace created by
 * a SQL migration run under a different auth context).
 * The repair uses the service-role client to bypass RLS — necessary because RLS
 * itself hides the row when user_id is stale.
 */
export async function getValidatedWorkspaceId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  user: User,
  workspaceId: string | null | undefined,
): Promise<string | null> {
  if (!workspaceId) return null

  // Primary check: workspace exists and belongs to this user
  const { data } = await supabase
    .from("crm_workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (data?.id) return data.id

  // Fallback: workspace exists but user_id is stale (common when the default
  // workspace was inserted via SQL Editor with a different auth.uid()).
  // RLS hides rows with stale user_id from the session client, so we need the
  // service-role client (bypasses RLS) to detect and repair the mismatch.
  const srResult = createServiceRoleClient()
  if ("error" in srResult) return null
  const sr = srResult.supabase

  const { data: raw } = await sr
    .from("crm_workspaces")
    .select("id, user_id")
    .eq("id", workspaceId)
    .maybeSingle()

  if (raw && raw.user_id !== user.id) {
    await sr
      .from("crm_workspaces")
      .update({ user_id: user.id })
      .eq("id", workspaceId)
    return workspaceId
  }

  return null
}
