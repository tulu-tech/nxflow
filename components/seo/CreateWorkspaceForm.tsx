'use client';

import { BusinessType } from '@/lib/seo/types';
import { useState } from 'react';
import { Building2 } from 'lucide-react';

interface WorkspaceFormData {
  clientName: string;
  brandName: string;
  websiteUrl: string;
  industry: string;
  businessType: BusinessType;
  targetCountries: string[];
  targetMarket: string;
  toneOfVoice: string;
  coreOffer: string;
}

interface Props {
  onSubmit: (data: WorkspaceFormData) => void;
  onCancel: () => void;
}

export function CreateWorkspaceForm({ onSubmit, onCancel }: Props) {
  const [data, setData] = useState<WorkspaceFormData>({
    clientName: '',
    brandName: '',
    websiteUrl: '',
    industry: '',
    businessType: 'B2C',
    targetCountries: [],
    targetMarket: '',
    toneOfVoice: '',
    coreOffer: '',
  });

  const [countriesInput, setCountriesInput] = useState('');

  const handleSubmit = () => {
    if (!data.brandName.trim()) return;
    const countries = countriesInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    onSubmit({ ...data, targetCountries: countries, clientName: data.clientName || data.brandName });
  };

  const update = <K extends keyof WorkspaceFormData>(field: K, value: WorkspaceFormData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="seo-card" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Create Workspace
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Set up a client workspace — you only need to do this once per brand
          </div>
        </div>
      </div>

      <div className="seo-form">
        <div className="seo-form-section">
          {/* Row 1: Brand + Client Name */}
          <div className="seo-form-row">
            <div className="seo-form-group">
              <label className="seo-label">Brand Name *</label>
              <input
                className="seo-input"
                value={data.brandName}
                onChange={(e) => update('brandName', e.target.value)}
                placeholder="e.g. Massage Chairs and More"
                autoFocus
              />
            </div>
            <div className="seo-form-group">
              <label className="seo-label">Client Name</label>
              <input
                className="seo-input"
                value={data.clientName}
                onChange={(e) => update('clientName', e.target.value)}
                placeholder="Same as brand if left empty"
              />
            </div>
          </div>

          {/* Row 2: Website + Industry */}
          <div className="seo-form-row">
            <div className="seo-form-group">
              <label className="seo-label">Website URL</label>
              <input
                className="seo-input"
                value={data.websiteUrl}
                onChange={(e) => update('websiteUrl', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="seo-form-group">
              <label className="seo-label">Industry</label>
              <input
                className="seo-input"
                value={data.industry}
                onChange={(e) => update('industry', e.target.value)}
                placeholder="e.g. Health & Wellness"
              />
            </div>
          </div>

          {/* Row 3: Business Type + Target Market */}
          <div className="seo-form-row">
            <div className="seo-form-group">
              <label className="seo-label">Business Type</label>
              <div className="seo-radio-group">
                {(['B2B', 'B2C', 'B2G', 'Both'] as BusinessType[]).map((t) => (
                  <button
                    key={t}
                    className={`seo-radio-option ${data.businessType === t ? 'selected' : ''}`}
                    onClick={() => update('businessType', t)}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="seo-form-group">
              <label className="seo-label">Target Market</label>
              <input
                className="seo-input"
                value={data.targetMarket}
                onChange={(e) => update('targetMarket', e.target.value)}
                placeholder="e.g. US homeowners, 35-65"
              />
            </div>
          </div>

          {/* Row 4: Countries + Tone */}
          <div className="seo-form-row">
            <div className="seo-form-group">
              <label className="seo-label">Target Countries</label>
              <input
                className="seo-input"
                value={countriesInput}
                onChange={(e) => setCountriesInput(e.target.value)}
                placeholder="e.g. United States, Canada"
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Comma-separated</span>
            </div>
            <div className="seo-form-group">
              <label className="seo-label">Tone of Voice</label>
              <input
                className="seo-input"
                value={data.toneOfVoice}
                onChange={(e) => update('toneOfVoice', e.target.value)}
                placeholder="e.g. Expert, warm, conversational"
              />
            </div>
          </div>

          {/* Row 5: Core Offer */}
          <div className="seo-form-row">
            <div className="seo-form-group" style={{ flex: 1 }}>
              <label className="seo-label">Core Offer / Products</label>
              <input
                className="seo-input"
                value={data.coreOffer}
                onChange={(e) => update('coreOffer', e.target.value)}
                placeholder="e.g. Premium massage chairs, zero-gravity recliners"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="seo-actions-bar" style={{ marginTop: 16 }}>
        <button className="seo-btn seo-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="seo-btn seo-btn-primary"
          disabled={!data.brandName.trim()}
          onClick={handleSubmit}
        >
          Create Workspace →
        </button>
      </div>
    </div>
  );
}
