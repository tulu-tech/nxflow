import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidatedWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET — return connection status (never expose raw tokens)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId);
  if (!wsId) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 });

  const { data } = await supabase
    .from('twilio_config')
    .select('account_sid, auth_token, phone_number, api_key_sid')
    .eq('user_id', user.id)
    .eq('workspace_id', wsId)
    .single();

  return NextResponse.json({
    accountSidSet: !!data?.account_sid,
    authTokenSet: !!data?.auth_token,
    apiKeySidSet: !!data?.api_key_sid,
    phoneNumber: data?.phone_number ?? '',
    connected: !!(data?.account_sid && data?.auth_token && data?.phone_number),
  });
}

// POST — save / update Twilio config
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { accountSid, authToken, apiKeySid, phoneNumber, workspaceId } = await req.json();

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId);
  if (!wsId) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 });

  const update: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (accountSid !== undefined) update.account_sid = accountSid.trim();
  if (authToken !== undefined) update.auth_token = authToken.trim();
  if (apiKeySid !== undefined) update.api_key_sid = apiKeySid.trim() || null;
  if (phoneNumber !== undefined) update.phone_number = phoneNumber.trim();

  const { error } = await supabase
    .from('twilio_config')
    .upsert({ ...update, user_id: user.id, workspace_id: wsId }, { onConflict: 'user_id,workspace_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
