'use client';

import { SEOProject, PHASES } from '@/lib/seo/types';
import { useSEOStore } from '@/store/seoStore';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface Props {
  project: SEOProject;
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

const statusClasses: Record<string, string> = {
  draft: 'seo-badge-draft',
  'in-progress': 'seo-badge-progress',
  completed: 'seo-badge-completed',
};

export function ProjectCard({ project }: Props) {
  const router = useRouter();
  const { deleteProject } = useSEOStore();

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div
      className="seo-card seo-card-clickable"
      onClick={() => router.push(`/seoagent/project/${project.id}`)}
    >
      <div className="seo-project-card-header">
        <span className="seo-project-card-name">{project.name}</span>
        <span className={`seo-badge ${statusClasses[project.status]}`}>
          {statusLabels[project.status]}
        </span>
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        Phase {project.currentPhase} — {PHASES[project.currentPhase - 1]?.label}
      </div>

      {/* Phase progress dots */}
      <div className="seo-project-card-phase">
        {PHASES.map((phase) => (
          <div
            key={phase.id}
            className={`seo-project-card-phase-dot ${
              phase.id < project.currentPhase
                ? 'completed'
                : phase.id === project.currentPhase
                ? 'active'
                : ''
            }`}
          />
        ))}
      </div>

      <div className="seo-project-card-meta">
        <span>Updated {relTime(project.updatedAt)}</span>
        <span style={{ flex: 1 }} />
        <button
          className="seo-btn seo-btn-ghost"
          style={{ padding: 4 }}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this project?')) deleteProject(project.id);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
