import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET — list news articles
// ?view=today  → last 24 h, not archived
// ?view=archive → is_archived = true
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const view = req.nextUrl.searchParams.get('view') ?? 'today';

  let query = supabase
    .from('news_articles')
    .select('id, title, description, url, source_name, published_at, fetched_at, keywords_matched, is_archived, image_url, ai_summary, relevance_score')
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false });

  if (view === 'today') {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.eq('is_archived', false).gte('published_at', since);
  } else {
    query = query.eq('is_archived', true);
  }

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// PATCH — toggle archive on a single article
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, is_archived } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase
    .from('news_articles')
    .update({ is_archived })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
