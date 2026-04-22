import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';
import { RSS_SOURCES, MATCH_KEYWORDS, fetchSource } from '@/lib/news/rss';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadSources(supabase: any): Promise<{ name: string; url: string }[]> {
  const { data } = await supabase.from('news_sources').select('name, url').eq('is_active', true);
  if (data && data.length > 0) return data as { name: string; url: string }[];
  return RSS_SOURCES;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadKeywords(supabase: any): Promise<string[]> {
  const { data } = await supabase.from('news_keywords').select('keyword').eq('is_active', true);
  if (data && data.length > 0) return data.map((r: { keyword: string }) => r.keyword);
  return MATCH_KEYWORDS;
}

// ─── OpenAI scoring ──────────────────────────────────────────────────────────

interface ArticleToScore {
  id: string;
  title: string;
  description: string | null;
  keywords_matched: string[];
}

interface ScoredArticle {
  id: string;
  summary: string;
  score: number;
}

async function scoreArticles(articles: ArticleToScore[]): Promise<ScoredArticle[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || articles.length === 0) return [];

  const articleList = articles
    .map((a, i) =>
      `[${i}] ID: ${a.id}\nTitle: ${a.title}\nKeywords matched: ${a.keywords_matched.join(', ')}\nDescription: ${(a.description ?? '').slice(0, 200)}`,
    )
    .join('\n\n');

  const prompt = `You are an analyst for a company that manufactures and sells tires and run-flat systems for armored military vehicles. Your company cares about news involving armored vehicles, military tires, run-flat systems, defense procurement, and vehicle protection.

For each of the following news articles, respond with:
1. A 1-sentence explanation of WHY this article is relevant to our business (or "Not directly relevant" if it's only loosely related)
2. A business relevance score from 1–10 (10 = directly about our exact market, 7-9 = highly relevant, 4-6 = moderately relevant, 1-3 = weak connection)

Articles:
${articleList}

Return ONLY a JSON array — no markdown, no extra text:
[{"id": "<exact id>", "summary": "<1 sentence>", "score": <number>}, ...]`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '[]';
    const parsed = JSON.parse(raw);
    const arr: ScoredArticle[] = Array.isArray(parsed) ? parsed : (parsed.articles ?? parsed.results ?? []);
    return arr.filter((x) => x.id && typeof x.score === 'number');
  } catch {
    return [];
  }
}

// ─── Cron handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientResult = createServiceRoleClient();
  if ('error' in clientResult) return clientResult.error;
  const { supabase } = clientResult;

  // 1. Load active sources + keywords from DB (fallback to hardcoded)
  const [activeSources, activeKeywords] = await Promise.all([
    loadSources(supabase),
    loadKeywords(supabase),
  ]);
  const results = await Promise.allSettled(
    activeSources.map((source) => fetchSource(source, activeKeywords)),
  );
  const allArticles = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // 2. Batch upsert — single DB call instead of N sequential calls
  const fetched_at = new Date().toISOString();
  const { data: upserted } = await supabase
    .from('news_articles')
    .upsert(
      allArticles.map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        source_name: a.sourceName,
        published_at: a.publishedAt,
        keywords_matched: a.keywords,
        image_url: a.imageUrl,
        fetched_at,
      })),
      { onConflict: 'url', ignoreDuplicates: true },
    )
    .select('id');

  const inserted = upserted?.length ?? 0;

  // 3. Score articles with no AI summary yet
  const { data: unscored } = await supabase
    .from('news_articles')
    .select('id, title, description, keywords_matched')
    .is('ai_summary', null)
    .limit(30);

  let scored = 0;
  if (unscored && unscored.length > 0) {
    const BATCH = 10;
    for (let i = 0; i < unscored.length; i += BATCH) {
      const scores = await scoreArticles(unscored.slice(i, i + BATCH) as ArticleToScore[]);
      // Run all updates in parallel within each batch
      await Promise.all(
        scores.map((s) =>
          supabase
            .from('news_articles')
            .update({ ai_summary: s.summary, relevance_score: s.score })
            .eq('id', s.id),
        ),
      );
      scored += scores.length;
    }
  }

  return NextResponse.json({ ok: true, total: allArticles.length, inserted, scored, fetchedAt: fetched_at });
}
