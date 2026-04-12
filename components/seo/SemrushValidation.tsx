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

const statusColors = { pending: '#888', approved: '#00c875', rejected: '#e2445c' };

export function SemrushValidation({
  keywords, onUpdateKeywords, onSetPrimary, onSetSecondary,
  primaryKeyword, secondaryKeywords, onContinue, onBack,
}: Props) {
  const toggleValidation = (id: string, status: 'approved' | 'rejected') => {
    onUpdateKeywords(
      keywords.map((k) =>
        k.id === id ? { ...k, validationStatus: k.validationStatus === status ? 'pending' : status } : k
      )
    );
  };

  const approvedKeywords = keywords.filter((k) => k.validationStatus === 'approved');

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon">📊</span>
        <div>
          <strong>Manual Validation</strong> — Review each keyword, validate with Semrush data, and select your primary and secondary keywords.
          Mark keywords as approved or rejected based on volume, difficulty, and business fit.
        </div>
      </div>

      <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
        <table className="seo-table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th style={{ width: 80 }}>Volume</th>
              <th style={{ width: 80 }}>KD</th>
              <th style={{ width: 70 }}>CPC</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 80 }}>Role</th>
              <th style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw) => (
              <tr key={kw.id} style={{ opacity: kw.validationStatus === 'rejected' ? 0.4 : 1 }}>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{kw.keyword}</td>
                <td>
                  <input
                    className="seo-input"
                    style={{ padding: '4px 8px', fontSize: 12, width: 70 }}
                    type="number"
                    placeholder="—"
                    value={kw.searchVolume ?? ''}
                    onChange={(e) => {
                      onUpdateKeywords(
                        keywords.map((k) => k.id === kw.id ? { ...k, searchVolume: e.target.value ? Number(e.target.value) : undefined } : k)
                      );
                    }}
                  />
                </td>
                <td>
                  <input
                    className="seo-input"
                    style={{ padding: '4px 8px', fontSize: 12, width: 60 }}
                    type="number"
                    placeholder="—"
                    value={kw.keywordDifficulty ?? ''}
                    onChange={(e) => {
                      onUpdateKeywords(
                        keywords.map((k) => k.id === kw.id ? { ...k, keywordDifficulty: e.target.value ? Number(e.target.value) : undefined } : k)
                      );
                    }}
                  />
                </td>
                <td>
                  <input
                    className="seo-input"
                    style={{ padding: '4px 8px', fontSize: 12, width: 60 }}
                    type="number"
                    step="0.01"
                    placeholder="—"
                    value={kw.cpc ?? ''}
                    onChange={(e) => {
                      onUpdateKeywords(
                        keywords.map((k) => k.id === kw.id ? { ...k, cpc: e.target.value ? Number(e.target.value) : undefined } : k)
                      );
                    }}
                  />
                </td>
                <td>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: `${statusColors[kw.validationStatus]}20`,
                    color: statusColors[kw.validationStatus],
                    textTransform: 'capitalize',
                  }}>
                    {kw.validationStatus}
                  </span>
                </td>
                <td>
                  {primaryKeyword === kw.keyword ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#00c875' }}>Primary</span>
                  ) : secondaryKeywords.includes(kw.keyword) ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8' }}>Secondary</span>
                  ) : null}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="seo-btn seo-btn-sm seo-btn-secondary" onClick={() => toggleValidation(kw.id, 'approved')} style={{ fontSize: 10 }}>
                      ✓
                    </button>
                    <button className="seo-btn seo-btn-sm seo-btn-danger" onClick={() => toggleValidation(kw.id, 'rejected')} style={{ fontSize: 10 }}>
                      ✕
                    </button>
                    {kw.validationStatus === 'approved' && (
                      <>
                        <button
                          className="seo-btn seo-btn-sm seo-btn-primary"
                          onClick={() => onSetPrimary(kw.keyword)}
                          style={{ fontSize: 10 }}
                        >
                          1°
                        </button>
                        <button
                          className="seo-btn seo-btn-sm seo-btn-secondary"
                          onClick={() => {
                            if (secondaryKeywords.includes(kw.keyword)) {
                              onSetSecondary(secondaryKeywords.filter((s) => s !== kw.keyword));
                            } else {
                              onSetSecondary([...secondaryKeywords, kw.keyword]);
                            }
                          }}
                          style={{ fontSize: 10 }}
                        >
                          2°
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {primaryKeyword && (
        <div className="seo-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Selected Keywords</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong>Primary:</strong> {primaryKeyword}
            {secondaryKeywords.length > 0 && (
              <span> · <strong>Secondary:</strong> {secondaryKeywords.join(', ')}</span>
            )}
          </div>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" disabled={!primaryKeyword} onClick={onContinue}>
          Continue to Brief →
        </button>
      </div>
    </div>
  );
}
