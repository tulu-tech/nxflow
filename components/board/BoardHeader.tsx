'use client';
import { useState, useRef, useEffect } from 'react';
import { Board } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ChevronDown, MoreHorizontal, Users, Share2, X, Copy, Trash2, FileText, Star, Link2, Check } from 'lucide-react';

interface Props {
  board: Board;
}

export function BoardHeader({ board }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(board.name);
  const [activeTab, setActiveTab] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateBoardName = useWorkspaceStore((s) => s.updateBoardName);
  const deleteBoard = useWorkspaceStore((s) => s.deleteBoard);

  const moreRef = useRef<HTMLDivElement>(null);
  const inviteRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  // Sync title if board changes
  useEffect(() => { setTitle(board.name); }, [board.name, board.id]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
      if (inviteRef.current && !inviteRef.current.contains(e.target as Node)) setShowInvite(false);
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShowShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = () => {
    setEditingTitle(false);
    const trimmed = title.trim();
    if (trimmed && trimmed !== board.name) {
      updateBoardName(board.id, trimmed);
    } else {
      setTitle(board.name);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: 'calc(100% + 6px)',
    right: 0,
    zIndex: 200,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    minWidth: 220,
    overflow: 'hidden' as const,
  };

  const viewTabs = ['Main table', 'Timeline', 'Calendar', 'Chart'];

  return (
    <div
      style={{
        padding: '18px 24px 0',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setTitle(board.name); setEditingTitle(false); } }}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-primary)',
                outline: 'none',
                letterSpacing: '-0.5px',
                minWidth: 200,
              }}
            />
          ) : (
            <h1
              style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', cursor: 'pointer', margin: 0 }}
              onClick={() => setEditingTitle(true)}
            >
              {board.name}
            </h1>
          )}
          <button
            onClick={() => setEditingTitle(true)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Invite */}
          <div ref={inviteRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowInvite(!showInvite); setShowShare(false); setShowMore(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                background: showInvite ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                border: showInvite ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                borderRadius: 6, color: showInvite ? 'var(--text-accent)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Users size={13} />
              Invite
            </button>

            {showInvite && (
              <div className="animate-fade-in" style={dropdownStyle}>
                <div style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>Invite people</div>
                  <input
                    autoFocus
                    placeholder="Enter email address…"
                    style={{
                      width: '100%', background: 'var(--bg-active)', border: '1px solid var(--border-default)',
                      borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent-primary)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
                  />
                  <button
                    onClick={() => { setShowInvite(false); }}
                    style={{
                      marginTop: 10, width: '100%', padding: '7px', background: 'var(--accent-primary)',
                      border: 'none', borderRadius: 6, color: '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                    }}
                  >
                    Send invite
                  </button>
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Invites are simulated in this demo
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Share */}
          <div ref={shareRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowShare(!showShare); setShowInvite(false); setShowMore(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                background: showShare ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                border: showShare ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                borderRadius: 6, color: showShare ? 'var(--text-accent)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Share2 size={13} />
              Share
            </button>

            {showShare && (
              <div className="animate-fade-in" style={dropdownStyle}>
                <div style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>Share board</div>
                  <div
                    onClick={handleCopyLink}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-primary)',
                      background: 'var(--bg-active)', border: '1px solid var(--border-default)',
                    }}
                  >
                    {copied ? <Check size={13} color="#00c875" /> : <Copy size={13} />}
                    {copied ? 'Link copied!' : 'Copy board link'}
                  </div>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-primary)', marginTop: 4,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Link2 size={13} />
                    Shareable link (coming soon)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* More menu */}
          <div ref={moreRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowMore(!showMore); setShowInvite(false); setShowShare(false); }}
              style={{
                display: 'flex', alignItems: 'center', padding: '5px 8px',
                background: showMore ? 'rgba(99,102,241,0.12)' : 'transparent',
                border: showMore ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                borderRadius: 6, color: showMore ? 'var(--text-accent)' : 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              <MoreHorizontal size={14} />
            </button>

            {showMore && (
              <div className="animate-fade-in" style={dropdownStyle}>
                <div style={{ padding: '4px 0' }}>
                  {[
                    { icon: Star, label: 'Add to favorites', color: 'var(--text-primary)' },
                    { icon: FileText, label: 'Board description', color: 'var(--text-primary)' },
                    { icon: Copy, label: 'Duplicate board', color: 'var(--text-primary)' },
                  ].map(({ icon: Icon, label, color }) => (
                    <div
                      key={label}
                      onClick={() => setShowMore(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                        cursor: 'pointer', fontSize: 12.5, color,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Icon size={13} />
                      {label}
                    </div>
                  ))}
                  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                  <div
                    onClick={() => { setShowMore(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                      cursor: 'pointer', fontSize: 12.5, color: '#f87171',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Trash2 size={13} />
                    Delete board
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {viewTabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '7px 14px',
              borderRadius: '6px 6px 0 0',
              border: 'none',
              background: activeTab === i ? 'var(--bg-elevated)' : 'transparent',
              borderBottom: activeTab === i ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === i ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 12.5,
              fontWeight: activeTab === i ? 600 : 400,
              cursor: 'pointer',
              transition: 'color 0.1s, background 0.1s',
            }}
          >
            {tab}
          </button>
        ))}
        <button
          onClick={() => {}}
          style={{ padding: '7px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
        >
          + Add view
        </button>
      </div>

      {/* Coming soon overlay for non-table views */}
      {activeTab !== 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 14, padding: '32px 40px', textAlign: 'center',
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)', minWidth: 320,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {activeTab === 1 ? '📊' : activeTab === 2 ? '📅' : '📈'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {viewTabs[activeTab]} View
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {viewTabs[activeTab]} view is coming in a future release.
            </div>
            <button
              onClick={() => setActiveTab(0)}
              style={{
                padding: '8px 24px', background: 'var(--accent-primary)', border: 'none',
                borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Back to Main table
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
