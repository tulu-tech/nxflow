'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Rss,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
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

interface NewsSource {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at: string;
}

interface NewsKeyword {
  id: string;
  keyword: string;
  is_active: boolean;
  created_at: string;
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {article.source_name}
            </span>
            <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={10} />
              {timeAgo}
            </span>
            <ScoreBadge score={article.relevance_score} />
          </div>

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

          {article.description && (
            <p style={{
              fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 6px',
              lineHeight: 1.5, overflow: 'hidden',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {article.description}
            </p>
          )}

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
                  border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
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

// ─── Sources Panel ─────────────────────────────────────────────────────────────

function SourcesPanel() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/news/sources');
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Failed to load sources');
    } else {
      setSources(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    const res = await fetch('/api/news/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName.trim(), url: addUrl.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error ?? 'Failed to add source');
    } else {
      setSources((prev) => [...prev, data]);
      setAddName('');
      setAddUrl('');
      nameRef.current?.focus();
    }
    setAdding(false);
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    const res = await fetch('/api/news/sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (res.ok) {
      setSources((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
    }
    setTogglingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this source?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/news/sources?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSources((prev) => prev.filter((s) => s.id !== id));
    }
    setDeletingId(null);
  }

  const activeCount = sources.filter(s => s.is_active).length;

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'rgba(99,102,241,0.04)',
      }}>
        <Rss size={14} color="var(--primary)" />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>RSS Sources</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
          background: 'rgba(99,102,241,0.15)', color: 'var(--primary)',
        }}>
          {activeCount} active
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', flex: 1 }}>
          — sources used when fetching news
        </span>
      </div>

      {/* Source list */}
      <div style={{ padding: '12px 16px' }}>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 7,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', fontSize: 12, marginBottom: 12,
          }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: 'var(--muted-foreground)', fontSize: 12 }}>
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading sources…
          </div>
        ) : sources.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 12px' }}>
            No sources yet. Add one below.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 14 }}>
            {sources.map((src) => (
              <div key={src.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7,
                background: src.is_active ? 'transparent' : 'rgba(0,0,0,0.02)',
                opacity: src.is_active ? 1 : 0.55,
                transition: 'opacity 0.15s',
              }}>
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(src.id, src.is_active)}
                  disabled={togglingId === src.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: src.is_active ? 'var(--primary)' : 'var(--muted-foreground)' }}
                  title={src.is_active ? 'Disable source' : 'Enable source'}
                >
                  {togglingId === src.id
                    ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    : src.is_active
                      ? <ToggleRight size={16} />
                      : <ToggleLeft size={16} />
                  }
                </button>

                {/* Name + URL */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{src.name}</span>
                  <span style={{
                    fontSize: 11, color: 'var(--muted-foreground)', marginLeft: 8,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 340, display: 'inline-block', verticalAlign: 'bottom',
                  }}>
                    {src.url}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(src.id)}
                  disabled={deletingId === src.id}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted-foreground)', padding: '2px 4px', borderRadius: 4, display: 'flex',
                  }}
                  title="Remove source"
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
                >
                  {deletingId === src.id
                    ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add source form */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 160px' }}>
            <input
              ref={nameRef}
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Source name"
              required
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
                border: '1px solid var(--border)', background: 'var(--background)',
                color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="https://example.com/feed/"
              required
              type="url"
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
                border: addError ? '1px solid #ef4444' : '1px solid var(--border)',
                background: 'var(--background)', color: 'var(--foreground)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={adding || !addName.trim() || !addUrl.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'var(--primary)', color: '#fff', border: 'none',
              cursor: adding ? 'not-allowed' : 'pointer',
              opacity: adding ? 0.7 : 1, flexShrink: 0,
            }}
          >
            {adding ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
            Add
          </button>
        </form>

        {addError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#f87171', fontSize: 12 }}>
            <X size={12} /> {addError}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Keywords Panel ───────────────────────────────────────────────────────────

function KeywordsPanel() {
  const [keywords, setKeywords] = useState<NewsKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addKw, setAddKw] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadKeywords = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/news/keywords');
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Failed to load keywords');
    } else {
      setKeywords(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadKeywords(); }, [loadKeywords]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    const res = await fetch('/api/news/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: addKw.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error ?? 'Failed to add keyword');
    } else {
      setKeywords((prev) => [...prev, data]);
      setAddKw('');
      inputRef.current?.focus();
    }
    setAdding(false);
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    const res = await fetch('/api/news/keywords', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (res.ok) {
      setKeywords((prev) => prev.map((k) => k.id === id ? { ...k, is_active: !current } : k));
    }
    setTogglingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this keyword?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/news/keywords?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    }
    setDeletingId(null);
  }

  const activeCount = keywords.filter((k) => k.is_active).length;

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'rgba(99,102,241,0.04)',
      }}>
        <Tag size={14} color="var(--primary)" />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Keywords</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
          background: 'rgba(99,102,241,0.15)', color: 'var(--primary)',
        }}>
          {activeCount} active
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', flex: 1 }}>
          — articles must match at least one keyword (word-boundary)
        </span>
      </div>

      {/* Keyword list */}
      <div style={{ padding: '12px 16px' }}>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 7,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', fontSize: 12, marginBottom: 12,
          }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: 'var(--muted-foreground)', fontSize: 12 }}>
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading keywords…
          </div>
        ) : keywords.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 12px' }}>
            No keywords yet. Add one below.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 14 }}>
            {keywords.map((kw) => (
              <div key={kw.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7,
                opacity: kw.is_active ? 1 : 0.55,
                transition: 'opacity 0.15s',
              }}>
                <button
                  onClick={() => handleToggle(kw.id, kw.is_active)}
                  disabled={togglingId === kw.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: kw.is_active ? 'var(--primary)' : 'var(--muted-foreground)' }}
                  title={kw.is_active ? 'Disable keyword' : 'Enable keyword'}
                >
                  {togglingId === kw.id
                    ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    : kw.is_active
                      ? <ToggleRight size={16} />
                      : <ToggleLeft size={16} />
                  }
                </button>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--foreground)', fontFamily: 'monospace' }}>{kw.keyword}</span>
                <button
                  onClick={() => handleDelete(kw.id)}
                  disabled={deletingId === kw.id}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted-foreground)', padding: '2px 4px', borderRadius: 4, display: 'flex',
                  }}
                  title="Remove keyword"
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
                >
                  {deletingId === kw.id
                    ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add keyword form */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={addKw}
            onChange={(e) => setAddKw(e.target.value)}
            placeholder="e.g. run-flat"
            required
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 12,
              border: addError ? '1px solid #ef4444' : '1px solid var(--border)',
              background: 'var(--background)', color: 'var(--foreground)',
              outline: 'none', fontFamily: 'monospace',
            }}
          />
          <button
            type="submit"
            disabled={adding || !addKw.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'var(--primary)', color: '#fff', border: 'none',
              cursor: adding ? 'not-allowed' : 'pointer',
              opacity: adding ? 0.7 : 1, flexShrink: 0,
            }}
          >
            {adding ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
            Add
          </button>
        </form>

        {addError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#f87171', fontSize: 12 }}>
            <X size={12} /> {addError}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [todayArticles, setTodayArticles] = useState<NewsArticle[]>([]);
  const [archiveArticles, setArchiveArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const loadNews = useCallback(async () => {
    setError(null);
    try {
      const [todayRes, archiveRes] = await Promise.all([
        fetch('/api/news?view=today'),
        fetch('/api/news?view=archive'),
      ]);

      // Extract real error from response body
      if (!todayRes.ok) {
        const d = await todayRes.json().catch(() => ({}));
        throw new Error(d.error ?? `News API error (${todayRes.status})`);
      }
      if (!archiveRes.ok) {
        const d = await archiveRes.json().catch(() => ({}));
        throw new Error(d.error ?? `Archive API error (${archiveRes.status})`);
      }

      const [today, archive] = await Promise.all([todayRes.json(), archiveRes.json()]);
      setTodayArticles(today);
      setArchiveArticles(archive);
      if (today.length > 0) setLastFetch(today[0].fetched_at);
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
      const res = await fetch('/api/cron/news');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Fetch failed');
      await loadNews();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
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

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setKeywordsOpen((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500,
              padding: '8px 14px', borderRadius: 7,
              background: keywordsOpen ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: keywordsOpen ? 'var(--primary)' : 'var(--muted-foreground)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            <Tag size={13} />
            Keywords
          </button>
          <button
            onClick={() => setSourcesOpen((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500,
              padding: '8px 14px', borderRadius: 7,
              background: sourcesOpen ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: sourcesOpen ? 'var(--primary)' : 'var(--muted-foreground)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            <Rss size={13} />
            Sources
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500,
              padding: '8px 14px', borderRadius: 7,
              background: 'var(--primary)', color: '#fff',
              border: 'none', cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Fetching…' : 'Fetch Now'}
          </button>
        </div>
      </div>

      {/* Keywords panel */}
      {keywordsOpen && (
        <div style={{ marginBottom: 16 }}>
          <KeywordsPanel />
        </div>
      )}

      {/* Sources panel */}
      {sourcesOpen && (
        <div style={{ marginBottom: 24 }}>
          <SourcesPanel />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
          borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#f87171', fontSize: 13, marginBottom: 20,
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
            {(error.includes('does not exist') || error.includes('relation')) && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#fca5a5' }}>
                The <code>news_articles</code> table is missing. Run <code>supabase/news_articles.sql</code> and <code>supabase/news_sources.sql</code> in your Supabase SQL Editor.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Today's Feed */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Today&apos;s Feed</h2>
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
            <span style={{ fontSize: 12 }}>Click &quot;Fetch Now&quot; to pull the latest articles from all sources.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayArticles.map((article) => (
              <ArticleCard key={article.id} article={article} onToggleArchive={toggleArchive} />
            ))}
          </div>
        )}
      </section>

      {/* Archive */}
      <section>
        <button
          onClick={() => setArchiveOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '10px 0', marginBottom: archiveOpen ? 14 : 0,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Archive</h2>
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
