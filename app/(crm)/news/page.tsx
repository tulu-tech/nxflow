'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Newspaper,
  RefreshCw,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Inbox,
} from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  description: string | null;
  url: string;
  source_name: string;
  published_at: string | null;
  fetched_at: string;
  keywords_matched: string[];
  is_archived: boolean;
  image_url: string | null;
  ai_summary: string | null;
  relevance_score: number | null;
}

const KEYWORD_COLORS: Record<string, { bg: string; text: string }> = {
  'armored vehicle':   { bg: '#1e3a5f', text: '#60a5fa' },
  'armoured vehicle':  { bg: '#1e3a5f', text: '#60a5fa' },
  'armored vehicles':  { bg: '#1e3a5f', text: '#60a5fa' },
  'armoured vehicles': { bg: '#1e3a5f', text: '#60a5fa' },
  'run flat':          { bg: '#1a3a2a', text: '#34d399' },
  'run-flat':          { bg: '#1a3a2a', text: '#34d399' },
  'runflat':           { bg: '#1a3a2a', text: '#34d399' },
  'run flats':         { bg: '#1a3a2a', text: '#34d399' },
  tires:               { bg: '#3b1f47', text: '#c084fc' },
  tire:                { bg: '#3b1f47', text: '#c084fc' },
  tyres:               { bg: '#3b1f47', text: '#c084fc' },
  tyre:                { bg: '#3b1f47', text: '#c084fc' },
};

function KeywordBadge({ kw }: { kw: string }) {
  const color = KEYWORD_COLORS[kw.toLowerCase()] ?? { bg: '#1f2937', text: '#9ca3af' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: color.bg, color: color.text, letterSpacing: '0.03em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {kw}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 8 ? { bg: 'rgba(16,185,129,0.15)', text: '#10b981', border: 'rgba(16,185,129,0.3)' }
    : score >= 5 ? { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' }
    : { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)' };
  return (
    <span title="AI relevance score (1–10)" style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 700,
      padding: '2px 7px', borderRadius: 10,
      background: color.bg, color: color.text,
      border: `1px solid ${color.border}`,
      flexShrink: 0,
    }}>
      ★ {score}/10
    </span>
  );
}

