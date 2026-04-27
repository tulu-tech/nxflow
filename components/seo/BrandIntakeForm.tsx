'use client';

import { BrandIntake, BusinessType, PageType } from '@/lib/seo/types';

interface Props {
  intake: BrandIntake;
  onChange: (field: keyof BrandIntake, value: unknown) => void;
  onContinue: () => void;
  isFromWorkspace?: boolean;
}

const PAGE_TYPES: { value: PageType; label: string }[] = [
  { value: 'blog', label: 'Blog Post' },
  { value: 'landing-page', label: 'Landing Page' },
  { value: 'service-page', label: 'Service Page' },
  { value: 'category-page', label: 'Category Page' },
  { value: 'comparison-page', label: 'Comparison Page' },
  { value: 'guide', label: 'Guide / How-to' },
  { value: 'other', label: 'Other' },
];

export function BrandIntakeForm({ intake, onChange, onContinue, isFromWorkspace }: Props) {
  const isValid = intake.brandName.trim();

  return (
    <div className="seo-form">
      {isFromWorkspace && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(0,200,117,0.08)', border: '1px solid rgba(0,200,117,0.2)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#00c875',
        }}>
          ✅ <strong>Pre-filled from workspace.</strong>
          <span style={{ color: 'var(--text-muted)' }}>You can edit any field for this specific project.</span>
        </div>
      )}
      <div className="seo-form-section">
        <div className="seo-form-row">
          <div className="seo-form-group">
            <label className="seo-label">Brand Name *</label>
            <input
              className="seo-input"
              value={intake.brandName}
              onChange={(e) => onChange('brandName', e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="seo-form-group">
            <label className="seo-label">Website URL</label>
            <input
              className="seo-input"
              value={intake.websiteUrl}
              onChange={(e) => onChange('websiteUrl', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
        <div className="seo-form-row">
          <div className="seo-form-group">
            <label className="seo-label">Business Type</label>
            <div className="seo-radio-group">
              {(['B2B', 'B2C', 'B2G', 'Both'] as BusinessType[]).map((t) => (
                <button
                  key={t}
                  className={`seo-radio-option ${intake.businessType === t ? 'selected' : ''}`}
                  onClick={() => onChange('businessType', t)}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="seo-form-group">
            <label className="seo-label">Page Type</label>
            <select
              className="seo-select"
              value={intake.pageType}
              onChange={(e) => onChange('pageType', e.target.value)}
            >
              {PAGE_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="seo-form-row">
          <div className="seo-form-group">
            <label className="seo-label">Target Language</label>
            <input
              className="seo-input"
              value={intake.targetLanguage}
              onChange={(e) => onChange('targetLanguage', e.target.value)}
              placeholder="e.g. English, Turkish"
            />
          </div>
          <div className="seo-form-group" />
        </div>
      </div>

      <div className="seo-actions-bar">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>* Required</span>
        <button
          className="seo-btn seo-btn-primary"
          disabled={!isValid}
          onClick={onContinue}
        >
          Continue to Keyword Upload →
        </button>
      </div>
    </div>
  );
}
