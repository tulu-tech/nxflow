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
  const isMCM = workspace.id === 'mcm-ws-001' || workspace.id === 'mcm-default';

  // Shared workspace object — matches all prompt builder `workspace` fields
  const ws = {
    workspaceId: workspace.id, brandName: workspace.brandName ?? '', websiteUrl: workspace.websiteUrl ?? '',
    industry: workspace.industry ?? '', businessType: workspace.businessType ?? '', targetMarket: workspace.targetMarket ?? '',
    targetCountries: workspace.targetCountries ?? [], brandDifferentiators: workspace.brandDifferentiators ?? '',
    complianceNotes: workspace.complianceNotes ?? '', toneOfVoice: workspace.toneOfVoice ?? '', coreOffer: workspace.coreOffer ?? '',
    conversionGoals: '', primaryCTA: workspace.primaryCTA ?? '',
  };

  const personaName = persona?.name ?? '';
  const personaDesc = persona?.shortDescription ?? '';
  const topicName = topic?.topicName ?? topic?.topic ?? '';
  const topicId = topic?.topicId ?? topic?.id ?? '';

  // Extract keyword strategy as flat strings from project.keywordStrategy (which is the raw AI response)
  const ks = project.keywordStrategy as Record<string, unknown> | null;
  const pkObj = (ks?.primaryKeyword ?? {}) as Record<string, unknown>;
  const keywordStrategy = {
    primaryKeyword: (typeof pkObj === 'string' ? pkObj : pkObj?.keyword as string) ?? '',
    secondaryKeywords: Array.isArray(ks?.secondaryKeywords)
      ? (ks.secondaryKeywords as Array<Record<string, string>>).map(sk => typeof sk === 'string' ? sk : sk?.keyword ?? '').filter(Boolean)
      : [],
    searchIntent: (ks?.searchIntent as string) ?? '',
    funnelStage: (ks?.funnelStage as string) ?? '',
    commercialPriority: (ks?.commercialPriority as string) ?? '',
    claimRisk: (ks?.claimRisk as string) ?? 'Low',
    claimRiskNotes: (ks?.claimRiskNotes as string) ?? '',
    recommendedCTA: (ks?.recommendedCTA as string) ?? '',
    contentAngle: (ks?.contentAngle as string) ?? '',
  };

  // Extract content brief safely
  const cb = (project.contentBrief ?? {}) as Record<string, unknown>;
  const approvedContentBrief = {
    briefTitle: (cb.briefTitle as string) ?? '',
    angle: (cb.angle as string) ?? '',
    readerProblem: (cb.readerProblem as string) ?? '',
    decisionBarrierSolved: (cb.decisionBarrierSolved as string) ?? '',
    recommendedWordCount: (cb.recommendedWordCount as string) ?? '2,500–3,500 words',
    outline: Array.isArray(cb.outline) ? cb.outline as Array<{ level: string; text: string; notes?: string }> : [],
    faqPlan: Array.isArray(cb.faqPlan) ? cb.faqPlan as Array<{ question: string; answerDirection: string }> : [],
    recommendedCTA: (cb.recommendedCTA as string) ?? keywordStrategy.recommendedCTA,
    mustInclude: Array.isArray(cb.mustInclude) ? cb.mustInclude as string[] : [],
    mustAvoid: Array.isArray(cb.mustAvoid) ? cb.mustAvoid as string[] : [],
    qualityChecklist: Array.isArray(cb.qualityChecklist) ? cb.qualityChecklist as string[] : [],
    claimRiskGuidance: (cb.claimRiskGuidance as string) ?? '',
  };

  const kwList = (workspace.keywordList ?? []).filter(k => k.status === 'active').slice(0, 200);
  const pages = workspace.discoveredPages ?? [];

  // Base includes workspaceData for guardrails detection
  const base = {
    workspaceData: { id: workspace.id, brandName: ws.brandName },
    workspace: ws,
    selectedPersona: personaName,
    selectedPersonaDescription: personaDesc,
    selectedTopic: topicName,
    selectedTopicId: topicId,
    selectedPlatformFormat: platformFormat ?? '',
    contentGoal,
    mcmWorkspaceRulesIfApplicable: isMCM,
  };

  switch (step) {
    case 5: return {
      ...base,
      action: 'select-keywords-for-content',
      keywordList: kwList.map(k => ({
        keywordId: k.keywordId, keyword: k.keyword, normalizedKeyword: k.normalizedKeyword ?? k.keyword.toLowerCase(), tag: k.tag ?? 'generic',
        kd: k.kd ?? null, cpc: k.cpc ?? null, volume: k.volume ?? null,
        usage: {
          usedAsPrimaryCount: k.usage?.usedAsPrimaryCount ?? 0, usedAsSecondaryCount: k.usage?.usedAsSecondaryCount ?? 0,
          lastUsedAsPrimaryAt: k.usage?.lastUsedAsPrimaryAt ?? null, lastUsedAsSecondaryAt: k.usage?.lastUsedAsSecondaryAt ?? null,
          usedInContentIds: k.usage?.usedInContentIds ?? [],
        },
      })),
      sitemapPages: pages.slice(0, 50).map(p => p.url),
      priorPublishedContent: [],
      priorDraftContent: [],
      allowPrimaryKeywordReuse: false,
    };
    case 6: return {
      ...base,
      action: 'generate-content-brief',
      keywordStrategy,
      sitemapPages: pages.slice(0, 50).map(p => p.url),
      priorContent: [],
    };
    case 7: {
      const isArticle = platformFormat === 'article-blog';
      return {
        ...base,
        action: isArticle ? 'generate-long-form-seo-content' : 'generate-platform-content',
        platformFormat: platformFormat ?? '',
        approvedKeywordStrategy: keywordStrategy,
        approvedContentBrief,
      };
    }
    case 8: return {
      ...base,
      action: 'generate-internal-link-plan',
      generatedContent: project.rawContent ?? (project.generatedArticle as unknown as Record<string, unknown>)?.content ?? '',
      approvedKeywordStrategy: keywordStrategy,
      sitemapPages: pages.map(p => ({ url: p.url, pageType: p.pageType, title: p.title, detectedBrand: p.detectedBrand ?? '', detectedProduct: p.detectedProduct ?? '' })),
    };
    case 9: return { ...base, action: 'generate-external-link-plan', generatedContent: project.rawContent ?? (project.generatedArticle as unknown as Record<string, unknown>)?.content ?? '', approvedKeywordStrategy: keywordStrategy };
    case 10: return { ...base, action: 'inject-links', generatedContent: project.rawContent ?? (project.generatedArticle as unknown as Record<string, unknown>)?.content ?? '', approvedInternalLinkPlan: project.internalLinkPlan ?? [], approvedExternalLinkPlan: project.externalLinkPlan ?? [] };
    case 11: return { ...base, action: 'generate-image-plan', linkedContent: project.linkedContent ?? project.rawContent ?? '', approvedKeywordStrategy: keywordStrategy, imageReferencePages: pages.filter(p => ['product', 'collection', 'brand', 'local'].includes(p.pageType)).slice(0, 10).map(p => ({ url: p.url, pageType: p.pageType, title: p.title })) };
    case 12: {
      // project.imagePlan is the full response: { imagePlan: [...], warnings: [...] }
      const rawPlan = project.imagePlan;
      const planArray = Array.isArray(rawPlan) ? rawPlan : (rawPlan as unknown as Record<string, unknown>)?.imagePlan ?? [];
      return {
        ...base,
        action: 'generate-content-images',
        approvedImagePlan: planArray,
        approvedKeywordStrategy: keywordStrategy,
        // Pass sitemap product images as reference
        sitemapPages: pages.filter(p => ['product', 'collection', 'brand'].includes(p.pageType)).slice(0, 20).map(p => ({
          url: p.url, pageType: p.pageType, title: p.title,
          images: (p as unknown as Record<string, unknown>).images ?? [],
        })),
      };
    }
    default: return base;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResultDisplay({ step, data }: { step: number; data: any }) {
  if (!data) return null;

  const str = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return JSON.stringify(v, null, 2).slice(0, 600);
  };

  const label = (l: string, v: unknown) => v ? (
    <div style={{ marginBottom: 4 }}><strong>{l}:</strong> <span style={{ color: 'var(--text-secondary)' }}>{str(v)}</span></div>
  ) : null;

  // Step 5: Keywords
  if (step === 5) {
    const pk = data.primaryKeyword;
    const pkName = typeof pk === 'string' ? pk : pk?.keyword ?? '';
    const sks = Array.isArray(data.secondaryKeywords)
      ? data.secondaryKeywords.map((sk: unknown) => typeof sk === 'string' ? sk : (sk as Record<string, string>)?.keyword ?? '').filter(Boolean) : [];
    return (
      <div style={{ fontSize: 12 }}>
        <div style={{ marginBottom: 6 }}><strong>Primary:</strong> <span style={{ color: '#00c875', fontWeight: 700 }}>{pkName}</span> {pk?.tag && <span style={{ fontSize: 10, color: '#fdab3d' }}>({pk.tag})</span>}</div>
        {pk?.volume && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Vol: {pk.volume} · KD: {pk.kd ?? '?'} · CPC: ${pk.cpc ?? '?'}</div>}
        {sks.length > 0 && <div style={{ marginBottom: 6 }}><strong>Secondary ({sks.length}):</strong> <span style={{ fontSize: 11 }}>{sks.join(', ')}</span></div>}
        {pk?.reason && <div style={{ color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>{str(pk.reason)}</div>}
        {data.searchIntent && <div style={{ marginTop: 4, fontSize: 10 }}>Intent: {data.searchIntent} · Funnel: {data.funnelStage} · CTA: {data.recommendedCTA}</div>}
      </div>
    );
  }

  // Step 6: Content Brief
  if (step === 6) {
    const brief = data.brief ?? data;
    return (
      <div style={{ fontSize: 12 }}>
        {label('Brief Title', brief.briefTitle)}
        {label('Angle', brief.angle ?? brief.contentAngle)}
        {label('Primary Keyword', brief.primaryKeyword)}
        {label('Search Intent', brief.searchIntent)}
        {label('Funnel Stage', brief.funnelStage)}
        {label('Content Goal', brief.contentGoal)}
        {label('Recommended CTA', brief.recommendedCTA)}
        {label('Reader Problem', brief.readerProblem)}
        {label('Word Count', brief.recommendedWordCount)}
        {Array.isArray(brief.outline) && brief.outline.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <strong>Outline ({brief.outline.length} sections):</strong>
            <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid var(--border-subtle)', fontSize: 11 }}>
              {brief.outline.slice(0, 14).map((item: Record<string, string>, i: number) => (
                <div key={i} style={{ marginBottom: 2, color: item.level === 'h1' ? '#00c875' : item.level === 'h2' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: item.level === 'h3' ? 400 : 600, paddingLeft: item.level === 'h3' ? 12 : 0 }}>
                  [{item.level}] {item.text}
                </div>
              ))}
            </div>
          </div>
        )}
        {Array.isArray(brief.faqPlan) && brief.faqPlan.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <strong>FAQ Plan ({brief.faqPlan.length}):</strong>
            <div style={{ marginTop: 4, fontSize: 11 }}>
              {brief.faqPlan.slice(0, 5).map((faq: Record<string, string>, i: number) => (
                <div key={i} style={{ marginBottom: 4 }}><span style={{ color: '#fdab3d' }}>Q:</span> {faq.question}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 7: Generated Content
  if (step === 7) {
    const article = data.article ?? data;
    const content = article?.content ?? (typeof data === 'string' ? data : null);
    const title = article?.title ?? article?.metaTitle ?? data.title ?? '';
    const wordCount = article?.wordCount ?? data.wordCount;
    const slug = article?.slug;
    const metaDesc = article?.metaDescription;
    if (typeof content === 'string') {
      return (
        <div style={{ fontSize: 12 }}>
          {title && <div style={{ fontWeight: 700, marginBottom: 4, color: '#00c875', fontSize: 14 }}>{str(title)}</div>}
          {slug && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>/{slug}</div>}
          {metaDesc && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontStyle: 'italic' }}>{str(metaDesc)}</div>}
          {wordCount && <div style={{ fontSize: 10, color: '#00c875', marginBottom: 8 }}>📝 {wordCount} words</div>}
          <div style={{ maxHeight: 400, overflow: 'auto', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', padding: 12, background: 'rgba(0,0,0,0.08)', borderRadius: 6, fontSize: 12 }}>
            {content}
          </div>
        </div>
      );
    }
    return <pre style={{ maxHeight: 300, overflow: 'auto', fontSize: 10, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.08)', padding: 8, borderRadius: 6 }}>{str(data)}</pre>;
  }

  // Steps 8-9: Link Plans
  if (step === 8 || step === 9) {
    const links = step === 8
      ? (data.internalLinkPlan ?? data.internalLinks ?? data.links ?? (Array.isArray(data) ? data : null))
      : (data.externalLinkPlan ?? data.externalLinks ?? data.links ?? (Array.isArray(data) ? data : null));
    const label2 = step === 8 ? 'Internal' : 'External';
    if (Array.isArray(links)) {
      return (
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#00c875' }}>✅ {links.length} {label2} Links</div>
          {data.notes && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>{str(data.notes)}</div>}
          {links.slice(0, 10).map((link: Record<string, string>, i: number) => (
            <div key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: `2px solid ${link.priority === 'High' ? '#00c875' : link.priority === 'Medium' ? '#fdab3d' : 'var(--border-subtle)'}` }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{link.anchorText || link.anchor || link.pageTitle || `Link ${i+1}`}</div>
              <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 1 }}>🔗 {link.targetUrl || link.url}</div>
              {link.pageType && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#1e293b', color: '#94a3b8', marginRight: 4 }}>{link.pageType}</span>}
              {link.priority && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: link.priority === 'High' ? '#065f46' : link.priority === 'Medium' ? '#78350f' : '#1e293b', color: link.priority === 'High' ? '#6ee7b7' : link.priority === 'Medium' ? '#fcd34d' : '#94a3b8' }}>{link.priority}</span>}
              {(link.reason || link.placementReason) && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{link.reason || link.placementReason}</div>}
              {link.placementSection && <div style={{ fontSize: 10, color: '#fdab3d', marginTop: 1 }}>📍 {link.placementSection}</div>}
            </div>
          ))}
          {links.length > 10 && <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>+{links.length - 10} more...</div>}
        </div>
      );
    }
    return <pre style={{ maxHeight: 250, overflow: 'auto', fontSize: 10, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.08)', padding: 8, borderRadius: 6 }}>{str(data)}</pre>;
  }

  // Step 10: Link Injection
  if (step === 10) {
    const content = data.linkedContent ?? data.content ?? (typeof data === 'string' ? data : null);
    if (typeof content === 'string') {
      return (
        <div style={{ maxHeight: 400, overflow: 'auto', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', padding: 12, background: 'rgba(0,0,0,0.08)', borderRadius: 6 }}>
          {content}
        </div>
      );
    }
    return <pre style={{ maxHeight: 250, overflow: 'auto', fontSize: 10, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.08)', padding: 8, borderRadius: 6 }}>{str(data)}</pre>;
  }

  // Step 11: Image Plan
  if (step === 11) {
    const images = data.imagePlan ?? data.images ?? data.imagePrompts ?? (Array.isArray(data) ? data : null);
    if (Array.isArray(images)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 600, color: '#00c875' }}>🖼️ {images.length} Image Concepts</div>
          {images.map((img: Record<string, unknown>, i: number) => (
            <div key={i} style={{ padding: 10, borderRadius: 6, background: 'rgba(129,140,248,0.06)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>#{(img.imageNumber as number) ?? i+1} — {str(img.imagePurpose)} ({str(img.aspectRatio)})</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{str(img.placementRecommendation)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>Prompt: {str(img.imagePrompt).slice(0, 200)}...</div>
              {!!img.notes && <div style={{ fontSize: 10, color: '#fdab3d', marginTop: 2 }}>📝 {str(img.notes)}</div>}
            </div>
          ))}
          {Array.isArray(data.warnings) && data.warnings.length > 0 && (
            <div style={{ fontSize: 10, color: '#fdab3d', marginTop: 4 }}>⚠️ {(data.warnings as string[]).join(' · ')}</div>
          )}
        </div>
      );
    }
    return <pre style={{ maxHeight: 250, overflow: 'auto', fontSize: 10, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.08)', padding: 8, borderRadius: 6 }}>{str(data)}</pre>;
  }

  // Step 12: Generated Images
  if (step === 12) {
    const images = data.images ?? data.generatedImages ?? (Array.isArray(data) ? data : null);
    if (Array.isArray(images)) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {images.map((img: Record<string, string>, i: number) => (
            <div key={i} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              {img.imageUrl && <img src={img.imageUrl} alt={img.altText ?? `Image ${i + 1}`} style={{ width: '100%', height: 100, objectFit: 'cover' }} />}
              {!img.imageUrl && <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(129,140,248,0.06)', color: 'var(--text-muted)', fontSize: 10 }}>No URL</div>}
              <div style={{ padding: 4, fontSize: 9, color: 'var(--text-muted)' }}>{img.altText ?? `Image ${i + 1}`}</div>
            </div>
          ))}
        </div>
      );
    }
  }

  // Fallback: formatted JSON
  return <pre style={{ maxHeight: 300, overflow: 'auto', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.08)', padding: 10, borderRadius: 6 }}>{JSON.stringify(data, null, 2).slice(0, 1500)}</pre>;
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
        {persona && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#3730a3', color: '#c7d2fe', fontWeight: 500 }}>👤 {persona.name}</span>}
        {topic && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#78350f', color: '#fcd34d', fontWeight: 500 }}>📚 {topic.topicName ?? topic.topic}</span>}
        {platformFormat && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#065f46', color: '#6ee7b7', fontWeight: 500 }}>📡 {platformFormat}</span>}
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
