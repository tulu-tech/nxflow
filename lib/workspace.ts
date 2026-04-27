import type { SupabaseClient, User } from "@supabase/supabase-js"

/**
 * Validate that the given workspaceId belongs to the given user.
 * Returns the workspace ID on success, null if invalid/not found.
 */
export async function getValidatedWorkspaceId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  user: User,
  workspaceId: string | null | undefined,
): Promise<string | null> {
  if (!workspaceId) return null
  const { data } = await supabase
    .from("crm_workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single()
  return data?.id ?? null
}
