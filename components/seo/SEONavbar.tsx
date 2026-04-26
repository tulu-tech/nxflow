'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
import { useSEOStore } from '@/store/seoStore';

export function SEONavbar() {
  const pathname = usePathname();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const projects = useSEOStore((s) => s.projects);

  // Extract IDs from path
  const wsMatch = pathname.match(/\/seoagent\/workspace\/([^/]+)/);
  const projMatch = pathname.match(/\/project\/([^/]+)/);
  const wsId = wsMatch?.[1];
  const projId = projMatch?.[1];

  const workspace = wsId ? workspaces[wsId] : null;
  const project = projId ? projects[projId] : null;

  return (
    <nav className="seo-navbar">
      <div className="seo-navbar-left">
        <Link href="/seoagent" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="seo-navbar-logo">N</div>
          <span className="seo-navbar-title">NXFlow</span>
        </Link>
        <span className="seo-navbar-badge">SEO Agent</span>

        {/* Breadcrumb */}
        {workspace && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, opacity: 0.4, margin: '0 4px' }}>›</span>
            <Link
              href={`/seoagent/workspace/${wsId}`}
              style={{
                fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none',
                maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {workspace.brandName}
            </Link>
          </>
        )}
        {project && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, opacity: 0.4, margin: '0 4px' }}>›</span>
            <span style={{
              fontSize: 12, color: 'var(--text-secondary)',
              maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {project.name}
            </span>
          </>
        )}
      </div>
      <div className="seo-navbar-right">
        <Link
          href="/"
          className="seo-btn seo-btn-ghost"
          title="Back to Workspace"
          style={{ fontSize: 12, gap: 4, textDecoration: 'none' }}
        >
          ← Home
        </Link>
      </div>
    </nav>
  );
}
