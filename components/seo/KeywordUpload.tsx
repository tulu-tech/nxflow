'use client';

import { KeywordEntry, SearchIntent, FunnelStage } from '@/lib/seo/types';
import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Trash2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  keywords: KeywordEntry[];
  onUpdateKeywords: (keywords: KeywordEntry[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapIntent(raw: string): SearchIntent {
  const v = (raw || '').toLowerCase().trim();
  if (v.startsWith('info')) return 'informational';
  if (v.startsWith('nav')) return 'navigational';
  if (v.startsWith('comm')) return 'commercial';
  if (v.startsWith('trans')) return 'transactional';
  // single letter codes from Semrush
  if (v === 'i') return 'informational';
  if (v === 'n') return 'navigational';
  if (v === 'c') return 'commercial';
  if (v === 't') return 'transactional';
  return 'informational';
}

function mapFunnel(intent: SearchIntent): FunnelStage {
  if (intent === 'informational') return 'top';
  if (intent === 'navigational') return 'middle';
  if (intent === 'commercial') return 'middle';
  return 'bottom';
}

export function KeywordUpload({ keywords, onUpdateKeywords, onContinue, onBack }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      if (raw.length === 0) {
        setError('The file is empty. Please upload a file with keyword data.');
        return;
      }

      // Map column headers flexibly
      const headers = Object.keys(raw[0]);
      const colMap: Record<string, string> = {};
      for (const h of headers) {
        const norm = normalizeHeader(h);
        if (norm.includes('keyword') && !norm.includes('diff')) colMap.keyword = h;
        else if (norm.includes('volume') || norm === 'searchvolume' || norm === 'sv') colMap.volume = h;
        else if (norm.includes('difficulty') || norm === 'kd' || norm === 'keyworddiff') colMap.kd = h;
        else if (norm.includes('cpc') || norm.includes('cost')) colMap.cpc = h;
        else if (norm.includes('intent') || norm === 'searchintent') colMap.intent = h;
      }

      if (!colMap.keyword) {
        // Try first column as keyword
        colMap.keyword = headers[0];
      }

      const parsed: KeywordEntry[] = raw
        .filter((row) => row[colMap.keyword])
        .map((row, idx) => {
          const kw = String(row[colMap.keyword]).trim();
          const volume = colMap.volume ? Number(row[colMap.volume]) || 0 : undefined;
          const kd = colMap.kd ? Number(row[colMap.kd]) || 0 : undefined;
          const cpc = colMap.cpc ? Number(row[colMap.cpc]) || 0 : undefined;
          const intentRaw = colMap.intent ? String(row[colMap.intent] || '') : '';
          const intent = mapIntent(intentRaw);

          return {
            id: `kw-${idx}`,
            keyword: kw,
            searchIntent: intent,
            funnelStage: mapFunnel(intent),
            businessRelevance: 7,
            conversionValue: intent === 'transactional' ? 9 : intent === 'commercial' ? 7 : 5,
            contentOpportunity: '',
            category: idx === 0 ? 'primary' as const : idx < 5 ? 'secondary' as const : 'supporting' as const,
            searchVolume: volume,
            keywordDifficulty: kd,
            cpc: cpc,
            validationStatus: 'approved' as const,
          };
        });

      if (parsed.length === 0) {
        setError('No keywords found in the file. Make sure there is a "Keyword" column.');
        return;
      }

      onUpdateKeywords(parsed);
    } catch {
      setError('Failed to parse file. Please upload a valid .xlsx, .xls, or .csv file.');
    }
    // Reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  const intentColors: Record<string, string> = {
    informational: '#60a5fa',
    navigational: '#a78bfa',
    commercial: '#fdab3d',
    transactional: '#00c875',
  };

  return (
    <div>
      {/* Upload zone */}
      <div
        className="seo-card"
        style={{
          border: '2px dashed var(--border-default)',
          textAlign: 'center',
          padding: '40px 24px',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
          marginBottom: 24,
        }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && fileRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileRef.current.files = dt.files;
            fileRef.current.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: 40, marginBottom: 12 }}>
          <FileSpreadsheet size={40} color="#818cf8" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          {fileName ? `✅ ${fileName}` : 'Upload Keyword List'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Drag & drop or click to upload .xlsx, .xls, or .csv
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', opacity: 0.7 }}>
          Expected columns: <strong>Keyword</strong>, Search Volume, Keyword Difficulty, CPC, Intent
        </div>
        <button className="seo-btn seo-btn-secondary" style={{ marginTop: 16 }} type="button">
          <Upload size={14} /> Choose File
        </button>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16,
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Preview table */}
      {keywords.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {keywords.length} keywords loaded
            </span>
            <button
              className="seo-btn seo-btn-sm seo-btn-danger"
              onClick={() => { onUpdateKeywords([]); setFileName(null); }}
            >
              <Trash2 size={12} /> Clear All
            </button>
          </div>

          <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <table className="seo-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Keyword</th>
                  <th style={{ width: 90 }}>Volume</th>
                  <th style={{ width: 70 }}>KD</th>
                  <th style={{ width: 70 }}>CPC</th>
                  <th style={{ width: 100 }}>Intent</th>
                </tr>
              </thead>
              <tbody>
                {keywords.slice(0, 50).map((kw, idx) => (
                  <tr key={kw.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{kw.keyword}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {kw.searchVolume?.toLocaleString() ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: (kw.keywordDifficulty || 0) > 70 ? '#e2445c' : (kw.keywordDifficulty || 0) > 40 ? '#fdab3d' : '#00c875',
                      }}>
                        {kw.keywordDifficulty ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}
                      </span>
                    </td>
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
                  </tr>
                ))}
                {keywords.length > 50 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>
                      +{keywords.length - 50} more keywords (showing first 50)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {keywords.length === 0 && !error && (
        <div className="seo-empty-state" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <div className="seo-empty-state-icon">📊</div>
          <div className="seo-empty-state-title">No keywords uploaded yet</div>
          <div className="seo-empty-state-desc">
            Upload your keyword research file with columns for Keyword, Search Volume, Keyword Difficulty, CPC, and Intent.
          </div>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button
          className="seo-btn seo-btn-primary"
          disabled={keywords.length === 0}
          onClick={onContinue}
        >
          Continue to Review →
        </button>
      </div>
    </div>
  );
}
