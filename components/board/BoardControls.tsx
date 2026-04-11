'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Filter, ArrowUpDown, EyeOff, LayoutList, X, ChevronDown, Check, Eye } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { STATUS_OPTIONS } from '@/lib/columns';

export function BoardControls() {
  const {
    filter, sort, isFilterOpen,
    setSearch, toggleFilterAssignee, toggleFilterStatus,
    setSort, clearFilters, setFilterOpen,
  } = useUIStore();
  const users = useWorkspaceStore((s) => s.users);
  const activeBoardId = useWorkspaceStore((s) => s.activeBoardId);
  const boards = useWorkspaceStore((s) => s.boards);
  const groups = useWorkspaceStore((s) => s.groups);
  const addTask = useWorkspaceStore((s) => s.addTask);
  const searchRef = useRef<HTMLInputElement>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const hideRef = useRef<HTMLDivElement>(null);
  const groupByRef = useRef<HTMLDivElement>(null);
  const newTaskRef = useRef<HTMLDivElement>(null);

  const activeFiltersCount = filter.assigneeIds.length + filter.statusIds.length;

  // Get first group to add task
  const board = activeBoardId ? boards[activeBoardId] : null;
  const firstGroupId = board && board.groupIds.length > 0 ? board.groupIds[0] : null;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
      if (hideRef.current && !hideRef.current.contains(e.target as Node)) {
        setHideOpen(false);
      }
      if (groupByRef.current && !groupByRef.current.contains(e.target as Node)) {
        setGroupByOpen(false);
      }
      if (newTaskRef.current && !newTaskRef.current.contains(e.target as Node)) {
        setNewTaskOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setFilterOpen]);

  const handleNewTask = () => {
    if (firstGroupId) {
      addTask(firstGroupId, 'New task');
      setNewTaskOpen(false);
    }
  };

  const btnStyle = (active?: boolean) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 5,
    padding: '5px 10px',
    borderRadius: 6,
    border: active ? '1px solid var(--accent-primary)' : '1px solid transparent',
    background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
    color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
    fontSize: 12.5,
    fontWeight: 500 as const,
    cursor: 'pointer' as const,
    position: 'relative' as const,
    transition: 'all 0.1s',
  });

  const dropdownStyle = {
    position: 'absolute' as const,
    top: 'calc(100% + 6px)',
    left: 0,
    zIndex: 200,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    padding: 8,
    minWidth: 180,
  };

  return (
    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', flexShrink: 0, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>

        {/* ────── New task button ────── */}
        <div ref={newTaskRef} style={{ position: 'relative' }}>
          <button
            onClick={handleNewTask}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
          >
            + New task
            <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.3)', marginLeft: 4 }} />
            <span
              onClick={(e) => { e.stopPropagation(); setNewTaskOpen(!newTaskOpen); }}
              style={{ display: 'flex', alignItems: 'center', padding: '0 2px', cursor: 'pointer' }}
            >
              <ChevronDown size={11} />
            </span>
          </button>

          {newTaskOpen && (
            <div className="animate-fade-in" style={dropdownStyle}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>
                Add task to group
              </div>
              {board && board.groupIds.map((gid) => {
                const g = groups[gid];
                if (!g) return null;
                return (
                  <div
                    key={gid}
                    onClick={() => { addTask(gid, 'New task'); setNewTaskOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-primary)',
                      transition: 'background 0.1s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: g.color, flexShrink: 0 }} />
                    {g.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* ────── Search ────── */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={13} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            ref={searchRef}
            value={filter.searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            style={{
              paddingLeft: 28,
              paddingRight: filter.searchQuery ? 28 : 10,
              paddingTop: 5,
              paddingBottom: 5,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              fontSize: 12.5,
              color: 'var(--text-primary)',
              outline: 'none',
              width: 180,
              transition: 'border-color 0.1s, width 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.width = '220px'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; if (!filter.searchQuery) e.target.style.width = '180px'; }}
          />
          {filter.searchQuery && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* ────── Filter ────── */}
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setFilterOpen(!isFilterOpen); setSortOpen(false); setHideOpen(false); setGroupByOpen(false); }}
            style={btnStyle(activeFiltersCount > 0 || isFilterOpen)}
          >
            <Filter size={13} />
            Filter
            {activeFiltersCount > 0 && (
              <span style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '0 5px', lineHeight: '16px', height: 16 }}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          {isFilterOpen && (
            <div className="animate-fade-in" style={{ ...dropdownStyle, padding: 16, minWidth: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Filter by</span>
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: 'var(--text-accent)', fontSize: 11.5, cursor: 'pointer', fontWeight: 500 }}>
                    Clear all
                  </button>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>People</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.values(users).map((user) => {
                    const selected = filter.assigneeIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleFilterAssignee(user.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', background: selected ? 'rgba(99,102,241,0.1)' : 'transparent' }}
                        onMouseOver={(e) => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseOut={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div className="avatar-circle" style={{ background: user.avatarColor, border: 'none', width: 22, height: 22, fontSize: 9 }}>{user.initials}</div>
                        <span style={{ fontSize: 12.5, color: 'var(--text-primary)', flex: 1 }}>{user.name}</span>
                        {selected && <Check size={12} color="var(--text-accent)" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const selected = filter.statusIds.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleFilterStatus(opt.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', background: selected ? 'rgba(99,102,241,0.1)' : 'transparent' }}
                        onMouseOver={(e) => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseOut={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: 2.5, background: opt.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, color: 'var(--text-primary)', flex: 1 }}>{opt.label}</span>
                        {selected && <Check size={12} color="var(--text-accent)" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ────── Sort ────── */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); setHideOpen(false); setGroupByOpen(false); }}
            style={btnStyle(sort.field !== null || sortOpen)}
          >
            <ArrowUpDown size={13} />
            Sort
            {sort.field && (
              <span style={{ fontSize: 10, color: 'var(--text-accent)', fontWeight: 400, marginLeft: 2 }}>
                ({sort.field})
              </span>
            )}
          </button>

          {sortOpen && (
            <div className="animate-fade-in" style={dropdownStyle}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>Sort by</div>
              {[
                { label: 'None', field: null as null },
                { label: 'Status', field: 'status' as const },
                { label: 'Timeline', field: 'timeline' as const },
                { label: 'Task name', field: 'name' as const },
              ].map(({ label, field }) => (
                <div
                  key={label}
                  onClick={() => { setSort({ field, direction: sort.direction === 'asc' && sort.field === field ? 'desc' : 'asc' }); setSortOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    borderRadius: 6, cursor: 'pointer',
                    background: sort.field === field ? 'rgba(99,102,241,0.1)' : 'transparent',
                    fontSize: 12.5, color: 'var(--text-primary)',
                  }}
                  onMouseOver={(e) => { if (sort.field !== field) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseOut={(e) => { if (sort.field !== field) e.currentTarget.style.background = 'transparent'; }}
                >
                  {sort.field === field ? <Check size={12} color="var(--text-accent)" /> : <div style={{ width: 12 }} />}
                  {label}
                  {sort.field === field && sort.field !== null && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
                      {sort.direction === 'asc' ? '↑ Asc' : '↓ Desc'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ────── Hide ────── */}
        <div ref={hideRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setHideOpen(!hideOpen); setFilterOpen(false); setSortOpen(false); setGroupByOpen(false); }}
            style={btnStyle(hideOpen)}
          >
            {hideOpen ? <Eye size={13} /> : <EyeOff size={13} />}
            Hide
          </button>

          {hideOpen && (
            <div className="animate-fade-in" style={dropdownStyle}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>
                Toggle columns
              </div>
              {board && board.columns.filter(c => c.type !== 'task-name').map((col) => (
                <div
                  key={col.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-primary)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Eye size={12} color="var(--text-accent)" />
                  {col.label}
                </div>
              ))}
              <div style={{ padding: '8px 10px 4px', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Column hiding coming soon
              </div>
            </div>
          )}
        </div>

        {/* ────── Group by ────── */}
        <div ref={groupByRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setGroupByOpen(!groupByOpen); setFilterOpen(false); setSortOpen(false); setHideOpen(false); }}
            style={btnStyle(groupByOpen)}
          >
            <LayoutList size={13} />
            Group by
          </button>

          {groupByOpen && (
            <div className="animate-fade-in" style={dropdownStyle}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>
                Group by field
              </div>
              {['Default', 'Status', 'Assignee'].map((opt) => (
                <div
                  key={opt}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-primary)',
                    background: opt === 'Default' ? 'rgba(99,102,241,0.1)' : 'transparent',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = opt === 'Default' ? 'rgba(99,102,241,0.1)' : 'transparent')}
                >
                  {opt === 'Default' ? <Check size={12} color="var(--text-accent)" /> : <div style={{ width: 12 }} />}
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
