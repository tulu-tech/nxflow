'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSEOStore } from '@/store/seoStore';
import { PhaseNav } from '@/components/seo/PhaseNav';
import { BrandIntakeForm } from '@/components/seo/BrandIntakeForm';
import { KeywordUpload } from '@/components/seo/KeywordUpload';
import { KeywordReview } from '@/components/seo/KeywordReview';
import { ContentBrief } from '@/components/seo/ContentBrief';
import { WritingPrompt } from '@/components/seo/WritingPrompt';
import { ContentGenerator } from '@/components/seo/ContentGenerator';
import { ImageGenerator } from '@/components/seo/ImageGenerator';
import { LinkPlanner } from '@/components/seo/LinkPlanner';
import { RevisionWorkspace } from '@/components/seo/RevisionWorkspace';
import { FinalOutput } from '@/components/seo/FinalOutput';
import { PHASES, BrandIntake } from '@/lib/seo/types';
import { useState, useEffect } from 'react';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const project = useSEOStore((s) => s.projects[id]);
  const {
    updateBrandIntake, setPhase, updateKeywords,
    setPrimaryKeyword, setSecondaryKeywords,
    setUserBriefInput, updateContentBrief, setArticleOutline,
    setWritingPrompt, setGeneratedArticle, setImagePrompts,
    setLinkPlan, updateRevisionNotes,
  } = useSEOStore();

  const [viewPhase, setViewPhase] = useState(1);

  useEffect(() => {
    if (project) setViewPhase(project.currentPhase);
  }, [project?.currentPhase]);

  if (!project) {
    return (
      <div className="seo-empty-state" style={{ marginTop: 80 }}>
        <div className="seo-empty-state-icon">🔍</div>
        <div className="seo-empty-state-title">Project not found</div>
        <button className="seo-btn seo-btn-primary" onClick={() => router.push('/seoagent')}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const goNext = () => {
    const next = Math.max(project.currentPhase, viewPhase + 1);
    setPhase(id, next);
    setViewPhase(viewPhase + 1);
  };

  const goBack = () => {
    setViewPhase(Math.max(1, viewPhase - 1));
  };

  const handleIntakeChange = (field: keyof BrandIntake, value: unknown) => {
    updateBrandIntake(id, { [field]: value } as Partial<BrandIntake>);
  };

  const currentPhaseConfig = PHASES[viewPhase - 1];

  return (
    <div>
      {/* Project header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button className="seo-btn seo-btn-ghost" onClick={() => router.push('/seoagent')} style={{ padding: '6px 8px' }}>
          ←
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
          {project.name}
        </h2>
        <span className={`seo-badge ${
          project.status === 'completed' ? 'seo-badge-completed' :
          project.status === 'in-progress' ? 'seo-badge-progress' : 'seo-badge-draft'
        }`}>
          {project.status}
        </span>
      </div>

      <PhaseNav currentPhase={viewPhase} onSelectPhase={setViewPhase} />

      {/* Phase title */}
      <div className="seo-phase-wrapper">
        <div className="seo-phase-header">
          <div className="seo-phase-title">
            {currentPhaseConfig?.icon} {currentPhaseConfig?.label}
          </div>
          <p className="seo-phase-desc">
            Phase {viewPhase} of {PHASES.length}
          </p>
        </div>

        {/* Phase content */}
        {viewPhase === 1 && (
          <BrandIntakeForm
            intake={project.brandIntake}
            onChange={handleIntakeChange}
            onContinue={goNext}
          />
        )}

        {viewPhase === 2 && (
          <KeywordUpload
            keywords={project.keywords}
            onUpdateKeywords={(kws) => updateKeywords(id, kws)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 3 && (
          <KeywordReview
            keywords={project.keywords}
            onUpdateKeywords={(kws) => updateKeywords(id, kws)}
            onSetPrimary={(kw) => setPrimaryKeyword(id, kw)}
            onSetSecondary={(kws) => setSecondaryKeywords(id, kws)}
            primaryKeyword={project.primaryKeyword}
            secondaryKeywords={project.secondaryKeywords}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 4 && (
          <ContentBrief
            brief={project.contentBrief}
            brandIntake={project.brandIntake}
            primaryKeyword={project.primaryKeyword}
            secondaryKeywords={project.secondaryKeywords}
            keywords={project.keywords}
            userBriefInput={project.userBriefInput ?? ''}
            onSetUserBriefInput={(v) => setUserBriefInput(id, v)}
            onUpdateBrief={(brief) => updateContentBrief(id, brief)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 5 && (
          <WritingPrompt
            prompt={project.writingPrompt}
            brief={project.contentBrief}
            brandIntake={project.brandIntake}
            primaryKeyword={project.primaryKeyword}
            secondaryKeywords={project.secondaryKeywords}
            onSetPrompt={(prompt) => setWritingPrompt(id, prompt)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 6 && (
          <ContentGenerator
            article={project.generatedArticle}
            articleOutline={project.articleOutline ?? null}
            writingPrompt={project.writingPrompt}
            brief={project.contentBrief}
            brandIntake={project.brandIntake}
            primaryKeyword={project.primaryKeyword}
            secondaryKeywords={project.secondaryKeywords}
            userBriefInput={project.userBriefInput ?? ''}
            onSetArticle={(article) => setGeneratedArticle(id, article)}
            onSetOutline={(outline) => setArticleOutline(id, outline)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 7 && (
          <ImageGenerator
            prompts={project.imagePrompts}
            article={project.generatedArticle}
            brandIntake={project.brandIntake}
            onSetPrompts={(prompts) => setImagePrompts(id, prompts)}
            onSetArticle={(article) => setGeneratedArticle(id, article)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 8 && (
          <LinkPlanner
            linkPlan={project.linkPlan}
            article={project.generatedArticle}
            brandIntake={project.brandIntake}
            onSetPlan={(plan) => setLinkPlan(id, plan)}
            onSetArticle={(article) => setGeneratedArticle(id, article)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 9 && (
          <RevisionWorkspace
            notes={project.revisionNotes}
            onUpdateNotes={(notes) => updateRevisionNotes(id, notes)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 10 && (
          <FinalOutput
            project={project}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  );
}
