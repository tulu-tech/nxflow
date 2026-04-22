import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RSS_SOURCES } from '@/lib/news/rss';

export const dynamic = 'force-dynamic';

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at: string;
}

// GET — list all sources (seeds defaults if table is empty)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('news_sources')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Seed defaults if table is empty
  if (!data || data.length === 0) {
    const { data: seeded, error: seedError } = await supabase
      .from('news_sources')
      .insert(RSS_SOURCES.map(s => ({ name: s.name, url: s.url, is_active: true })))
      .select('*');

    if (seedError) return NextResponse.json({ error: seedError.message }, { status: 500 });
    return NextResponse.json(seeded ?? []);
  }

  return NextResponse.json(data);
}

// POST — create a new source
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, url } = await req.json();
  if (!name?.trim() || !url?.trim()) {
    return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
  }
  if (!url.startsWith('http')) {
    return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('news_sources')
    .insert({ name: name.trim(), url: url.trim(), is_active: true })
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

  const { error } = await supabase
    .from('news_sources')
    .update({ is_active })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove a source
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase
    .from('news_sources')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
