'use client';

import Link from 'next/link';

export function SEONavbar() {
  return (
    <nav className="seo-navbar">
      <div className="seo-navbar-left">
        <Link href="/seoagent" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="seo-navbar-logo">N</div>
          <span className="seo-navbar-title">NXFlow</span>
        </Link>
        <span className="seo-navbar-badge">SEO Agent</span>
      </div>
      <div className="seo-navbar-right">
        <Link
          href="/"
          className="seo-btn seo-btn-ghost"
          title="Back to Workspace"
          style={{ fontSize: 12, gap: 4, textDecoration: 'none' }}
        >
          ← Workspace
        </Link>
      </div>
    </nav>
  );
}
