'use client';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { Zap, ArrowRight, Search, BarChart3, Users, Target, TrendingUp, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
  const router = useRouter();
  const boards = useWorkspaceStore((s) => s.boards);
  const workspaceBoards = Object.values(boards);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const products = [
    {
      id: 'seo',
      name: 'SEO',
      desc: 'AI-powered content generation — keywords, briefs, articles, and images.',
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      glowColor: 'rgba(16,185,129,0.15)',
      shadow: 'rgba(16,185,129,0.35)',
      borderGlow: 'rgba(16,185,129,0.4)',
      icon: <Search size={22} color="#fff" strokeWidth={2} />,
      tag: 'AI Powered',
      tagBg: 'rgba(16,185,129,0.15)',
      tagColor: '#34d399',
      onClick: () => router.push('/seoagent'),
    },
    {
      id: 'crm',
      name: 'GM Leads',
      desc: 'Lead tracking, pipeline management, and contact database.',
      gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)',
      glowColor: 'rgba(8,145,178,0.15)',
      shadow: 'rgba(8,145,178,0.35)',
      borderGlow: 'rgba(8,145,178,0.4)',
      icon: <Users size={22} color="#fff" strokeWidth={2} />,
      tag: 'Lead Pipeline',
      tagBg: 'rgba(6,182,212,0.15)',
      tagColor: '#22d3ee',
      onClick: () => router.push('/crm'),
    },
    {
      id: 'lead-management',
      name: 'Lead Management',
      desc: 'Prospecting, leadboard, sequences, AI scoring & email outreach.',
      gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)',
      glowColor: 'rgba(225,29,72,0.15)',
      shadow: 'rgba(225,29,72,0.35)',
      borderGlow: 'rgba(225,29,72,0.4)',
      icon: <Target size={22} color="#fff" strokeWidth={2} />,
      tag: 'Full Suite',
      tagBg: 'rgba(244,63,94,0.15)',
      tagColor: '#fb7185',
      onClick: () => router.push('/dashboard'),
    },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
      overflow: 'auto',
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '600px',
        background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '10%',
        width: '500px', height: '400px',
        background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}>
            <Zap size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            NXFlow
          </span>
        </div>

        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10, padding: '6px 14px',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: currentUser.avatarColor || '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
              }}>
                {currentUser.initials}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                {currentUser.name}
              </span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8, padding: '7px 10px',
                cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(225,29,72,0.4)';
                e.currentTarget.style.color = '#f87171';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', zIndex: 1,
        maxWidth: 900, width: '100%', padding: '0 24px',
      }}>
        {/* Greeting */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 100, padding: '5px 16px', marginBottom: 20,
            fontSize: 12, fontWeight: 500, color: '#818cf8',
          }}>
            <TrendingUp size={12} />
            <span>Command Center</span>
          </div>
          <h1 style={{
            margin: '0 0 10px', fontSize: 36, fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-1px',
            lineHeight: 1.15,
          }}>
            {greeting}, {currentUser?.name || 'there'}
          </h1>
          <p style={{
            margin: 0, fontSize: 16, color: 'var(--text-muted)',
            lineHeight: 1.6, maxWidth: 460, marginInline: 'auto',
          }}>
            Your unified workspace for SEO, lead management, and outreach.
          </p>
        </div>

        {/* Product Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          width: '100%',
        }}>
          {products.map((p) => {
            const isHovered = hoveredId === p.id;
            return (
              <div
                key={p.id}
                onClick={p.onClick}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  position: 'relative',
                  background: isHovered
                    ? `linear-gradient(160deg, ${p.glowColor}, rgba(255,255,255,0.02))`
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isHovered ? p.borderGlow : 'var(--border-default)'}`,
                  borderRadius: 18,
                  padding: '28px 24px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? `0 20px 50px ${p.shadow}, 0 0 0 1px ${p.borderGlow}`
                    : '0 2px 8px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                }}
              >
                {/* Subtle gradient overlay on hover */}
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: '50%', height: '50%',
                  background: `radial-gradient(circle at top right, ${p.glowColor}, transparent)`,
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.3s',
                  pointerEvents: 'none',
                }} />

                {/* Icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: p.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                  boxShadow: `0 6px 20px ${p.shadow}`,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                }}>
                  {p.icon}
                </div>

                {/* Title */}
                <h3 style={{
                  margin: '0 0 8px', fontSize: 19, fontWeight: 700,
                  color: 'var(--text-primary)', letterSpacing: '-0.3px',
                  position: 'relative',
                }}>
                  {p.name}
                </h3>

                {/* Description */}
                <p style={{
                  margin: '0 0 22px', fontSize: 13.5, color: 'var(--text-muted)',
                  lineHeight: 1.6, position: 'relative',
                }}>
                  {p.desc}
                </p>

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  position: 'relative',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: p.tagColor,
                    background: p.tagBg,
                    padding: '4px 12px', borderRadius: 8,
                    letterSpacing: '0.02em',
                  }}>
                    {p.tag}
                  </span>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: isHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    <ArrowRight
                      size={15}
                      color={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                      style={{
                        transition: 'transform 0.2s, color 0.2s',
                        transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtle footer */}
        <div style={{
          marginTop: 48, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: 'var(--text-muted)',
          opacity: 0.6,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16,185,129,0.5)',
          }} />
          <span>nxflow.app</span>
          <span style={{ margin: '0 4px', color: 'var(--border-default)' }}>·</span>
          <span>3 products</span>
          <span style={{ margin: '0 4px', color: 'var(--border-default)' }}>·</span>
          <span>{workspaceBoards.length} boards</span>
        </div>
      </div>
    </div>
  );
}
