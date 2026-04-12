'use client';

import { KeywordEntry } from '@/lib/seo/types';

interface Props {
  keywords: KeywordEntry[];
  onUpdateKeywords: (keywords: KeywordEntry[]) => void;
  onSetPrimary: (keyword: string) => void;
  onSetSecondary: (keywords: string[]) => void;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  onContinue: () => void;
  onBack: () => void;
}

const intentColors: Record<string, string> = {
  informational: '#60a5fa',
  navigational: '#a78bfa',
  commercial: '#fdab3d',
  transactional: '#00c875',
};

export function KeywordReview({
  keywords, onUpdateKeywords, onSetPrimary, onSetSecondary,
  primaryKeyword, secondaryKeywords, onContinue, onBack,
}: Props) {
  const toggleRemove = (id: string) => {
    onUpdateKeywords(keywords.filter((k) => k.id !== id));
  };

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon">📋</span>
        <div>
          <strong>Review & Select</strong> — Review your uploaded keywords, remove irrelevant ones,
          and select your <strong>Primary</strong> keyword (main focus) and <strong>Secondary</strong> keywords.
        </div>
      </div>

      {primaryKeyword && (
        <div className="seo-card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ color: '#00c875', fontWeight: 700, marginRight: 8 }}>⭐ Primary:</span>
            {primaryKeyword}
            {secondaryKeywords.length > 0 && (
              <span style={{ marginLeft: 16 }}>
                <span style={{ color: '#818cf8', fontWeight: 600, marginRight: 8 }}>Secondary:</span>
                {secondaryKeywords.join(' · ')}
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
        <table className="seo-table">
          <thead>
            <tr>
              <th style={{ width: 200 }}>Keyword</th>
              <th style={{ width: 80 }}>Volume</th>
              <th style={{ width: 60 }}>KD</th>
              <th style={{ width: 70 }}>CPC</th>
              <th style={{ width: 90 }}>Intent</th>
              <th style={{ width: 70 }}>Role</th>
              <th style={{ width: 130 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw) => (
              <tr key={kw.id}>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{kw.keyword}</td>
                <td style={{ fontSize: 12 }}>{kw.searchVolume?.toLocaleString() ?? '—'}</td>
                <td>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: (kw.keywordDifficulty || 0) > 70 ? '#e2445c' : (kw.keywordDifficulty || 0) > 40 ? '#fdab3d' : '#00c875',
                  }}>
                    {kw.keywordDifficulty ?? '—'}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>{kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}</td>
                <td>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: `${intentColors[kw.searchIntent]}20`,
                    color: intentColors[kw.searchIntent],
                    textTransform: 'capitalize',
                  }}>
                    {kw.searchIntent}
                  </span>
                </td>
                <td>
                  {primaryKeyword === kw.keyword ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#00c875' }}>⭐ Primary</span>
                  ) : secondaryKeywords.includes(kw.keyword) ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8' }}>2° Secondary</span>
                  ) : null}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className={`seo-btn seo-btn-sm ${primaryKeyword === kw.keyword ? 'seo-btn-primary' : 'seo-btn-secondary'}`}
                      onClick={() => onSetPrimary(kw.keyword)}
                      style={{ fontSize: 10 }}
                      title="Set as primary keyword"
                    >
                      1°
                    </button>
                    <button
                      className={`seo-btn seo-btn-sm ${secondaryKeywords.includes(kw.keyword) ? 'seo-btn-primary' : 'seo-btn-secondary'}`}
                      onClick={() => {
                        if (secondaryKeywords.includes(kw.keyword)) {
                          onSetSecondary(secondaryKeywords.filter((s) => s !== kw.keyword));
                        } else {
                          onSetSecondary([...secondaryKeywords, kw.keyword]);
                        }
                      }}
                      style={{ fontSize: 10 }}
                      title="Toggle secondary keyword"
                    >
                      2°
                    </button>
                    <button
                      className="seo-btn seo-btn-sm seo-btn-danger"
                      onClick={() => toggleRemove(kw.id)}
                      style={{ fontSize: 10 }}
                      title="Remove keyword"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" disabled={!primaryKeyword} onClick={onContinue}>
          Continue to Brief →
        </button>
      </div>
    </div>
  );
}
