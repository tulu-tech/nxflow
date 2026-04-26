'use client';

import { useState } from 'react';
import type { SEOProject } from '@/lib/seo/types';
import type { SEOWorkspace, WorkspaceContentTopic, WorkspacePersona } from '@/lib/seo/workspaceTypes';
import { useSEOStore } from '@/store/seoStore';
import { CONTENT_PHASES, CONTENT_FORMATS, CONTENT_GOALS, type ContentFormatType } from '@/lib/seo/contentFlowTypes';
import { MCM_WORKSPACE_ID } from '@/lib/seo/seeds/mcm';
import { MCM_PERSONA_TOPIC_MAP } from '@/lib/seo/seeds/mcmPersonaTopics';
import { AIStep } from './AIStep';
import { ChevronLeft, ChevronRight, Check, RotateCcw } from 'lucide-react';

interface Props {
  project: SEOProject;
  workspace: SEOWorkspace;
  onBack: () => void;
}

// ─── Phase Nav (horizontal stepper) ──────────────────────────────────────────

function WizardNav({ step, maxStep }: { step: number; maxStep: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
      {CONTENT_PHASES.map((p) => {
        const done = p.step < step;
        const active = p.step === step;
        const locked = p.step > maxStep;
        return (
          <div key={p.step} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
            borderRadius: 6, fontSize: 11, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
            background: active ? '#3730a3' : done ? 'rgba(0,200,117,0.08)' : 'transparent',
            color: active ? '#c7d2fe' : done ? '#00c875' : locked ? 'var(--text-muted)' : 'var(--text-secondary)',
            border: active ? '1px solid #6366f1' : '1px solid transparent',
            opacity: locked ? 0.4 : 1,
          }}>
            <span style={{ fontSize: 13 }}>{done ? '✓' : p.icon}</span>
            <span>{p.shortLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step Wrapper ────────────────────────────────────────────────────────────

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="seo-card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>{subtitle}</p>}
      {children}
    </div>
  );
}

// ─── Radio Option ────────────────────────────────────────────────────────────

function RadioOption({ selected, label, sub, badge, badgeColor, onClick }: {
  selected: boolean; label: string; sub?: string; badge?: string; badgeColor?: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6,
      fontSize: 12, textAlign: 'left', width: '100%', cursor: 'pointer', transition: 'all 0.12s',
      border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
      background: selected ? 'rgba(129,140,248,0.08)' : 'transparent', color: 'var(--text-primary)',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 8, flexShrink: 0,
        border: selected ? '5px solid var(--accent)' : '2px solid var(--border)',
        background: selected ? '#fff' : 'transparent',
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{sub}</div>}
      </div>
      {badge && (
        <span style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
          background: badgeColor === 'red' ? 'rgba(239,68,68,0.12)' : badgeColor === 'yellow' ? 'rgba(253,171,61,0.12)' : 'rgba(0,200,117,0.08)',
          color: badgeColor === 'red' ? '#f87171' : badgeColor === 'yellow' ? '#fdab3d' : '#00c875',
        }}>{badge}</span>
      )}
    </button>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export function ContentCreationWizard({ project, workspace, onBack }: Props) {
  const { updateProjectField } = useSEOStore();
  const pid = project.id;

  // Calculate initial step — skip steps already completed during project creation
  const initialStep = (() => {
    if (project.targetPersonaId && project.targetTopicId && project.selectedPlatformFormat) return 4;
    if (project.targetPersonaId && project.targetTopicId) return 3;
    if (project.targetPersonaId) return 2;
    return 1;
  })();

  const [step, setStep] = useState(initialStep);
  const [maxStep, setMaxStep] = useState(initialStep);

  // Local selections (persisted to store on advance)
  const [personaId, setPersonaId] = useState<string | null>(project.targetPersonaId);
  const [topicId, setTopicId] = useState<string | null>(project.targetTopicId);
  const [platformFormat, setPlatformFormat] = useState<string | null>(project.selectedPlatformFormat);
  const [contentGoal, setContentGoal] = useState<string>(project.contentGoal ?? '');
  const [customGoal, setCustomGoal] = useState('');

  // Derived
  const isMCM = workspace.id === MCM_WORKSPACE_ID;
  const persona: WorkspacePersona | undefined = workspace.personas.find((p) => p.id === personaId);
  const topic: WorkspaceContentTopic | undefined = workspace.contentTopics.find((t) => (t.topicId ?? t.id) === topicId);

  const allowedTopicIds = isMCM && personaId ? (MCM_PERSONA_TOPIC_MAP[personaId] ?? []) : [];
  const filteredTopics = isMCM && personaId
    ? workspace.contentTopics.filter((t) => allowedTopicIds.includes(t.topicId ?? t.id))
    : workspace.contentTopics;

  // Navigation
  const canAdvance = (): boolean => {
    if (step === 1) return !!personaId;
    if (step === 2) return !!topicId;
    if (step === 3) return !!platformFormat;
    if (step === 4) return true; // optional
    return true;
  };

  const goNext = () => {
    if (!canAdvance()) return;
    // Persist to store
    if (step === 1) updateProjectField(pid, 'targetPersonaId', personaId);
    if (step === 2) updateProjectField(pid, 'targetTopicId', topicId);
    if (step === 3) updateProjectField(pid, 'selectedPlatformFormat', platformFormat);
    if (step === 4) updateProjectField(pid, 'contentGoal', contentGoal || customGoal || null);
    const next = step + 1;
    setStep(next);
    setMaxStep(Math.max(maxStep, next));
  };

  const goBack2 = () => { if (step > 1) setStep(step - 1); else onBack(); };

  const phase = CONTENT_PHASES[step - 1];

  // Smart goal defaults
  const getDefaultGoals = (): string[] => {
    const goals: string[] = [];
    if (topic) {
      const cluster = topic.topicCluster ?? topic.category;
      if (cluster?.includes('Local')) goals.push('Drive showroom visit', 'Generate local SEO traffic');
      if (cluster?.includes('Comparison') || cluster?.includes('Best')) goals.push('Compare models', 'Educate buyer');
      if (cluster?.includes('Price')) goals.push('Handle price objection', 'Reduce purchase risk');
      if (cluster?.includes('Warranty')) goals.push('Explain warranty/service', 'Reduce purchase risk');
      if (cluster?.includes('Brand') || cluster?.includes('Review')) goals.push('Build brand awareness', 'Book demo');
      if (cluster?.includes('Comfort') || cluster?.includes('Pain')) goals.push('Book demo', 'Educate buyer');
      if (cluster?.includes('Feature')) goals.push('Educate buyer', 'Compare models');
      if (cluster?.includes('Lifestyle') || cluster?.includes('Luxury')) goals.push('Build brand awareness', 'Drive showroom visit');
      if (cluster?.includes('AI Search')) goals.push('Generate local SEO traffic', 'Build brand awareness');
      if (cluster?.includes('Delivery') || cluster?.includes('Space')) goals.push('Reduce purchase risk');
    }
    // Fill with defaults
    for (const g of CONTENT_GOALS) { if (!goals.includes(g)) goals.push(g); }
    return goals.slice(0, 10);
  };



  return (
    <div>
      <WizardNav step={step} maxStep={maxStep} />

      {/* Step header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{phase?.icon}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Step {step}: {phase?.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Step {step} of {CONTENT_PHASES.length}
          </div>
        </div>
      </div>

      {/* ── STEP 1: Persona ── */}
      {step === 1 && (
        <StepCard title="Who is this content for?" subtitle="Select the target persona for this content piece.">
          <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {workspace.personas.length > 0 ? workspace.personas.map((p) => (
              <RadioOption
                key={p.id}
                selected={personaId === p.id}
                label={p.name}
                sub={p.shortDescription}
                badge={p.claimRiskLevel}
                badgeColor={p.claimRiskLevel === 'high' ? 'red' : p.claimRiskLevel === 'medium' ? 'yellow' : 'green'}
                onClick={() => { setPersonaId(p.id); setTopicId(null); }}
              />
            )) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No personas configured in this workspace.
              </div>
            )}
          </div>
        </StepCard>
      )}

      {/* ── STEP 2: Topic ── */}
      {step === 2 && (
        <StepCard title="What topic should this content cover?" subtitle={`Showing primary topics for ${persona?.name ?? 'selected persona'}.`}>
          {filteredTopics.length > 0 ? (
            <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredTopics.map((t) => (
                <RadioOption
                  key={t.topicId ?? t.id}
                  selected={topicId === (t.topicId ?? t.id)}
                  label={t.topicName ?? t.topic}
                  sub={[t.topicCluster ?? t.category, t.brandOrProductSignal, t.defaultSearchIntent].filter(Boolean).join(' · ')}
                  badge={t.claimRiskLevel}
                  badgeColor={t.claimRiskLevel === 'high' ? 'red' : t.claimRiskLevel === 'medium' ? 'yellow' : 'green'}
                  onClick={() => setTopicId(t.topicId ?? t.id)}
                />
              ))}
            </div>
          ) : (
            <div style={{
              padding: '12px 16px', borderRadius: 6, background: 'rgba(253,171,61,0.06)',
              border: '1px solid rgba(253,171,61,0.15)', color: '#fdab3d', fontSize: 12,
            }}>
              No primary topics configured for this persona.
            </div>
          )}
        </StepCard>
      )}

      {/* ── STEP 3: Platform / Format ── */}
      {step === 3 && (
        <StepCard title="Where will this content be published?" subtitle="Select the platform and format for this content.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {CONTENT_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPlatformFormat(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  borderRadius: 6, fontSize: 12, textAlign: 'left', cursor: 'pointer',
                  border: platformFormat === f.id ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
                  background: platformFormat === f.id ? 'rgba(129,140,248,0.08)' : 'transparent',
                  color: 'var(--text-primary)', transition: 'all 0.12s',
                }}
              >
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{f.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.description}</div>
                </div>
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {/* ── STEP 4: Content Goal ── */}
      {step === 4 && (
        <StepCard title="What is the goal of this content?" subtitle="Optional — smart defaults based on your selections. You can also type a custom goal.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {getDefaultGoals().map((g) => (
              <RadioOption
                key={g}
                selected={contentGoal === g}
                label={g}
                onClick={() => { setContentGoal(g); setCustomGoal(''); }}
              />
            ))}
          </div>
          <div>
            <label className="seo-label" style={{ fontSize: 11 }}>Custom Goal (optional)</label>
            <input
              className="seo-input"
              value={customGoal}
              onChange={(e) => { setCustomGoal(e.target.value); setContentGoal(''); }}
              placeholder="Type a custom content goal..."
              style={{ fontSize: 12 }}
            />
          </div>
        </StepCard>
      )}

      {/* ── STEPS 5–12: Live AI Steps ── */}
      {step >= 5 && step <= 12 && (
        <AIStep
          key={step}
          step={step}
          phase={phase}
          workspace={workspace}
          project={project}
          persona={persona}
          topic={topic}
          platformFormat={platformFormat}
          contentGoal={contentGoal || customGoal}
          onApprove={(data) => {
            // Persist to project store
            if (step === 5) updateProjectField(pid, 'keywordStrategy', data);
            if (step === 6) updateProjectField(pid, 'contentBrief', data);
            if (step === 7) { updateProjectField(pid, 'rawContent', data?.content ?? data); updateProjectField(pid, 'generatedArticle', data); }
            if (step === 8) updateProjectField(pid, 'internalLinkPlan', data);
            if (step === 9) updateProjectField(pid, 'externalLinkPlan', data);
            if (step === 10) updateProjectField(pid, 'linkedContent', data?.content ?? data);
            if (step === 11) updateProjectField(pid, 'imagePlan', data);
            if (step === 12) updateProjectField(pid, 'finalOutput', data);
            goNext();
          }}
        />
      )}

      {/* ── Navigation Footer ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <button className="seo-btn seo-btn-ghost" onClick={goBack2}>
          <ChevronLeft size={14} /> {step === 1 ? 'Back to Workspace' : 'Previous'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step <= 4 && (
            <button
              className="seo-btn seo-btn-primary"
              onClick={goNext}
              disabled={!canAdvance()}
            >
              Continue <ChevronRight size={14} />
            </button>
          )}
          {step > 4 && step < 12 && (
            <button className="seo-btn seo-btn-primary" onClick={goNext}>
              Next Step <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
