'use client';

import { ContentBrief as ContentBriefType, BrandIntake, KeywordEntry, BriefSelections } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react';

const BRIEF_OPTIONS = {
  contentTopics: [
    'Interactive Product Demonstrations',
    'Video Tutorials',
    'Completed Project Case Studies',
    'Project Highlights',
    'Maintenance Tips Series',
    'Infographic Guides',
    'Latest News on Military Trucks',
    'Maintenance Innovations',
    'Important International Contracts',
    'Repost of Educational Blog Content',
    'Technical Insights from the Industry',
    'Overview of Services',
    'Custom Solution Spotlights',
    'Client Testimonials',
    'Endorsements from Industry Leaders',
    'Industry Partnership Announcements',
  ],
  targetOrganizations: [
    'National Defense Departments',
    'Land Forces Command',
    'Government Procurement Agencies',
    'Defense Contractors',
    'Military Vehicle Manufacturers',
    'Military Equipment Supplier Companies',
    'Logistics and Transportation Companies',
    'Private Security Firms',
    'Police Departments',
  ],
  targetJobTitles: [
    'Procurement Officers',
    'Military Project Managers',
    'Compliance and Regulatory Officers',
    'Business Development Managers',
    'Product Managers',
    'Quality Assurance Managers',
    'Logistic Coordinators',
    'Supply Chain Managers',
    'Technical Consultants',
    'Sales Executives',
    'Maintenance Supervisors',
    'Operations Managers',
    'Strategy Advisors',
    'Chief Executive Officers',
    'General Managers',
  ],
  contentFormat: [
    'Text Posts',
    'Image Posts',
    'Short Videos',
    'Long-Form Videos',
    'Instagram/Facebook Stories',
    'LinkedIn Stories',
    'Static Infographics',
    'Multi-Image Carousels',
    'Multi-Page PDF Carousels',
    'Article/Blogs in-depth content',
    'Polls and Quizzes',
    'Q&A Sessions',
    'Comments on Target Posts',
  ],
};

const SECTION_LABELS: Record<keyof typeof BRIEF_OPTIONS, string> = {
  contentTopics: 'Content Topics',
  targetOrganizations: 'Target Organizations',
  targetJobTitles: 'Target Job Titles',
  contentFormat: 'Content Format',
};

const SECTION_ICONS: Record<keyof typeof BRIEF_OPTIONS, string> = {
  contentTopics: '📌',
  targetOrganizations: '🏢',
  targetJobTitles: '👤',
  contentFormat: '📄',
};

function formatSelectionsAsInstructions(selections: BriefSelections): string {
  const parts: string[] = [];
  if (selections.contentTopics.length > 0)
    parts.push(`Content Topics: ${selections.contentTopics.join(', ')}`);
  if (selections.targetOrganizations.length > 0)
    parts.push(`Target Organizations: ${selections.targetOrganizations.join(', ')}`);
  if (selections.targetJobTitles.length > 0)
    parts.push(`Target Job Titles: ${selections.targetJobTitles.join(', ')}`);
  if (selections.contentFormat.length > 0)
    parts.push(`Content Format: ${selections.contentFormat.join(', ')}`);
  return parts.join('. ');
}

