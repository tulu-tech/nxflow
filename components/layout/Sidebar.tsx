'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Plus,
  Home,
  Settings,
  Bell,
  Search,
  Zap,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUIStore } from '@/store/uiStore';

export function Sidebar() {
  const router = useRouter();
  const { workspaces, boards, activeWorkspaceId, activeBoardId, setActiveBoard, addBoard } =
    useWorkspaceStore();
  const setSearch = useUIStore((s) => s.setSearch);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInbox, setShowInbox] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const workspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;
  const workspaceBoards = workspace ? workspace.boardIds.map((id) => boards[id]).filter(Boolean) : [];

  // Keyboard shortcut ⌘K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowInbox(false);
        setShowSettings(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleNavigate = (boardId: string) => {
    setActiveBoard(boardId);
    router.push(`/board/${boardId}`);
  };

  const handleAddBoard = () => {
    if (!newBoardName.trim() || !activeWorkspaceId) return;
    addBoard(activeWorkspaceId, newBoardName.trim());
    setNewBoardName('');
    setAddingBoard(false);
  };

  const handleHomeClick = () => {
    if (activeBoardId) {
      router.push(`/board/${activeBoardId}`);
    }
  };

  const handleSearchSelect = (boardId: string) => {
    setShowSearch(false);
    setSearchQuery('');
    handleNavigate(boardId);
  };

  const filteredBoards = searchQuery
    ? workspaceBoards.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : workspaceBoards;

  // Modal overlay component
  const Modal = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: '12vh',
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 14, boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
            minWidth: 380, maxWidth: 500, overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
          className="animate-fade-in"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{title}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 4 }}>
              <X size={14} />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  return (
    <aside
      style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--bg-base)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '14px 16px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          Orbit
        </span>
      </div>

      {/* Top nav */}
      <div style={{ padding: '8px 8px 4px' }}>
        <div className="sidebar-item" onClick={handleHomeClick}>
          <Home size={14} />
          <span>Home</span>
        </div>
        <div className="sidebar-item" onClick={() => setShowInbox(true)}>
          <Bell size={14} />
          <span>Inbox</span>
          <span style={{
            marginLeft: 'auto', background: '#e2445c', color: '#fff',
            borderRadius: 10, fontSize: 9, fontWeight: 700, padding: '1px 5px', lineHeight: '14px',
          }}>
            3
          </span>
        </div>
        <div className="sidebar-item" onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}>
          <Search size={14} />
          <span>Search</span>
          <span style={{
            marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)',
            background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace',
          }}>
            ⌘K
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

      {/* Workspace section */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
        {workspace && (
          <>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', marginBottom: 2, cursor: 'pointer', borderRadius: 6,
              }}
              onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
            >
              <div
                style={{
                  width: 20, height: 20, borderRadius: 4,
                  background: 'linear-gradient(135deg, #e11d48, #f59e0b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}
              >
                {workspace.icon}
              </div>
              <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {workspace.name}
              </span>
              {workspaceExpanded ? <ChevronDown size={12} color="var(--text-muted)" /> : <ChevronRight size={12} color="var(--text-muted)" />}
            </div>

            {workspaceExpanded && (
              <div style={{ paddingLeft: 8 }}>
                {workspaceBoards.map((board) => {
                  const isActive = activeBoardId === board.id;
                  return (
                    <div
                      key={board.id}
                      className={`sidebar-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleNavigate(board.id)}
                    >
                      <LayoutDashboard size={13} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {board.name}
                      </span>
                    </div>
                  );
                })}

                {addingBoard ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px' }}>
                    <input
                      autoFocus
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddBoard();
                        if (e.key === 'Escape') { setAddingBoard(false); setNewBoardName(''); }
                      }}
                      onBlur={handleAddBoard}
                      placeholder="Board name…"
                      style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                        borderRadius: 4, padding: '3px 7px', fontSize: 12, color: 'var(--text-primary)', outline: 'none', width: '100%',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="sidebar-item"
                    style={{ color: 'var(--text-muted)', fontSize: 12 }}
                    onClick={() => setAddingBoard(true)}
                  >
                    <Plus size={12} />
                    <span>Add board</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px' }}>
        <div className="sidebar-item" onClick={() => setShowSettings(true)}>
          <Settings size={13} />
          <span>Settings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
          <div
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}
          >
            ME
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>My Account</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>me@orbit.app</div>
          </div>
        </div>
      </div>

      {/* ═══ Search Modal ═══ */}
      <Modal open={showSearch} onClose={() => { setShowSearch(false); setSearchQuery(''); }} title="Quick Search">
        <div style={{ padding: 16 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search boards and tasks…"
              style={{
                width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                background: 'var(--bg-active)', border: '1px solid var(--border-default)',
                borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Boards
          </div>
          {filteredBoards.length === 0 && (
            <div style={{ padding: '12px 0', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
              No results found
            </div>
          )}
          {filteredBoards.map((board) => (
            <div
              key={board.id}
              onClick={() => handleSearchSelect(board.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <LayoutDashboard size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              {board.name}
              {board.id === activeBoardId && (
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>current</span>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* ═══ Inbox Modal ═══ */}
      <Modal open={showInbox} onClose={() => setShowInbox(false)} title="Inbox">
        <div style={{ padding: 16 }}>
          {[
            { time: '2 hours ago', text: 'Alex Rivera assigned you to "QA and regression testing"', color: '#7c3aed' },
            { time: '5 hours ago', text: 'Sam Chen changed status of "CI/CD pipeline" to Done', color: '#0891b2' },
            { time: 'Yesterday', text: 'Jordan Lee commented on "Design system v2"', color: '#059669' },
          ].map((notif, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 8px',
                borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.4 }}>{notif.text}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{notif.time}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: '10px 8px 4px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
            Notifications are simulated in this demo
          </div>
        </div>
      </Modal>

      {/* ═══ Settings Modal ═══ */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <div style={{ padding: 16 }}>
          {[
            { label: 'Theme', value: 'Dark', desc: 'Visual appearance of the app' },
            { label: 'Language', value: 'English', desc: 'Interface language' },
            { label: 'Notifications', value: 'On', desc: 'Desktop + email notifications' },
            { label: 'Data', value: 'localStorage', desc: 'Persistence backend (MVP)' },
          ].map((setting) => (
            <div
              key={setting.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{setting.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{setting.desc}</div>
              </div>
              <div style={{
                padding: '3px 10px', background: 'var(--bg-active)', borderRadius: 6,
                fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 500,
              }}>
                {setting.value}
              </div>
            </div>
          ))}
          <div style={{ padding: '12px 8px 4px' }}>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('orbit-workspace');
                  window.location.reload();
                }
              }}
              style={{
                width: '100%', padding: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 6, color: '#f87171', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Reset all data
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
              Clears localStorage and reloads with sample data
            </div>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
