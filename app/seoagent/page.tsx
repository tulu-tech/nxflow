'use client';

import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
import { WorkspaceCard } from '@/components/seo/WorkspaceCard';
import { CreateWorkspaceForm } from '@/components/seo/CreateWorkspaceForm';
import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { MCM_WORKSPACE_ID, buildMCMWorkspace } from '@/lib/seo/seeds/mcm';
import { HOMC_WORKSPACE_ID, buildHOMCWorkspace } from '@/lib/seo/seeds/homc';

export default function SEODashboard() {
  const { workspaces, createWorkspace } = useWorkspaceStore();
  const [showCreate, setShowCreate] = useState(false);

  // Auto-seed MCM workspace on first ever load
  useEffect(() => {
    if (!workspaces[MCM_WORKSPACE_ID]) {
      const mcm = buildMCMWorkspace();
      createWorkspace(mcm);
    }
    if (!workspaces[HOMC_WORKSPACE_ID]) {
      const homc = buildHOMCWorkspace();
      createWorkspace(homc);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const workspaceList = Object.values(workspaces).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const handleCreate = (data: Parameters<typeof createWorkspace>[0]) => {
    createWorkspace(data);
    setShowCreate(false);
  };

  return (
    <>
      {/* Hero */}
      <div className="seo-hero">
        <h1>SEO Content Agent</h1>
        <p>
          Multi-client SEO content workspace — manage brands, keywords, and generate high-ranking content at scale.
        </p>
        {!showCreate && (
          <button
            className="seo-btn seo-btn-primary seo-btn-lg"
            onClick={() => setShowCreate(true)}
          >
            <Building2 size={16} /> Create Workspace
          </button>
        )}
      </div>

      {/* Create workspace form */}
      {showCreate && (
        <div style={{ marginBottom: 24 }}>
          <CreateWorkspaceForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Workspaces */}
      {workspaceList.length > 0 ? (
        <div className="seo-projects-grid">
          {workspaceList.map((ws) => (
            <WorkspaceCard key={ws.id} workspace={ws} />
          ))}
        </div>
      ) : !showCreate ? (
        <div className="seo-empty-state">
          <div className="seo-empty-state-icon">🏢</div>
          <div className="seo-empty-state-title">No workspaces yet</div>
          <div className="seo-empty-state-desc">
            Create a workspace for each client or brand. Upload keywords once, then generate unlimited content.
          </div>
        </div>
      ) : null}
    </>
  );
}
