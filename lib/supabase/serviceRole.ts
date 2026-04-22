import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Creates a Supabase client with the service role key (bypasses RLS).
 * Returns { supabase } on success or { error: NextResponse } if env vars are missing.
 * Usage:
 *   const result = createServiceRoleClient();
 *   if ('error' in result) return result.error;
 *   const { supabase } = result;
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServiceRoleClient(): { supabase: any } | { error: NextResponse } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const missing = [
      !url && 'NEXT_PUBLIC_SUPABASE_URL',
      !key && 'SUPABASE_SERVICE_ROLE_KEY',
    ]
      .filter(Boolean)
      .join(', ');
    return {
      error: NextResponse.json(
        { error: `Missing env var(s): ${missing} — add to .env.local and restart the dev server` },
        { status: 500 },
      ),
    };
  }

  return { supabase: createClient(url, key) };
}
