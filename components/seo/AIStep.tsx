'use client';

import { useState } from 'react';
import type { SEOProject } from '@/lib/seo/types';
import type { SEOWorkspace, WorkspacePersona, WorkspaceContentTopic } from '@/lib/seo/workspaceTypes';
import { Loader2, Check, RotateCcw } from 'lucide-react';

interface Props {
  step: number;
  phase: { icon: string; label: string; shortLabel: string } | undefined;
  workspace: SEOWorkspace;
  project: SEOProject;
  persona: WorkspacePersona | undefined;
  topic: WorkspaceContentTopic | undefined;
  platformFormat: string | null;
  contentGoal: string;
  onApprove: (data: Record<string, unknown>) => void;
}

const STEP_CONFIG: Record<number, { action: string; title: string; desc: string }> = {
  5: { action: 'select-keywords-for-content', title: 'AI Keyword Selection', desc: 'Analyzing workspace keywords, topic, persona, and prior usage...' },
  6: { action: 'generate-content-brief', title: 'Content Brief', desc: 'Creating a platform-specific content brief...' },
  7: { action: 'auto', title: 'Content Generation', desc: 'Writing the full content piece...' },
  8: { action: 'generate-internal-link-plan', title: 'Internal Link Plan', desc: 'Selecting internal links from your sitemap...' },
  9: { action: 'generate-external-link-plan', title: 'External Link Plan', desc: 'Finding authoritative external sources...' },
  10: { action: 'inject-links', title: 'Link Injection', desc: 'Inserting approved links naturally into the content...' },
  11: { action: 'generate-image-plan', title: 'Image Plan', desc: 'Creating a 5-image visual strategy...' },
  12: { action: 'generate-content-images', title: 'Image Generation', desc: 'Generating premium on-brand images...' },
};