interface MultiSelectProps {
  sectionKey: keyof typeof BRIEF_OPTIONS;
  selected: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectSection({ sectionKey, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const options = BRIEF_OPTIONS[sectionKey];
  const label = SECTION_LABELS[sectionKey];
  const icon = SECTION_ICONS[sectionKey];

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="seo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {label}
        </span>
        {selected.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: 'var(--accent)', color: '#fff',
            borderRadius: 10, padding: '2px 8px',
          }}>
            {selected.length} selected
          </span>
        )}
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>

      {open && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggle(option)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: isSelected ? 600 : 400,
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'rgba(129,140,248,0.15)' : 'transparent',
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {isSelected && <Check size={11} />}
                {option}
              </button>
            );
          })}
        </div>
      )}

      {!open && selected.length > 0 && (
        <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {selected.map((s) => (
            <span key={s} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(129,140,248,0.12)', color: 'var(--accent)',
              border: '1px solid rgba(129,140,248,0.25)',
            }}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  brief: ContentBriefType | null;
  brandIntake: BrandIntake;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  keywords: KeywordEntry[];
  briefSelections: BriefSelections;
  onSetBriefSelections: (selections: BriefSelections) => void;
  userBriefInput: string;
  onSetUserBriefInput: (v: string) => void;
  onUpdateBrief: (brief: ContentBriefType) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ContentBrief({
  brief, brandIntake, primaryKeyword, secondaryKeywords, keywords,
  briefSelections, onSetBriefSelections, onSetUserBriefInput,
  onUpdateBrief, onContinue, onBack,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSection = (key: keyof BriefSelections, values: string[]) => {
    const updated = { ...briefSelections, [key]: values };
    onSetBriefSelections(updated);
    onSetUserBriefInput(formatSelectionsAsInstructions(updated));
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    const userBriefInput = formatSelectionsAsInstructions(briefSelections);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'brief', brandIntake, primaryKeyword, secondaryKeywords, keywords, userBriefInput }),
      });
      if (!res.ok) throw new Error('Failed to generate brief');
      const data = await res.json();
      if (data.brief) onUpdateBrief(data.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setGenerating(false);
  };

  const totalSelected =
    briefSelections.contentTopics.length +
    briefSelections.targetOrganizations.length +
    briefSelections.targetJobTitles.length +
    briefSelections.contentFormat.length;

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon"><Sparkles size={20} /></span>
        <div>
          <strong>AI Content Brief</strong> — Select your content parameters below, then generate a strategic content brief tailored to your audience and format.
        </div>
      </div>

      {/* Selection panels */}
      <div style={{ marginBottom: 20 }}>
        {(Object.keys(BRIEF_OPTIONS) as Array<keyof typeof BRIEF_OPTIONS>).map((key) => (
          <MultiSelectSection
            key={key}
            sectionKey={key}
            selected={briefSelections[key]}
            onChange={(vals) => updateSection(key, vals)}
          />
        ))}
      </div>

      {totalSelected === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, padding: '8px 12px', borderRadius: 6, background: 'rgba(129,140,248,0.05)', border: '1px solid var(--border)' }}>
          Select at least one option above to guide the AI brief generation.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="seo-btn seo-btn-primary" onClick={generate} disabled={generating || !primaryKeyword}>
          <Sparkles size={14} />
          {generating ? 'Generating…' : brief ? 'Regenerate Brief' : 'Generate Brief'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {generating && (
        <div className="seo-loading">
          <div className="seo-spinner" />
          <div>Building content strategy…</div>
        </div>
      )}

      {!generating && brief && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>📋 Strategy Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><strong style={{ color: 'var(--text-muted)' }}>Content Goal:</strong> <span style={{ color: 'var(--text-secondary)' }}>{brief.contentGoal}</span></div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Page Type:</strong> <span style={{ color: 'var(--text-secondary)' }}>{brief.pageType}</span></div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Funnel Stage:</strong> <span style={{ color: 'var(--text-secondary)' }}>{brief.funnelStage}</span></div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Target Persona:</strong> <span style={{ color: 'var(--text-secondary)' }}>{brief.targetPersona}</span></div>
            </div>
            <div style={{ marginTop: 12, fontSize: 13 }}>
              <strong style={{ color: 'var(--text-muted)' }}>Intent Summary:</strong>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>{brief.searchIntentSummary}</p>
            </div>
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>💡 Content Angle</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>{brief.contentAngle}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}><strong>Differentiation:</strong> {brief.differentiationAngle}</p>
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>📑 H1 & Title Ideas</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#818cf8', marginBottom: 10 }}>{brief.h1}</div>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 16, margin: 0 }}>
              {brief.titleIdeas.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
            </ul>
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>📐 Content Outline</div>
            {brief.outline.map((item, i) => (
              <div key={i} style={{ paddingLeft: item.level === 'h3' ? 20 : 0, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: item.level === 'h2' ? '#818cf8' : 'var(--text-muted)', marginRight: 6 }}>
                  {item.level.toUpperCase()}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>❓ FAQ & Snippets</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>FAQ Opportunities</div>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 16, margin: '0 0 12px' }}>
              {brief.faqOpportunities.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            {brief.richSnippetOpportunities.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Rich Snippet Opportunities</div>
                <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 16, margin: 0 }}>
                  {brief.richSnippetOpportunities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            )}
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>🎯 CTA & Conversion</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong>CTA:</strong> {brief.ctaDirection}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}><strong>Goal:</strong> {brief.conversionGoal}</div>
          </div>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" disabled={!brief} onClick={onContinue}>
          Continue to Content Generation →
        </button>
      </div>
    </div>
  );
}
