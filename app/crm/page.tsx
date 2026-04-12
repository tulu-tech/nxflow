'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useCrmStore, CrmLead } from '@/store/crmStore';
import { useAuthStore } from '@/store/authStore';
import { LoginScreen } from '@/components/auth/LoginScreen';
import Link from 'next/link';
import {
  Search, Filter, Plus, X, ChevronDown, ChevronUp, Check,
  Users, Phone, Mail, MapPin, Building2, ArrowLeft, Trash2,
  LayoutGrid, FileText, Star,
} from 'lucide-react';
import './crm.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['New Lead', 'Sent E-mail', 'Called'];
const DEPARTMENTS = [
  'Project Management & Delivery',
  'Sales & Business Development',
  'Operations & Supply Chain',
  'Technical & Engineering',
  'Customer Service',
  'Business Strategy & Finance',
  'Marketing & Communications',
];
const REASONS = [
  'No Follow-up', 'Price Too High', 'Purchased from R.I',
  'Approval Delayed by Command', 'Solicitation opened',
  'Waiting for Internal Evaluation', 'Tender Result Waiting',
  'Looking for Cheaper Alternative', 'Lost the tender',
  'Waiting for Next Fiscal Cycle',
  'Solicitation request(we will participate)',
  'No Further Response After Quote',
];

function getStatusClass(s: string) {
  if (s === 'New Lead') return 'new-lead';
  if (s === 'Sent E-mail') return 'sent-email';
  if (s === 'Called') return 'called';
  return '';
}

function getReasonClass(r: string | null) {
  if (!r) return '';
  if (r.includes('No Follow')) return 'no-followup';
  if (r.includes('Price')) return 'price-high';
  if (r.includes('Wait') || r.includes('Tender') || r.includes('Approval') || r.includes('Evaluation')) return 'waiting';
  if (r.includes('Solicitation')) return 'solicitation';
  if (r.includes('Lost')) return 'lost';
  if (r.includes('Purchased')) return 'purchased';
  return 'default';
}

function getDeptClass(d: string | null) {
  if (!d) return '';
  if (d.includes('Project')) return 'pm';
  if (d.includes('Sales')) return 'sales';
  if (d.includes('Operations')) return 'ops';
  if (d.includes('Technical')) return 'tech';
  if (d.includes('Customer')) return 'cs';
  if (d.includes('Strategy') || d.includes('Finance')) return 'strategy';
  if (d.includes('Marketing')) return 'marketing';
  return '';
}

function formatDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Filter Dropdown Component ────────────────────────────────────────────────

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`crm-filter-btn ${selected.length > 0 ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <Filter size={12} />
        {label}
        {selected.length > 0 && <span>({selected.length})</span>}
      </button>
      {open && (
        <div className="crm-filter-dropdown">
          {options.map((opt) => (
            <div
              key={opt}
              className={`crm-filter-option ${selected.includes(opt) ? 'selected' : ''}`}
              onClick={() => onToggle(opt)}
            >
              <div className={`crm-filter-check ${selected.includes(opt) ? 'checked' : ''}`}>
                {selected.includes(opt) && <Check size={10} color="#fff" strokeWidth={3} />}
              </div>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ lead, onClose }: { lead: CrmLead; onClose: () => void }) {
  const { updateLead, deleteLead } = useCrmStore();

  const field = (label: string, value: string | number | null | undefined) => (
    <div className="crm-detail-field">
      <span className="crm-detail-label">{label}</span>
      <span className={`crm-detail-value ${!value ? 'empty' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );

  return (
    <div className="crm-detail">
      <div className="crm-detail-header">
        <h2>{lead.name}</h2>
        <button className="crm-detail-close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="crm-detail-body">
        <div className="crm-detail-section">
          <h3>Contact Info</h3>
          {field('Company', lead.company)}
          {field('Email', lead.email)}
          {field('Phone', lead.phone)}
          {field('Job Title', lead.job_title)}
          {field('Preferred Contact', lead.preferred_contact)}
        </div>

        <div className="crm-detail-section">
          <h3>Lead Details</h3>
          <div className="crm-detail-field">
            <span className="crm-detail-label">Status</span>
            <select
              className="crm-edit-select"
              value={lead.status}
              onChange={(e) => updateLead(lead.id, { status: e.target.value })}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {field('Date', formatDate(lead.lead_date))}
          {field('Department', lead.department)}
          {field('Deals', lead.deals)}
          {field('No Conversion', lead.no_conversion_reason)}
          {field('Group', lead.lead_group)}
        </div>

        <div className="crm-detail-section">
          <h3>Product Interest</h3>
          {field('Machine Model', lead.machine_model)}
          {field('Quantity', lead.machine_quantity)}
          {field('Delivery To', lead.delivery_location)}
          {field('Timeline', lead.delivery_timeline)}
          {field('Location Type', lead.location_type)}
          {field('End User/Supplier', lead.end_user_or_supplier)}
        </div>

        <div className="crm-detail-section">
          <h3>Engagement</h3>
          {field('Features Valued', lead.valuable_features)}
          {field('Challenges', lead.challenges)}
          {field('How Heard', lead.how_heard)}
          {field('Additional Info', lead.additional_info)}
        </div>

        {(lead.utm_campaign || lead.utm_source || lead.gclid) && (
          <div className="crm-detail-section">
            <h3>UTM Tracking</h3>
            {field('Campaign', lead.utm_campaign)}
            {field('Source', lead.utm_source)}
            {field('Medium', lead.utm_medium)}
            {field('Content', lead.utm_content)}
            {field('GCLID', lead.gclid)}
            {field('Term', lead.utm_term)}
          </div>
        )}

        <div className="crm-detail-section">
          <h3>Notes</h3>
          <textarea
            className="crm-edit-input"
            rows={4}
            defaultValue={lead.notes || ''}
            placeholder="Add notes about this lead..."
            onBlur={(e) => {
              if (e.target.value !== (lead.notes || '')) {
                updateLead(lead.id, { notes: e.target.value });
              }
            }}
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>

      <div className="crm-detail-actions">
        <button
          className="crm-btn-danger"
          onClick={() => {
            if (confirm(`Delete lead "${lead.name}"?`)) {
              deleteLead(lead.id);
              onClose();
            }
          }}
        >
          <Trash2 size={12} style={{ marginRight: 4 }} /> Delete
        </button>
      </div>
    </div>
  );
}

