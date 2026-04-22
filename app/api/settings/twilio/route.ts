import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET — return connection status (never expose raw tokens)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('twilio_config')
    .select('account_sid, auth_token, phone_number')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({
    accountSidSet: !!data?.account_sid,
    authTokenSet: !!data?.auth_token,
    phoneNumber: data?.phone_number ?? '',
    connected: !!(data?.account_sid && data?.auth_token && data?.phone_number),
  });
}

// POST — save / update Twilio config
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { accountSid, authToken, phoneNumber } = await req.json();

  const update: Record<string, string> = { updated_at: new Date().toISOString() };
  if (accountSid !== undefined) update.account_sid = accountSid.trim();
  if (authToken !== undefined) update.auth_token = authToken.trim();
  if (phoneNumber !== undefined) update.phone_number = phoneNumber.trim();

  const { error } = await supabase
    .from('twilio_config')
    .upsert({ ...update, user_id: user.id }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
