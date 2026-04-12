'use client';

import { useSEOStore } from '@/store/seoStore';
import { ProjectCard } from '@/components/seo/ProjectCard';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SEODashboard() {
  const { projects, createProject } = useSEOStore();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const projectList = Object.values(projects).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createProject(trimmed);
    setName('');
    setCreating(false);
    router.push(`/seoagent/project/${id}`);
  };

  return (
    <>
      {/* Hero */}
      <div className="seo-hero">
        <h1>SEO Content Generator</h1>
        <p>
          AI-powered content workflow that produces high-ranking, publish-ready SEO articles — from keyword discovery to final output.
        </p>
        {!creating ? (
          <button
            className="seo-btn seo-btn-primary seo-btn-lg"
            onClick={() => setCreating(true)}
          >
            + New Project
          </button>
        ) : (
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setCreating(false);
                  setName('');
                }
              }}
              placeholder="Project name…"
              className="seo-input"
              style={{ width: 280 }}
            />
            <button className="seo-btn seo-btn-primary" onClick={handleCreate}>
              Create
            </button>
            <button
              className="seo-btn seo-btn-secondary"
              onClick={() => { setCreating(false); setName(''); }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Projects */}
      {projectList.length > 0 ? (
        <div className="seo-projects-grid">
          {projectList.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="seo-empty-state">
          <div className="seo-empty-state-icon">📊</div>
          <div className="seo-empty-state-title">No projects yet</div>
          <div className="seo-empty-state-desc">
            Create your first SEO content project to start generating high-ranking, publish-ready articles.
          </div>
        </div>
      )}
    </>
  );
}
