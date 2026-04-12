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
  const isValid = intake.brandName.trim() && intake.industry.trim() && intake.targetAudience.trim() && intake.priorityTopic.trim();

  return (
    <div className="seo-form">
      {/* Business Basics */}
      <div className="seo-form-section">
        <h3 className="seo-form-section-title">🏢 Business Basics</h3>
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
            <label className="seo-label">Industry / Niche *</label>
            <input
              className="seo-input"
              value={intake.industry}
              onChange={(e) => onChange('industry', e.target.value)}
              placeholder="e.g. SaaS, E-commerce, Healthcare"
            />
          </div>
          <div className="seo-form-group">
            <label className="seo-label">Business Type</label>
            <div className="seo-radio-group">
              {(['B2B', 'B2C', 'Both'] as BusinessType[]).map((t) => (
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
        </div>
      </div>

      {/* Products & Services */}
      <div className="seo-form-section">
        <h3 className="seo-form-section-title">📦 Products & Services</h3>
        <div className="seo-form-group full">
          <label className="seo-label">All Products / Services</label>
          <textarea
            className="seo-textarea"
            value={intake.products}
            onChange={(e) => onChange('products', e.target.value)}
            placeholder="List your products and services…"
            rows={3}
          />
        </div>
        <div className="seo-form-group full">
          <label className="seo-label">Most Important Products / Services</label>
          <input
            className="seo-input"
            value={intake.keyProducts}
            onChange={(e) => onChange('keyProducts', e.target.value)}
            placeholder="Top 2-3 products or services to focus on"
          />
        </div>
      </div>

      {/* Target Audience */}
      <div className="seo-form-section">
        <h3 className="seo-form-section-title">🎯 Target Audience</h3>
        <div className="seo-form-row">
          <div className="seo-form-group">
            <label className="seo-label">Target Audience *</label>
            <textarea
              className="seo-textarea"
              value={intake.targetAudience}
              onChange={(e) => onChange('targetAudience', e.target.value)}
              placeholder="Who are your ideal customers?"
              rows={3}
            />
          </div>
          <div className="seo-form-group">
            <label className="seo-label">Customer Pain Points</label>
            <textarea
              className="seo-textarea"
              value={intake.painPoints}
              onChange={(e) => onChange('painPoints', e.target.value)}
              placeholder="What problems do they face?"
              rows={3}
            />
          </div>
        </div>
        <div className="seo-form-row">
          <div className="seo-form-group">
            <label className="seo-label">Target Countries</label>
            <input
              className="seo-input"
              value={intake.targetCountries.join(', ')}
              onChange={(e) => onChange('targetCountries', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
              placeholder="e.g. US, UK, Germany"
            />
          </div>
          <div className="seo-form-group">
            <label className="seo-label">Target Language</label>
            <input
              className="seo-input"
              value={intake.targetLanguage}
              onChange={(e) => onChange('targetLanguage', e.target.value)}
              placeholder="e.g. English"
            />
          </div>
        </div>
      </div>

      {/* Content Strategy */}
      <div className="seo-form-section">
        <h3 className="seo-form-section-title">📋 Content Strategy</h3>
        <div className="seo-form-row">
          <div className="seo-form-group">
            <label className="seo-label">Business Goal</label>
            <select
              className="seo-select"
              value={intake.businessGoal}
              onChange={(e) => onChange('businessGoal', e.target.value)}
            >
              <option value="">Select goal…</option>
              <option value="traffic">Increase Organic Traffic</option>
              <option value="leads">Generate Leads</option>
              <option value="sales">Drive Sales</option>
              <option value="awareness">Brand Awareness</option>
              <option value="authority">Thought Leadership</option>
            </select>
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
        <div className="seo-form-group full">
          <label className="seo-label">Priority Topic / Offer *</label>
          <input
            className="seo-input"
            value={intake.priorityTopic}
            onChange={(e) => onChange('priorityTopic', e.target.value)}
            placeholder="The main topic this content should target"
          />
        </div>
        <div className="seo-form-row">
          <div className="seo-form-group">
            <label className="seo-label">Tone of Voice</label>
            <input
              className="seo-input"
              value={intake.toneOfVoice}
              onChange={(e) => onChange('toneOfVoice', e.target.value)}
              placeholder="e.g. Professional, Friendly, Authoritative"
            />
          </div>
          <div className="seo-form-group">
            <label className="seo-label">Article Style</label>
            <input
              className="seo-input"
              value={intake.articleStyle}
              onChange={(e) => onChange('articleStyle', e.target.value)}
              placeholder="e.g. In-depth guide, Listicle, How-to"
            />
          </div>
        </div>
      </div>

      {/* Competitive & Technical */}
      <div className="seo-form-section">
        <h3 className="seo-form-section-title">⚙️ Competitive & Technical</h3>
        <div className="seo-form-group full">
          <label className="seo-label">Competitors</label>
          <textarea
            className="seo-textarea"
            value={intake.competitors}
            onChange={(e) => onChange('competitors', e.target.value)}
            placeholder="Key competitors (URLs or names)…"
            rows={2}
          />
        </div>
        <div className="seo-form-row">
          <div className="seo-form-group">
            <label className="seo-label">Domain Authority / Maturity</label>
            <input
              className="seo-input"
              value={intake.domainAuthority}
              onChange={(e) => onChange('domainAuthority', e.target.value)}
              placeholder="e.g. DA 35, New domain, Established"
            />
          </div>
          <div className="seo-form-group">
            <label className="seo-label">Special Focus / Campaign</label>
            <input
              className="seo-input"
              value={intake.specialFocus}
              onChange={(e) => onChange('specialFocus', e.target.value)}
              placeholder="Any seasonal or campaign focus"
            />
          </div>
        </div>
        <div className="seo-form-group full">
          <label className="seo-label">Existing Internal Pages for Linking</label>
          <textarea
            className="seo-textarea"
            value={intake.internalPages}
            onChange={(e) => onChange('internalPages', e.target.value)}
            placeholder="URLs of existing pages that could be linked from the new content…"
            rows={2}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="seo-actions-bar">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>* Required fields</span>
        <button
          className="seo-btn seo-btn-primary"
          disabled={!isValid}
          onClick={onContinue}
        >
          Save & Continue to Keywords →
        </button>
      </div>
    </div>
  );
}