function buildPayload(step: number, project: SEOProject, workspace: SEOWorkspace, persona: WorkspacePersona | undefined, topic: WorkspaceContentTopic | undefined, platformFormat: string | null, contentGoal: string) {
  const base = {
    workspaceData: {
      id: workspace.id, brandName: workspace.brandName ?? '', websiteUrl: workspace.websiteUrl ?? '',
      industry: workspace.industry ?? '', toneOfVoice: workspace.toneOfVoice ?? '', coreOffer: workspace.coreOffer ?? '',
      primaryCTA: workspace.primaryCTA ?? '', brandDifferentiators: workspace.brandDifferentiators ?? '',
      complianceNotes: workspace.complianceNotes ?? '', targetMarket: workspace.targetMarket ?? '',
    },
    selectedPersona: persona ? { id: persona.id, name: persona.name, shortDescription: persona.shortDescription ?? '', claimRiskLevel: persona.claimRiskLevel ?? 'low', recommendedTone: persona.recommendedTone ?? '', defaultCTA: persona.defaultCTA ?? '' } : null,
    selectedTopic: topic ? { topicId: topic.topicId ?? topic.id, topicName: topic.topicName ?? topic.topic ?? '', topicCluster: topic.topicCluster ?? topic.category ?? '', defaultSearchIntent: topic.defaultSearchIntent ?? '', defaultCTA: topic.defaultCTA ?? '', claimRiskLevel: topic.claimRiskLevel ?? 'low', brandOrProductSignal: topic.brandOrProductSignal ?? '', linkIntent: topic.linkIntent ?? '', imageIntent: topic.imageIntent ?? '' } : null,
    selectedTopicId: topic?.topicId ?? topic?.id ?? null,
    selectedPlatformFormat: platformFormat,
    contentGoal,
  };

  const kwList = (workspace.keywordList ?? []).filter(k => k.status === 'active').slice(0, 200);
  const pages = workspace.discoveredPages ?? [];

  switch (step) {
    case 5: return {
      ...base,
      action: 'select-keywords-for-content',
      workspace: {
        workspaceId: workspace.id, brandName: workspace.brandName ?? '', websiteUrl: workspace.websiteUrl ?? '',
        industry: workspace.industry ?? '', businessType: workspace.businessType ?? '', targetMarket: workspace.targetMarket ?? '',
        targetCountries: workspace.targetCountries ?? [], brandDifferentiators: workspace.brandDifferentiators ?? '',
        complianceNotes: workspace.complianceNotes ?? '',
      },
      keywordList: kwList.map(k => ({
        keywordId: k.keywordId, keyword: k.keyword, normalizedKeyword: k.normalizedKeyword ?? k.keyword.toLowerCase(), tag: k.tag ?? 'generic',
        kd: k.kd ?? null, cpc: k.cpc ?? null, volume: k.volume ?? null,
        usage: {
          usedAsPrimaryCount: k.usage?.usedAsPrimaryCount ?? 0, usedAsSecondaryCount: k.usage?.usedAsSecondaryCount ?? 0,
          lastUsedAsPrimaryAt: k.usage?.lastUsedAsPrimaryAt ?? null, lastUsedAsSecondaryAt: k.usage?.lastUsedAsSecondaryAt ?? null,
          usedInContentIds: k.usage?.usedInContentIds ?? [],
        },
      })),
      selectedPersona: persona?.name ?? '',
      selectedTopic: topic?.topicName ?? topic?.topic ?? '',
      selectedTopicId: topic?.topicId ?? topic?.id ?? '',
      selectedPlatformFormat: platformFormat ?? '',
      sitemapPages: pages.slice(0, 50).map(p => p.url),
      priorPublishedContent: [],
      priorDraftContent: [],
      mcmWorkspaceRulesIfApplicable: workspace.id === 'mcm-ws-001' || workspace.id === 'mcm-default',
      allowPrimaryKeywordReuse: false,
    };
    case 6: return { ...base, action: 'generate-content-brief', approvedKeywordStrategy: project.keywordStrategy };
    case 7: {
      const isArticle = platformFormat === 'article-blog';
      return { ...base, action: isArticle ? 'generate-long-form-seo-content' : 'generate-platform-content', approvedKeywordStrategy: project.keywordStrategy, approvedContentBrief: project.contentBrief, platformFormat };
    }
    case 8: return { ...base, action: 'generate-internal-link-plan', generatedContent: project.rawContent ?? project.generatedArticle, approvedKeywordStrategy: project.keywordStrategy, sitemapPages: pages.map(p => ({ url: p.url, pageType: p.pageType, title: p.title, detectedBrand: p.detectedBrand ?? '', detectedProduct: p.detectedProduct ?? '' })) };
    case 9: return { ...base, action: 'generate-external-link-plan', generatedContent: project.rawContent ?? project.generatedArticle, approvedKeywordStrategy: project.keywordStrategy };
    case 10: return { ...base, action: 'inject-links', generatedContent: project.rawContent ?? project.generatedArticle, approvedInternalLinkPlan: project.internalLinkPlan, approvedExternalLinkPlan: project.externalLinkPlan };
    case 11: return { ...base, action: 'generate-image-plan', linkedContent: project.linkedContent ?? project.rawContent, approvedKeywordStrategy: project.keywordStrategy, imageReferencePages: pages.filter(p => ['product', 'collection', 'brand', 'local'].includes(p.pageType)).slice(0, 10).map(p => ({ url: p.url, pageType: p.pageType, title: p.title })) };
    case 12: return { ...base, action: 'generate-content-images', approvedImagePlan: project.imagePlan };
    default: return base;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResultDisplay({ step, data }: { step: number; data: any }) {
  if (!data) return null;
  const preview = (val: unknown): string => {
    if (typeof val === 'string') return val.slice(0, 500);
    return JSON.stringify(val, null, 2).slice(0, 800);
  };

  if (step === 5 && data.primaryKeyword) {
    return (
      <div style={{ fontSize: 12 }}>
        <div style={{ marginBottom: 8 }}><strong>Primary:</strong> <span style={{ color: '#00c875', fontWeight: 600 }}>{data.primaryKeyword}</span></div>
        {data.secondaryKeywords?.length > 0 && <div style={{ marginBottom: 8 }}><strong>Secondary:</strong> {data.secondaryKeywords.join(', ')}</div>}
        {data.reason && <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{data.reason}</div>}
      </div>
    );
  }
  if (step === 7 && (data.content || data.article || typeof data === 'string')) {
    const content = data.content ?? data.article ?? data;
    return (
      <div style={{ maxHeight: 300, overflow: 'auto', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
        {typeof content === 'string' ? content.slice(0, 2000) : preview(content)}
        {typeof content === 'string' && content.length > 2000 && <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>... ({content.length} chars total)</div>}
      </div>
    );
  }
  if (step === 12 && data.images) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {data.images.map((img: { imageUrl?: string; altText?: string }, i: number) => (
          <div key={i} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {img.imageUrl && <img src={img.imageUrl} alt={img.altText ?? `Image ${i + 1}`} style={{ width: '100%', height: 80, objectFit: 'cover' }} />}
            <div style={{ padding: 4, fontSize: 9, color: 'var(--text-muted)' }}>{img.altText ?? `Image ${i + 1}`}</div>
          </div>
        ))}
      </div>
    );
  }
  return <pre style={{ maxHeight: 300, overflow: 'auto', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 6 }}>{preview(data)}</pre>;
}

export function AIStep({ step, phase, workspace, project, persona, topic, platformFormat, contentGoal, onApprove }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = STEP_CONFIG[step];
  if (!config) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const rawPayload = buildPayload(step, project, workspace, persona, topic, platformFormat, contentGoal);
      // Safe serialize — strip circular refs and Zustand proxies
      let bodyStr: string;
      try {
        const seen = new WeakSet();
        bodyStr = JSON.stringify(rawPayload, (_key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return undefined; // skip circular
            seen.add(value);
          }
          return value;
        });
      } catch (serErr) {
        throw new Error(`Payload serialization failed: ${(serErr as Error).message}`);
      }
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');
      setResult(data);
    } catch (err) {
      console.error('[AIStep] Generation error:', err);
      setError((err as Error).message || 'Unknown error occurred');
    }
    setLoading(false);
  };

  return (
    <div className="seo-card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{config.title}</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>{config.desc}</p>

      {/* Context badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {persona && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(129,140,248,0.1)', color: 'var(--accent)' }}>👤 {persona.name}</span>}
        {topic && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(253,171,61,0.1)', color: '#fdab3d' }}>📚 {topic.topicName ?? topic.topic}</span>}
        {platformFormat && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(0,200,117,0.1)', color: '#00c875' }}>📡 {platformFormat}</span>}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'rgba(0,200,117,0.04)', border: '1px solid rgba(0,200,117,0.15)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#00c875', marginBottom: 8 }}>✓ Generated successfully</div>
          <ResultDisplay step={step} data={result} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {!result && !loading && (
          <button className="seo-btn seo-btn-primary" onClick={handleGenerate}>
            {phase?.icon} Generate {config.title}
          </button>
        )}
        {loading && (
          <button className="seo-btn seo-btn-primary" disabled style={{ opacity: 0.7 }}>
            <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Generating...
          </button>
        )}
        {result && (
          <>
            <button className="seo-btn seo-btn-ghost" onClick={handleGenerate}>
              <RotateCcw size={12} /> Regenerate
            </button>
            <button className="seo-btn seo-btn-primary" onClick={() => onApprove(result)}>
              <Check size={14} /> Approve & Continue
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
