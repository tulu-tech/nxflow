'use client';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Zap, Search as SearchIcon, BarChart3, Users, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const boards = useWorkspaceStore((s) => s.boards);
  const workspaceBoards = Object.values(boards);

  const products = [
    {
      id: 'workspace',
      name: 'Work Management',
      desc: 'Boards, tasks, subtasks, timelines — plan and track everything.',
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      shadow: 'rgba(99,102,241,0.3)',
      icon: '⚡',
      stats: `${workspaceBoards.length} boards`,
      onClick: () => {
        const firstBoard = workspaceBoards[0];
        if (firstBoard) router.push(`/board/${firstBoard.id}`);
      },
    },
    {
      id: 'seo',
      name: 'SEO Agent',
      desc: 'AI-powered content generator — keywords, briefs, articles, images.',
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      shadow: 'rgba(16,185,129,0.3)',
      icon: '🔍',
      stats: 'AI Powered',
      onClick: () => router.push('/seoagent'),
    },
    {
      id: 'crm',
      name: 'NX CRM',
      desc: 'Lead tracking, pipeline management, contact database.',
      gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)',
      shadow: 'rgba(8,145,178,0.3)',
      icon: '👥',
      stats: 'Lead Pipeline',
      onClick: () => router.push('/crm'),
    },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: '40px 20px',
      background: 'var(--bg-surface)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 12px 32px rgba(99,102,241,0.35)',
        }}>
          <Zap size={28} color="#fff" strokeWidth={2.5} />
        </div>
        <h1 style={{
          margin: '0 0 8px', fontSize: 28, fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.5px',
        }}>
          Welcome to NXFlow
        </h1>
        <p style={{
          margin: 0, fontSize: 15, color: 'var(--text-muted)',
          maxWidth: 400, lineHeight: 1.6,
        }}>
          Your unified platform for work management, SEO content, and CRM.
        </p>
      </div>

      {/* Product Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20, maxWidth: 900, width: '100%',
      }}>
        {products.map((p) => (
          <div
            key={p.id}
            onClick={p.onClick}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 14, padding: 24, cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 8px 24px ${p.shadow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Icon */}
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: p.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, marginBottom: 16,
              boxShadow: `0 4px 12px ${p.shadow}`,
            }}>
              {p.icon}
            </div>

            {/* Title */}
            <h3 style={{
              margin: '0 0 6px', fontSize: 17, fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              {p.name}
            </h3>

            {/* Description */}
            <p style={{
              margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}>
              {p.desc}
            </p>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                background: 'var(--bg-active)', padding: '3px 10px', borderRadius: 6,
              }}>
                {p.stats}
              </span>
              <ArrowRight size={14} color="var(--text-muted)" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div style={{
        marginTop: 40, display: 'flex', gap: 32,
        fontSize: 12, color: 'var(--text-muted)',
      }}>
        <span>🚀 3 products</span>
        <span>📊 {workspaceBoards.length} boards</span>
        <span>🌐 nxflow.app</span>
      </div>
    </div>
  );
}