// ─── Add Lead Modal ───────────────────────────────────────────────────────────

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { addLead } = useCrmStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', department: '', job_title: '' });

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    await addLead({ ...form, status: 'New Lead', lead_group: 'GM' });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#1e1e28', borderRadius: 12, padding: 24, width: 420,
        border: '1px solid #2a2a35',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#e0e0e6' }}>New Lead</h3>
        {['name', 'email', 'phone', 'company', 'job_title'].map((key) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
              {key.replace('_', ' ')}
            </label>
            <input
              className="crm-edit-input"
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              style={{ marginTop: 4 }}
            />
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Department</label>
          <select
            className="crm-edit-select"
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            style={{ marginTop: 4 }}
          >
            <option value="">Select...</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} className="crm-filter-btn" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button onClick={handleSubmit} className="crm-add-btn" style={{ flex: 1, justifyContent: 'center' }}>Add Lead</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main CRM Page ────────────────────────────────────────────────────────────

export default function CrmPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHasHydrated(true);
    const unsub = useAuthStore.persist.onFinishHydration(() => setHasHydrated(true));
    return unsub;
  }, []);

  const {
    leads, isLoading, selectedLeadId, filters, sortField, sortDir,
    fetchLeads, selectLead, setFilter, clearFilters, setSort, updateLead,
  } = useCrmStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [activeView, setActiveView] = useState('leads');

  useEffect(() => {
    if (isAuthenticated) fetchLeads();
  }, [isAuthenticated, fetchLeads]);

  // ─── Filtered + sorted leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((l) =>
        l.name.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.deals?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((l) => filters.status.includes(l.status));
    }

    // Department filter
    if (filters.department.length > 0) {
      result = result.filter((l) => l.department && filters.department.includes(l.department));
    }

    // No conversion reason filter
    if (filters.noConversionReason.length > 0) {
      result = result.filter((l) => l.no_conversion_reason && filters.noConversionReason.includes(l.no_conversion_reason));
    }

    // Group filter
    if (filters.leadGroup.length > 0) {
      result = result.filter((l) => filters.leadGroup.includes(l.lead_group));
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const va = a[sortField] ?? '';
        const vb = b[sortField] ?? '';
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [leads, filters, sortField, sortDir]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

  // ─── Stats
  const stats = useMemo(() => ({
    total: leads.length,
    newLeads: leads.filter((l) => l.status === 'New Lead').length,
    contacted: leads.filter((l) => l.status === 'Sent E-mail' || l.status === 'Called').length,
    withDeals: leads.filter((l) => l.deals).length,
  }), [leads]);

  // Toggle filter values
  const toggleFilter = useCallback((key: 'status' | 'department' | 'noConversionReason' | 'leadGroup', val: string) => {
    const current = filters[key] as string[];
    if (current.includes(val)) {
      setFilter(key, current.filter((v) => v !== val));
    } else {
      setFilter(key, [...current, val]);
    }
  }, [filters, setFilter]);

  // ─── Sort header
  const SortHeader = ({ field, label, width }: { field: keyof CrmLead; label: string; width?: number }) => (
    <th
      onClick={() => setSort(field)}
      className={sortField === field ? 'sorted' : ''}
      style={{ width }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sortField === field && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </div>
    </th>
  );

  // ─── Auth gate
  if (!hasHydrated) return <div className="crm-loading"><div className="crm-spinner" /></div>;
  if (!isAuthenticated) return <LoginScreen />;
  if (isLoading) return <div className="crm-loading"><div className="crm-spinner" /></div>;

  // ─── Active groups for sidebar
  const leadGroups = [...new Set(leads.map((l) => l.lead_group))];

  return (
    <div className="crm-wrapper">
      {/* ─── Sidebar ─── */}
      <div className="crm-sidebar">
        <div className="crm-sidebar-header">
          <h1>GM CRM</h1>
          <p>Lead Management System</p>
        </div>

        <div className="crm-sidebar-nav">
          <div className="crm-nav-section">
            <div className="crm-nav-section-label">Views</div>
            <button
              className={`crm-nav-item ${activeView === 'leads' ? 'active' : ''}`}
              onClick={() => { setActiveView('leads'); clearFilters(); }}
            >
              <Users size={14} /> All Leads
              <span className="count">{leads.length}</span>
            </button>
            <button
              className={`crm-nav-item ${activeView === 'deals' ? 'active' : ''}`}
              onClick={() => { setActiveView('deals'); clearFilters(); }}
            >
              <Star size={14} /> With Deals
              <span className="count">{stats.withDeals}</span>
            </button>
          </div>

          <div className="crm-nav-section">
            <div className="crm-nav-section-label">Groups</div>
            {leadGroups.map((g) => (
              <button
                key={g}
                className={`crm-nav-item ${filters.leadGroup.includes(g) ? 'active' : ''}`}
                onClick={() => toggleFilter('leadGroup', g)}
              >
                <LayoutGrid size={14} /> {g}
                <span className="count">{leads.filter((l) => l.lead_group === g).length}</span>
              </button>
            ))}
          </div>


        </div>

        <Link href="/" className="crm-back-link">
          <ArrowLeft size={14} /> Back to NXFlow
        </Link>
      </div>

      {/* ─── Main area ─── */}
      <div className="crm-main">
        {/* Toolbar */}
        <div className="crm-toolbar">
          <div className="crm-search">
            <Search size={14} color="#6b7280" />
            <input
              placeholder="Search leads..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
            {filters.search && (
              <button onClick={() => setFilter('search', '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
                <X size={12} />
              </button>
            )}
          </div>

          <FilterDropdown
            label="Department"
            options={DEPARTMENTS}
            selected={filters.department}
            onToggle={(v) => toggleFilter('department', v)}
          />
          <FilterDropdown
            label="Reason"
            options={REASONS}
            selected={filters.noConversionReason}
            onToggle={(v) => toggleFilter('noConversionReason', v)}
          />

          {(filters.status.length > 0 || filters.department.length > 0 || filters.noConversionReason.length > 0 || filters.leadGroup.length > 0) && (
            <button className="crm-filter-btn" onClick={clearFilters}>
              <X size={12} /> Clear
            </button>
          )}

          <button className="crm-add-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> New Contact
          </button>
        </div>

        {/* Stats bar */}
        <div className="crm-stats-bar">
          <div className="crm-stat">
            <strong>{filteredLeads.length}</strong> leads shown
          </div>
          <div className="crm-stat">
            <div className="crm-stat-dot" style={{ background: '#818cf8' }} />
            <strong>{leads.length}</strong> Total
          </div>
          <div className="crm-stat">
            <div className="crm-stat-dot" style={{ background: '#00c875' }} />
            <strong>{stats.withDeals}</strong> With Deals
          </div>
        </div>

        {/* Table */}
        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <SortHeader field="name" label="Contact" width={180} />
                <SortHeader field="lead_date" label="Date" width={110} />
                <SortHeader field="deals" label="Deals" width={160} />
                <SortHeader field="no_conversion_reason" label="No Conversion Reason" width={200} />
                <SortHeader field="department" label="Department" width={200} />
                <SortHeader field="job_title" label="Job Title" width={140} />
                <SortHeader field="company" label="Company" width={160} />
                <SortHeader field="email" label="Email" width={200} />
                <SortHeader field="phone" label="Phone" width={140} />
                <SortHeader field="delivery_location" label="Delivery Location" width={160} />
                <SortHeader field="delivery_timeline" label="Delivery Timeline" width={150} />
                <SortHeader field="machine_model" label="Machine Model" width={200} />
                <SortHeader field="machine_quantity" label="Quantity" width={80} />
                <SortHeader field="location_type" label="Location Type" width={160} />
                <SortHeader field="end_user_or_supplier" label="End User / Supplier" width={160} />
                <SortHeader field="valuable_features" label="Valuable Features" width={220} />
                <SortHeader field="challenges" label="Challenges" width={200} />
                <SortHeader field="preferred_contact" label="Preferred Contact" width={140} />
                <SortHeader field="how_heard" label="How Heard" width={140} />
                <SortHeader field="additional_info" label="Additional Info" width={200} />
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className={selectedLeadId === lead.id ? 'selected' : ''}
                  onClick={() => selectLead(selectedLeadId === lead.id ? null : lead.id)}
                >
                  <td style={{ fontWeight: 600, color: '#e0e0e6' }}>{lead.name}</td>
                  <td>{formatDate(lead.lead_date)}</td>
                  <td>{lead.deals || '—'}</td>
                  <td>
                    {lead.no_conversion_reason ? (
                      <span className={`crm-reason ${getReasonClass(lead.no_conversion_reason)}`}>
                        {lead.no_conversion_reason}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {lead.department ? (
                      <span className={`crm-dept ${getDeptClass(lead.department)}`}>
                        {lead.department}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{lead.job_title || '—'}</td>
                  <td>{lead.company || '—'}</td>
                  <td>{lead.email || '—'}</td>
                  <td>{lead.phone || '—'}</td>
                  <td>{lead.delivery_location || '—'}</td>
                  <td>{lead.delivery_timeline || '—'}</td>
                  <td>{lead.machine_model || '—'}</td>
                  <td>{lead.machine_quantity || '—'}</td>
                  <td>{lead.location_type || '—'}</td>
                  <td>{lead.end_user_or_supplier || '—'}</td>
                  <td>{lead.valuable_features || '—'}</td>
                  <td>{lead.challenges || '—'}</td>
                  <td>{lead.preferred_contact || '—'}</td>
                  <td>{lead.how_heard || '—'}</td>
                  <td>{lead.additional_info || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <div className="crm-empty">
              <Users size={40} />
              <p>No leads match your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Detail Panel ─── */}
      {selectedLead && (
        <DetailPanel lead={selectedLead} onClose={() => selectLead(null)} />
      )}

      {/* ─── Add Modal ─── */}
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
