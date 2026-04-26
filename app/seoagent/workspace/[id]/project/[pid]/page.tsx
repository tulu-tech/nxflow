'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSEOStore } from '@/store/seoStore';
import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
import { ContentCreationWizard } from '@/components/seo/ContentCreationWizard';

export default function WorkspaceProjectPage() {
  const params = useParams();
  const router = useRouter();
  const wid = params.id as string;
  const pid = params.pid as string;

  const workspace = useWorkspaceStore((s) => s.workspaces[wid]);
  const project = useSEOStore((s) => s.projects[pid]);

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

  return (
    <div>
      {/* Project header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          className="seo-btn seo-btn-ghost"
          onClick={() => router.push(`/seoagent/workspace/${wid}`)}
          style={{ padding: '6px 8px' }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
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

      {/* New 12-step wizard */}
      <ContentCreationWizard
        project={project}
        workspace={workspace}
        onBack={() => router.push(`/seoagent/workspace/${wid}`)}
      />
    </div>
  );
}
