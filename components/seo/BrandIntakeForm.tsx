'use client';

import { BrandIntake, BusinessType, PageType } from '@/lib/seo/types';

interface Props {
  intake: BrandIntake;
  onChange: (field: keyof BrandIntake, value: unknown) => void;
  onContinue: () => void;
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

export function BrandIntakeForm({ intake, onChange, onContinue }: Props) {
  const isValid = intake.brandName.trim();

  return (
    <div className="seo-form">
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
