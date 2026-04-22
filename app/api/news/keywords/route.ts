import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MATCH_KEYWORDS } from '@/lib/news/rss';

export const dynamic = 'force-dynamic';

// GET — list all keywords (seeds defaults if table is empty)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('news_keywords')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    const { data: seeded, error: seedError } = await supabase
      .from('news_keywords')
      .insert(MATCH_KEYWORDS.map((kw) => ({ keyword: kw, is_active: true })))
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

  const { keyword } = await req.json();
  if (!keyword?.trim()) return NextResponse.json({ error: 'keyword is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('news_keywords')
    .insert({ keyword: keyword.trim().toLowerCase(), is_active: true })
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

  const { id, is_active } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('news_keywords').update({ is_active }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove a keyword
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('news_keywords').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
