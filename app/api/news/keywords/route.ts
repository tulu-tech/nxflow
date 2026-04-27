import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MATCH_KEYWORDS } from '@/lib/news/rss';
import { getValidatedWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET — list all keywords (seeds defaults if table is empty for workspace)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId);
  if (!wsId) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 });

  const { data, error } = await supabase
    .from('news_keywords')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    const { data: seeded, error: seedError } = await supabase
      .from('news_keywords')
      .insert(MATCH_KEYWORDS.map((kw) => ({ keyword: kw, is_active: true, workspace_id: wsId })))
      .select('*');
    if (seedError) return NextResponse.json({ error: seedError.message }, { status: 500 });
    return NextResponse.json(seeded ?? []);
  }

  return NextResponse.json(data);
}

// POST — add a keyword
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { keyword, workspaceId } = await req.json();
  if (!keyword?.trim()) return NextResponse.json({ error: 'keyword is required' }, { status: 400 });

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId);
  if (!wsId) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 });

  const { data, error } = await supabase
    .from('news_keywords')
    .insert({ keyword: keyword.trim().toLowerCase(), is_active: true, workspace_id: wsId })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — toggle is_active
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, is_active, workspaceId } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId);
  if (!wsId) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 });

  const { error } = await supabase.from('news_keywords').update({ is_active }).eq('id', id).eq('workspace_id', wsId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove a keyword
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const wsId = await getValidatedWorkspaceId(supabase, user, workspaceId);
  if (!wsId) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 });

  const { error } = await supabase.from('news_keywords').delete().eq('id', id).eq('workspace_id', wsId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
