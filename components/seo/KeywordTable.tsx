'use client';

import { KeywordEntry } from '@/lib/seo/types';
import { Trash2 } from 'lucide-react';

interface Props {
  keywords: KeywordEntry[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof KeywordEntry, value: unknown) => void;
}

const intentColors: Record<string, string> = {
  informational: '#60a5fa',
  navigational: '#a78bfa',
  commercial: '#fdab3d',
  transactional: '#00c875',
};

const funnelLabels: Record<string, string> = {
  top: 'ToFu',
  middle: 'MoFu',
  bottom: 'BoFu',
};

const categoryColors: Record<string, string> = {
  primary: '#6366f1',
  secondary: '#0ea5e9',
  supporting: '#64748b',
};

export function KeywordTable({ keywords, onRemove, onUpdate }: Props) {
  return (
    <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
      <table className="seo-table">
        <thead>
          <tr>
            <th style={{ width: 200 }}>Keyword</th>
            <th style={{ width: 100 }}>Intent</th>
            <th style={{ width: 60 }}>Funnel</th>
            <th style={{ width: 90 }}>Category</th>
            <th style={{ width: 60 }}>Relevance</th>
            <th style={{ width: 60 }}>Value</th>
            <th>Opportunity</th>
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {keywords.map((kw) => (
            <tr key={kw.id}>
              <td>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {kw.keyword}
                </span>
              </td>
              <td>
                <span
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: `${intentColors[kw.searchIntent]}20`,
                    color: intentColors[kw.searchIntent],
                    textTransform: 'capitalize',
                  }}
                >
                  {kw.searchIntent}
                </span>
              </td>
              <td>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {funnelLabels[kw.funnelStage]}
                </span>
              </td>
              <td>
                <span
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: `${categoryColors[kw.category]}20`,
                    color: categoryColors[kw.category],
                    textTransform: 'capitalize',
                  }}
                >
                  {kw.category}
                </span>
              </td>
              <td style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: kw.businessRelevance >= 8 ? '#00c875' : kw.businessRelevance >= 5 ? '#fdab3d' : 'var(--text-muted)',
                }}>
                  {kw.businessRelevance}/10
                </span>
              </td>
              <td style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: kw.conversionValue >= 8 ? '#00c875' : kw.conversionValue >= 5 ? '#fdab3d' : 'var(--text-muted)',
                }}>
                  {kw.conversionValue}/10
                </span>
              </td>
              <td>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {kw.contentOpportunity}
                </span>
              </td>
              <td>
                <button
                  className="seo-btn seo-btn-ghost"
                  style={{ padding: 4 }}
                  onClick={() => onRemove(kw.id)}
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
