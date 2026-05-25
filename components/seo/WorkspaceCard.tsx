'use client';

import type { SEOWorkspace } from '@/lib/seo/workspaceTypes';
import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
import { useSEOStore } from '@/store/seoStore';
import { useRouter } from 'next/navigation';
import { Trash2, Globe, Tag, FileText, Layers, ArrowUpRight } from 'lucide-react';

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

  // Generate a color from workspace name for consistent branding
  const colors = [
    { bg: 'linear-gradient(135deg, #6366f1, #818cf8)', glow: 'rgba(99,102,241,0.2)' },
    { bg: 'linear-gradient(135deg, #059669, #10b981)', glow: 'rgba(16,185,129,0.2)' },
    { bg: 'linear-gradient(135deg, #e11d48, #f43f5e)', glow: 'rgba(225,29,72,0.2)' },
    { bg: 'linear-gradient(135deg, #0891b2, #06b6d4)', glow: 'rgba(8,145,178,0.2)' },
    { bg: 'linear-gradient(135deg, #d97706, #f59e0b)', glow: 'rgba(245,158,11,0.2)' },
    { bg: 'linear-gradient(135deg, #7c3aed, #a78bfa)', glow: 'rgba(124,58,237,0.2)' },
  ];
  const colorIdx = workspace.brandName.charCodeAt(0) % colors.length;
  const color = colors[colorIdx];

  return (
    <div
      className="seo-workspace-card"
      onClick={() => router.push(`/seoagent/workspace/${workspace.id}`)}
    >
      {/* Top accent line */}
      <div className="seo-workspace-card-accent" style={{ background: color.bg }} />

      {/* Header */}
      <div className="seo-workspace-card-header">
        <div className="seo-workspace-card-avatar" style={{ background: color.bg, boxShadow: `0 4px 14px ${color.glow}` }}>
          {workspace.brandName.charAt(0).toUpperCase()}
        </div>
        <div className="seo-workspace-card-title-group">
          <span className="seo-workspace-card-name">{workspace.brandName}</span>
          {workspace.websiteUrl && (
            <div className="seo-workspace-card-url">
              <Globe size={10} />
              {workspace.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </div>
          )}
        </div>
        <button
          className="seo-workspace-card-delete"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete workspace "${workspace.brandName}"?`)) deleteWorkspace(workspace.id);
          }}
          title="Delete workspace"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Industry tags */}
      {workspace.industry && (
        <div className="seo-workspace-card-tags">
          {workspace.industry.split(',').map((tag, i) => (
            <span key={i} className="seo-workspace-card-tag">{tag.trim()}</span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="seo-workspace-card-stats">
        <div className="seo-workspace-card-stat">
          <Tag size={12} />
          <span className="seo-workspace-card-stat-value" data-active={kwCount > 0}>
            {kwCount.toLocaleString()}
          </span>
          <span>keywords</span>
        </div>
        <div className="seo-workspace-card-stat">
          <FileText size={12} />
          <span className="seo-workspace-card-stat-value" data-active={projectCount > 0}>
            {projectCount}
          </span>
          <span>projects</span>
        </div>
        {enabledPlatforms > 0 && (
          <div className="seo-workspace-card-stat">
            <Layers size={12} />
            <span className="seo-workspace-card-stat-value" data-active={true}>
              {enabledPlatforms}
            </span>
            <span>platforms</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="seo-workspace-card-footer">
        <span className="seo-workspace-card-updated">Updated {relTime(workspace.updatedAt)}</span>
        <div className="seo-workspace-card-open">
          Open <ArrowUpRight size={12} />
        </div>
      </div>
    </div>
  );
}
