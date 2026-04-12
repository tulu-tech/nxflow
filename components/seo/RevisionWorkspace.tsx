'use client';

import { RevisionNote } from '@/lib/seo/types';

interface Props {
  notes: RevisionNote[];
  onUpdateNotes: (notes: RevisionNote[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

const categoryIcons = { seo: '🔍', readability: '📖', tone: '🎙️', originality: '✨' };
const categoryLabels = { seo: 'SEO', readability: 'Readability', tone: 'Tone of Voice', originality: 'Originality' };

export function RevisionWorkspace({ notes, onUpdateNotes, onContinue, onBack }: Props) {
  const addNote = () => {
    const note: RevisionNote = {
      id: Math.random().toString(36).substring(2, 8),
      category: 'seo',
      suggestion: '',
      status: 'pending',
    };
    onUpdateNotes([...notes, note]);
  };

  const updateNote = (id: string, field: keyof RevisionNote, value: string) => {
    onUpdateNotes(notes.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  const removeNote = (id: string) => {
    onUpdateNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon">🔄</span>
        <div>
          <strong>Revision Workspace</strong> — Add revision notes from Semrush Writing Assistant or manual review.
          Mark suggestions as accepted, rejected (with reason), or pending.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="seo-btn seo-btn-secondary" onClick={addNote}>
          + Add Revision Note
        </button>
      </div>

      {notes.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map((note) => (
            <div key={note.id} className="seo-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <select
                  className="seo-select"
                  value={note.category}
                  onChange={(e) => updateNote(note.id, 'category', e.target.value)}
                  style={{ width: 140, padding: '6px 10px', fontSize: 12 }}
                >
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <option key={k} value={k}>{categoryIcons[k as keyof typeof categoryIcons]} {v}</option>
                  ))}
                </select>

                <textarea
                  className="seo-textarea"
                  value={note.suggestion}
                  onChange={(e) => updateNote(note.id, 'suggestion', e.target.value)}
                  placeholder="Describe the revision suggestion…"
                  rows={2}
                  style={{ flex: 1, minHeight: 40 }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(['pending', 'accepted', 'rejected'] as const).map((s) => (
                    <button
                      key={s}
                      className={`seo-btn seo-btn-sm ${note.status === s ? 'seo-btn-primary' : 'seo-btn-secondary'}`}
                      onClick={() => updateNote(note.id, 'status', s)}
                      style={{ fontSize: 10, padding: '4px 10px', textTransform: 'capitalize' }}
                    >
                      {s === 'accepted' ? '✓' : s === 'rejected' ? '✕' : '⏳'} {s}
                    </button>
                  ))}
                </div>

                <button className="seo-btn seo-btn-ghost" onClick={() => removeNote(note.id)} style={{ padding: 4 }}>
                  ✕
                </button>
              </div>

              {note.status === 'rejected' && (
                <input
                  className="seo-input"
                  value={note.reason || ''}
                  onChange={(e) => updateNote(note.id, 'reason', e.target.value)}
                  placeholder="Reason for rejection…"
                  style={{ marginTop: 8, fontSize: 12 }}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="seo-empty-state">
          <div className="seo-empty-state-icon">📝</div>
          <div className="seo-empty-state-title">No revision notes</div>
          <div className="seo-empty-state-desc">Add notes from Semrush Writing Assistant feedback or your own review.</div>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" onClick={onContinue}>
          Continue to Final Output →
        </button>
      </div>
    </div>
  );
}
