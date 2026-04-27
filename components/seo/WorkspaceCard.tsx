'use client';

import type { SEOWorkspace } from '@/lib/seo/workspaceTypes';
import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
import { useSEOStore } from '@/store/seoStore';
import { useRouter } from 'next/navigation';
import { Trash2, Globe, Tag, FileText } from 'lucide-react';

interface Props {
  workspace: SEOWorkspace;
}

export function WorkspaceCard({ workspace }: Props) {
  const router = useRouter();
  const { deleteWorkspace } = useWorkspaceStore();
  const projects = useSEOStore((s) => s.projects);

  const projectCount = workspace.projectIds.filter((pid) => projects[pid]).length;
  const kwCount = workspace.keywordList.length;
  const enabledPlatforms = workspace.platforms.filter((p) => p.enabled).length;

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
      onClick={() => router.push(`/seoagent/workspace/${workspace.id}`)}
    >
      <div className="seo-project-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {workspace.brandName.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="seo-project-card-name">{workspace.brandName}</span>
            {workspace.clientName !== workspace.brandName && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {workspace.clientName}
              </div>
            )}
          </div>
        </div>
        {workspace.industry && (
          <span className="seo-badge seo-badge-progress" style={{ fontSize: 10 }}>
            {workspace.industry}
          </span>
        )}
      </div>

      {workspace.websiteUrl && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Globe size={11} />
          {workspace.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 16, marginTop: 12, paddingTop: 10,
        borderTop: '1px solid var(--border-subtle)', fontSize: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <Tag size={11} />
          <span style={{ fontWeight: 600, color: kwCount > 0 ? '#00c875' : 'var(--text-muted)' }}>
            {kwCount}
          </span>
          keywords
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <FileText size={11} />
          <span style={{ fontWeight: 600, color: projectCount > 0 ? '#818cf8' : 'var(--text-muted)' }}>
            {projectCount}
          </span>
          projects
        </div>
        {enabledPlatforms > 0 && (
          <div style={{ color: 'var(--text-muted)' }}>
            {enabledPlatforms} platforms
          </div>
        )}
      </div>

      <div className="seo-project-card-meta">
        <span>Updated {relTime(workspace.updatedAt)}</span>
        <span style={{ flex: 1 }} />
        <button
          className="seo-btn seo-btn-ghost"
          style={{ padding: 4 }}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete workspace "${workspace.brandName}"?`)) deleteWorkspace(workspace.id);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
