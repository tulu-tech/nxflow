'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSEOStore } from '@/store/seoStore';
import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
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

export default function WorkspaceProjectPage() {
  const params = useParams();
  const router = useRouter();
  const wid = params.id as string;
  const pid = params.pid as string;

  const workspace = useWorkspaceStore((s) => s.workspaces[wid]);
  const project = useSEOStore((s) => s.projects[pid]);
  const {
    updateBrandIntake, setPhase, updateKeywords,
    setPrimaryKeyword, setSecondaryKeywords,
    setBriefSelections, setUserBriefInput, updateContentBrief, setArticleOutline,
    setWritingPrompt, setGeneratedArticle, setImagePrompts,
    setLinkPlan, updateRevisionNotes,
  } = useSEOStore();

  const [viewPhase, setViewPhase] = useState(1);

  useEffect(() => {
    if (project) setViewPhase(project.currentPhase);
  }, [project?.currentPhase]);

  if (!workspace) {
    return (
      <div className="seo-empty-state" style={{ marginTop: 80 }}>
        <div className="seo-empty-state-icon">🔍</div>
        <div className="seo-empty-state-title">Workspace not found</div>
        <button className="seo-btn seo-btn-primary" onClick={() => router.push('/seoagent')}>
          ← Back to Workspaces
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="seo-empty-state" style={{ marginTop: 80 }}>
        <div className="seo-empty-state-icon">🔍</div>
        <div className="seo-empty-state-title">Project not found</div>
        <button className="seo-btn seo-btn-primary" onClick={() => router.push(`/seoagent/workspace/${wid}`)}>
          ← Back to {workspace.brandName}
        </button>
      </div>
    );
  }

  const goNext = () => {
    const nextPhase = viewPhase === 4 ? 6 : viewPhase + 1;
    const next = Math.max(project.currentPhase, nextPhase);
    setPhase(pid, next);
    setViewPhase(nextPhase);
  };

  const goBack = () => {
    const prevPhase = viewPhase === 6 ? 4 : Math.max(1, viewPhase - 1);
    setViewPhase(prevPhase);
  };

  const handleIntakeChange = (field: keyof BrandIntake, value: unknown) => {
    updateBrandIntake(pid, { [field]: value } as Partial<BrandIntake>);
  };

  const isFromWorkspace = !!project.workspaceId;
  const currentPhaseConfig = PHASES[viewPhase - 1];

  return (
    <div>
      {/* Project header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button
          className="seo-btn seo-btn-ghost"
          onClick={() => router.push(`/seoagent/workspace/${wid}`)}
          style={{ padding: '6px 8px' }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
            <span
              style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
              onClick={() => router.push(`/seoagent/workspace/${wid}`)}
            >
              {workspace.brandName}
            </span>
            <span style={{ margin: '0 6px', opacity: 0.5 }}>›</span>
            <span>{project.name}</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
            {project.name}
          </h2>
        </div>
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
            isFromWorkspace={isFromWorkspace}
          />
        )}

        {viewPhase === 2 && (
          <KeywordUpload
            keywords={project.keywords}
            onUpdateKeywords={(kws) => updateKeywords(pid, kws)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 3 && (
          <KeywordReview
            keywords={project.keywords}
            onUpdateKeywords={(kws) => updateKeywords(pid, kws)}
            onSetPrimary={(kw) => setPrimaryKeyword(pid, kw)}
            onSetSecondary={(kws) => setSecondaryKeywords(pid, kws)}
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
            briefSelections={project.briefSelections ?? { contentTopics: [], targetOrganizations: [], targetJobTitles: [], contentFormat: [] }}
            onSetBriefSelections={(s) => setBriefSelections(pid, s)}
            userBriefInput={project.userBriefInput ?? ''}
            onSetUserBriefInput={(v) => setUserBriefInput(pid, v)}
            onUpdateBrief={(brief) => updateContentBrief(pid, brief)}
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
            onSetPrompt={(prompt) => setWritingPrompt(pid, prompt)}
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
            onSetArticle={(article) => setGeneratedArticle(pid, article)}
            onSetOutline={(outline) => setArticleOutline(pid, outline)}
            onSetWritingPrompt={(prompt) => setWritingPrompt(pid, prompt)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 7 && (
          <ImageGenerator
            prompts={project.imagePrompts}
            article={project.generatedArticle}
            brandIntake={project.brandIntake}
            onSetPrompts={(prompts) => setImagePrompts(pid, prompts)}
            onSetArticle={(article) => setGeneratedArticle(pid, article)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 8 && (
          <LinkPlanner
            linkPlan={project.linkPlan}
            article={project.generatedArticle}
            brandIntake={project.brandIntake}
            onSetPlan={(plan) => setLinkPlan(pid, plan)}
            onSetArticle={(article) => setGeneratedArticle(pid, article)}
            onContinue={goNext}
            onBack={goBack}
          />
        )}

        {viewPhase === 9 && (
          <RevisionWorkspace
            notes={project.revisionNotes}
            onUpdateNotes={(notes) => updateRevisionNotes(pid, notes)}
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
