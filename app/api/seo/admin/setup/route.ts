/**
 * SEO Admin Setup API
 * 
 * Ensures the current authenticated user is added as admin to the MCM workspace.
 * Safe to call repeatedly (upsert).
 * Does NOT touch CRM tables.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const workspaceId = 'mcm-workspace';
    const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Unknown';

    // Upsert member as admin
    const { error } = await supabase
      .from('seo_workspace_members')
      .upsert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'admin',
        display_name: displayName,
        email: user.email,
      }, { onConflict: 'workspace_id,user_id' });

    if (error) {
      console.error('Admin setup error:', error);
      return NextResponse.json({ 
        error: error.message,
        hint: 'Make sure the seo_workspace_members table exists. Run the SQL migration first.',
        userId: user.id,
        displayName,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      displayName,
      email: user.email,
      role: 'admin',
      workspaceId,
    });
  } catch (err) {
    console.error('Admin setup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
