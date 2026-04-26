'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
import { WorkspaceDashboard } from '@/components/seo/WorkspaceDashboard';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const workspace = useWorkspaceStore((s) => s.workspaces[id]);

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

  return <WorkspaceDashboard workspace={workspace} />;
}
