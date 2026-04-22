import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RSS_SOURCES, fetchSource } from '@/lib/news/rss';

// Load active sources from DB; fall back to hardcoded if empty
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadSources(supabase: any): Promise<{ name: string; url: string }[]> {
  const { data } = await supabase
    .from('news_sources')
    .select('name, url')
    .eq('is_active', true);
  if (data && data.length > 0) return data as { name: string; url: string }[];
  return RSS_SOURCES; // fallback
}

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
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

    // GPT sometimes wraps in {"articles": [...]}
    const parsed = JSON.parse(raw);
    const arr: ScoredArticle[] = Array.isArray(parsed) ? parsed : (parsed.articles ?? parsed.results ?? []);
    return arr.filter((x) => x.id && typeof x.score === 'number');
  } catch {
    return [];
  }
}

// ─── Cron handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1. Fetch all active RSS sources in parallel (from DB, fallback to hardcoded)
  const activeSources = await loadSources(supabase);
  const results = await Promise.allSettled(
    activeSources.map((source) => fetchSource(source)),
  );
  const allArticles = results.flatMap((r) =>
    r.status === 'fulfilled' ? r.value : [],
  );

  // 2. Upsert new articles (duplicates ignored via url uniqueness)
  let inserted = 0;
  const newIds: string[] = [];

  for (const article of allArticles) {
    const { data, error } = await supabase
      .from('news_articles')
      .upsert(
        {
          title: article.title,
          description: article.description,
          url: article.url,
          source_name: article.sourceName,
          published_at: article.publishedAt,
          keywords_matched: article.keywords,
          image_url: article.imageUrl,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'url', ignoreDuplicates: true },
      )
      .select('id')
      .single();

    if (!error && data?.id) {
      newIds.push(data.id);
      inserted++;
    }
  }

  // 3. Score articles that have no AI summary yet (new ones + any missed before)
  const { data: unscored } = await supabase
    .from('news_articles')
    .select('id, title, description, keywords_matched')
    .is('ai_summary', null)
    .limit(30);

  let scored = 0;
  if (unscored && unscored.length > 0) {
    // Process in batches of 10 to keep prompt size manageable
    const BATCH = 10;
    for (let i = 0; i < unscored.length; i += BATCH) {
      const batch = unscored.slice(i, i + BATCH) as ArticleToScore[];
      const scores = await scoreArticles(batch);

      for (const s of scores) {
        await supabase
          .from('news_articles')
          .update({ ai_summary: s.summary, relevance_score: s.score })
          .eq('id', s.id);
        scored++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    total: allArticles.length,
    inserted,
    scored,
    fetchedAt: new Date().toISOString(),
  });
}
