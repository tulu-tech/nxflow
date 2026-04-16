import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton for nxflow's workspace/SEO modules (no SSR cookie handling needed)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null as unknown as ReturnType<typeof createSupabaseClient>;

// Browser client with SSR cookie handling — used by CRM pages
// Matches the API used in alba-collective-crm: `const supabase = createClient()`
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