function ArticleCard({
  article,
  onToggleArchive,
}: {
  article: NewsArticle;
  onToggleArchive: (id: string, archived: boolean) => void;
}) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggleArchive(article.id, !article.is_archived);
    setToggling(false);
  };

  const timeAgo = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : 'Unknown date';

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', gap: 12, padding: '14px 16px' }}>
        {/* Image */}
        {article.image_url && (
          <div style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 6, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Source + time + score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--primary)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {article.source_name}
            </span>
            <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={10} />
              {timeAgo}
            </span>
            <ScoreBadge score={article.relevance_score} />
          </div>

          {/* Title */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 14, fontWeight: 600, color: 'var(--foreground)',
              textDecoration: 'none', lineHeight: 1.4, display: 'block', marginBottom: 5,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
          >
            {article.title}
          </a>

          {/* Description */}
          {article.description && (
            <p style={{
              fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 6px',
              lineHeight: 1.5, overflow: 'hidden',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {article.description}
            </p>
          )}

          {/* AI Summary */}
          {article.ai_summary && (
            <div style={{
              fontSize: 12, color: 'var(--foreground)',
              padding: '6px 10px', borderRadius: 6,
              background: 'rgba(99,102,241,0.07)',
              borderLeft: '2px solid var(--primary)',
              lineHeight: 1.5, marginBottom: 2,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', marginRight: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI</span>
              {article.ai_summary}
            </div>
          )}

          {/* Keywords + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Tag size={10} color="var(--muted-foreground)" />
            {article.keywords_matched.map((kw) => (
              <KeywordBadge key={kw} kw={kw} />
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: 'var(--muted-foreground)',
                  textDecoration: 'none', padding: '3px 8px', borderRadius: 5,
                  border: '1px solid var(--border)', background: 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
              >
                <ExternalLink size={10} /> Open
              </a>
              <button
                onClick={handleToggle}
                disabled={toggling}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, padding: '3px 8px', borderRadius: 5,
                  border: '1px solid var(--border)',
                  background: article.is_archived ? 'rgba(99,102,241,0.1)' : 'transparent',
                  color: article.is_archived ? 'var(--primary)' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = article.is_archived ? 'var(--primary)' : 'var(--muted-foreground)')}
              >
                {toggling
                  ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                  : article.is_archived
                    ? <><ArchiveRestore size={10} /> Unarchive</>
                    : <><Archive size={10} /> Archive</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [todayArticles, setTodayArticles] = useState<NewsArticle[]>([]);
  const [archiveArticles, setArchiveArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const loadNews = useCallback(async () => {
    setError(null);
    try {
      const [todayRes, archiveRes] = await Promise.all([
        fetch('/api/news?view=today'),
        fetch('/api/news?view=archive'),
      ]);
      if (!todayRes.ok || !archiveRes.ok) throw new Error('Failed to load news');
      const [today, archive] = await Promise.all([todayRes.json(), archiveRes.json()]);
      setTodayArticles(today);
      setArchiveArticles(archive);
      if (today.length > 0) {
        setLastFetch(today[0].fetched_at);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading news');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadNews().finally(() => setLoading(false));
  }, [loadNews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger the cron endpoint manually
      await fetch('/api/cron/news');
      await loadNews();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleArchive = async (id: string, archived: boolean) => {
    await fetch('/api/news', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_archived: archived }),
    });
    // Move article between lists locally
    if (archived) {
      const article = todayArticles.find((a) => a.id === id);
      if (article) {
        setTodayArticles((p) => p.filter((a) => a.id !== id));
        setArchiveArticles((p) => [{ ...article, is_archived: true }, ...p]);
      }
    } else {
      const article = archiveArticles.find((a) => a.id === id);
      if (article) {
        setArchiveArticles((p) => p.filter((a) => a.id !== id));
        setTodayArticles((p) => [{ ...article, is_archived: false }, ...p]);
      }
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Newspaper size={20} color="var(--primary)" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
              News Intelligence
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4, marginBottom: 0 }}>
            Defense industry news filtered for <strong>armored vehicles</strong>, <strong>run-flat</strong>, and <strong>tires</strong> — updated every 24 hours.
          </p>
          {lastFetch && (
            <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2, marginBottom: 0 }}>
              Last fetch: {format(new Date(lastFetch), "MMM d, yyyy 'at' HH:mm")}
            </p>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500,
            padding: '8px 14px', borderRadius: 7,
            background: 'var(--primary)', color: '#fff',
            border: 'none', cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.7 : 1, flexShrink: 0,
          }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Fetching…' : 'Fetch Now'}
        </button>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#f87171', fontSize: 13, marginBottom: 20,
        }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* ── Today's Feed ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            Today's Feed
          </h2>
          {!loading && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: todayArticles.length > 0 ? 'rgba(99,102,241,0.15)' : 'var(--muted)',
              color: todayArticles.length > 0 ? 'var(--primary)' : 'var(--muted-foreground)',
            }}>
              {todayArticles.length}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>— last 24 hours</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 110, borderRadius: 10, background: 'var(--muted)',
                animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
              }} />
            ))}
          </div>
        ) : todayArticles.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px 20px', borderRadius: 10, border: '1px dashed var(--border)',
            color: 'var(--muted-foreground)', gap: 8,
          }}>
            <Inbox size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>No matching news in the last 24 hours</span>
            <span style={{ fontSize: 12 }}>Click "Fetch Now" to pull the latest articles from all sources.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayArticles.map((article) => (
              <ArticleCard key={article.id} article={article} onToggleArchive={toggleArchive} />
            ))}
          </div>
        )}
      </section>

      {/* ── Archive ──────────────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setArchiveOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '10px 0', marginBottom: archiveOpen ? 14 : 0,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            Archive
          </h2>
          {archiveArticles.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: 'var(--muted)', color: 'var(--muted-foreground)',
            }}>
              {archiveArticles.length}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)', flex: 1, textAlign: 'left' }}>
            — manually saved articles
          </span>
          {archiveOpen
            ? <ChevronUp size={15} color="var(--muted-foreground)" />
            : <ChevronDown size={15} color="var(--muted-foreground)" />
          }
        </button>

        {archiveOpen && (
          archiveArticles.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '32px 20px', borderRadius: 10, border: '1px dashed var(--border)',
              color: 'var(--muted-foreground)', gap: 8,
            }}>
              <Archive size={24} strokeWidth={1.5} />
              <span style={{ fontSize: 13 }}>No archived articles yet.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {archiveArticles.map((article) => (
                <ArticleCard key={article.id} article={article} onToggleArchive={toggleArchive} />
              ))}
            </div>
          )
        )}
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
}
