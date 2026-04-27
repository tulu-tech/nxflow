'use client';

import { useState, useMemo } from 'react';
import type { WorkspaceKeyword, KeywordListVersion } from '@/lib/seo/workspaceTypes';
import { Tag, Archive, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  workspaceId: string;
  keywords: WorkspaceKeyword[];
  versions: KeywordListVersion[];
  currentVersion: number;
  lastUploadedAt: string | null;
}

function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

type SortKey = 'keyword' | 'tag' | 'volume' | 'kd' | 'cpc' | 'primaryUse' | 'secondaryUse' | 'lastUsed';

export function KeywordManager({ workspaceId, keywords, versions, currentVersion, lastUploadedAt }: Props) {
  const [tagFilter, setTagFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'unused'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('keyword');
  const [sortAsc, setSortAsc] = useState(true);
  const [showTable, setShowTable] = useState(true);

  const active = useMemo(() => keywords.filter(k => k.status === 'active'), [keywords]);
  const tags = useMemo(() => [...new Set(active.map(k => k.tag))].sort(), [active]);
  const unusedPrimary = useMemo(() => active.filter(k => k.usage.usedAsPrimaryCount === 0), [active]);

  // Tag distribution
  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const k of active) map[k.tag] = (map[k.tag] || 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [active]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = keywords;
    if (statusFilter === 'active') list = list.filter(k => k.status === 'active');
    else if (statusFilter === 'archived') list = list.filter(k => k.status === 'archived');
    else if (statusFilter === 'unused') list = list.filter(k => k.status === 'active' && k.usage.usedAsPrimaryCount === 0);
    if (tagFilter !== 'all') list = list.filter(k => k.tag === tagFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(k => k.keyword.toLowerCase().includes(q) || k.tag.toLowerCase().includes(q));
    }
    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'keyword': cmp = a.keyword.localeCompare(b.keyword); break;
        case 'tag': cmp = a.tag.localeCompare(b.tag); break;
        case 'volume': cmp = (a.volume ?? -1) - (b.volume ?? -1); break;
        case 'kd': cmp = (a.kd ?? -1) - (b.kd ?? -1); break;
        case 'cpc': cmp = (a.cpc ?? -1) - (b.cpc ?? -1); break;
        case 'primaryUse': cmp = a.usage.usedAsPrimaryCount - b.usage.usedAsPrimaryCount; break;
        case 'secondaryUse': cmp = a.usage.usedAsSecondaryCount - b.usage.usedAsSecondaryCount; break;
        case 'lastUsed': {
          const aDate = a.usage.lastUsedAsPrimaryAt || a.usage.lastUsedAsSecondaryAt || '';
          const bDate = b.usage.lastUsedAsPrimaryAt || b.usage.lastUsedAsSecondaryAt || '';
          cmp = aDate.localeCompare(bDate); break;
        }
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [keywords, statusFilter, tagFilter, searchQuery, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  // Export
  const handleExport = () => {
    const rows = filtered.map(k => ({
      keyword: k.keyword,
      tag: k.tag,
      volume: k.volume,
      kd: k.kd,
      cpc: k.cpc,
      status: k.status,
      usedAsPrimary: k.usage.usedAsPrimaryCount,
      usedAsSecondary: k.usage.usedAsSecondaryCount,
      lastUsed: k.usage.lastUsedAsPrimaryAt || k.usage.lastUsedAsSecondaryAt || '',
      dataCompleteness: k.dataCompleteness,
    }));
    // Simple CSV export (no XLSX dependency needed)
    const header = Object.keys(rows[0] || {}).join(',');
    const body = rows.map(r => Object.values(r).join(',')).join('\n');
    const csv = header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keywords-${workspaceId}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="seo-card" style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>🏷️ Keyword Library <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>({active.length} active)</span></h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {keywords.length > 0 && <button className="seo-btn seo-btn-ghost seo-btn-sm" onClick={handleExport} style={{ fontSize: 10 }}><Download size={10} /> Export</button>}
        </div>
      </div>



      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Active', value: active.length, color: '#00c875' },
          { label: 'Tags', value: tags.length, color: '#818cf8' },
          { label: 'Unused (Primary)', value: unusedPrimary.length, color: unusedPrimary.length > 0 ? '#fdab3d' : '#00c875' },
          { label: 'Version', value: `v${currentVersion}`, color: 'var(--text-muted)' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: 'rgba(129,140,248,0.03)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tag distribution */}
      {tagCounts.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Keywords by Tag</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {tagCounts.slice(0, 12).map(([tag, count]) => (
              <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? 'all' : tag)} style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                border: tagFilter === tag ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: tagFilter === tag ? 'rgba(129,140,248,0.08)' : 'transparent',
                color: tagFilter === tag ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                {tag} ({count})
              </button>
            ))}
            {tagCounts.length > 12 && <span style={{ fontSize: 9, color: 'var(--text-muted)', alignSelf: 'center' }}>+{tagCounts.length - 12} more</span>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="seo-input" placeholder="Search keywords..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ fontSize: 11, padding: '4px 8px', flex: 1, maxWidth: 200 }} />
        <select className="seo-input" style={{ fontSize: 10, padding: '4px 6px', width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="unused">Unused primary</option>
        </select>
      </div>

      {lastUploadedAt && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>Last updated: {new Date(lastUploadedAt).toLocaleString()}</div>}

      {/* Keyword table */}
      {showTable && filtered.length > 0 && (
        <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(129,140,248,0.04)', position: 'sticky', top: 0, zIndex: 1 }}>
                {[
                  { key: 'keyword' as SortKey, label: 'Keyword', width: undefined },
                  { key: 'tag' as SortKey, label: 'Tag', width: 80 },
                  { key: 'volume' as SortKey, label: 'Vol', width: 55 },
                  { key: 'kd' as SortKey, label: 'KD', width: 40 },
                  { key: 'cpc' as SortKey, label: 'CPC', width: 50 },
                  { key: 'primaryUse' as SortKey, label: '1°', width: 30 },
                  { key: 'secondaryUse' as SortKey, label: '2°', width: 30 },
                  { key: 'lastUsed' as SortKey, label: 'Last', width: 70 },
                ].map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} style={{
                    padding: '6px 6px', textAlign: 'left', cursor: 'pointer', fontWeight: 600,
                    color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)',
                    width: col.width, whiteSpace: 'nowrap', userSelect: 'none',
                  }}>
                    {col.label} <SortIcon col={col.key} />
                  </th>
                ))}
                <th style={{ padding: '6px 6px', width: 30, borderBottom: '1px solid var(--border-subtle)' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map(k => (
                <tr key={k.keywordId} style={{ borderBottom: '1px solid var(--border-subtle)', background: k.status === 'archived' ? 'rgba(128,128,128,0.03)' : 'transparent' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 500, color: k.status === 'archived' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {k.keyword}
                    {k.status === 'archived' && <span style={{ fontSize: 8, marginLeft: 4, color: '#888' }}>archived</span>}
                  </td>
                  <td style={{ padding: '5px 6px' }}>
                    <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(253,171,61,0.08)', color: '#fdab3d' }}>{k.tag}</span>
                  </td>
                  <td style={{ padding: '5px 6px', color: 'var(--text-muted)' }}>{k.volume?.toLocaleString() ?? '—'}</td>
                  <td style={{ padding: '5px 6px', color: 'var(--text-muted)' }}>{k.kd ?? '—'}</td>
                  <td style={{ padding: '5px 6px', color: 'var(--text-muted)' }}>{k.cpc != null ? `$${k.cpc.toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '5px 6px', fontWeight: 600, color: k.usage.usedAsPrimaryCount > 0 ? '#00c875' : 'var(--text-muted)' }}>{k.usage.usedAsPrimaryCount}</td>
                  <td style={{ padding: '5px 6px', color: 'var(--text-muted)' }}>{k.usage.usedAsSecondaryCount}</td>
                  <td style={{ padding: '5px 6px', fontSize: 9, color: 'var(--text-muted)' }}>
                    {k.usage.lastUsedAsPrimaryAt ? new Date(k.usage.lastUsedAsPrimaryAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '5px 6px' }}>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && <div style={{ textAlign: 'center', padding: 8, fontSize: 10, color: 'var(--text-muted)' }}>Showing 200 of {filtered.length} keywords</div>}
        </div>
      )}

      {showTable && filtered.length === 0 && keywords.length > 0 && (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>No keywords match the current filters.</div>
      )}

      {keywords.length === 0 && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🏷️</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No keywords configured</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Keywords are managed by workspace admins.</div>
        </div>
      )}
    </div>
  );
}
