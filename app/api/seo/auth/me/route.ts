/**
 * Quick user info endpoint — returns the current authenticated user's details.
 * Does NOT touch CRM.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.full_name ?? user.email?.split('@')[0],
      createdAt: user.created_at,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
