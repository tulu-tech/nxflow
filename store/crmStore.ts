import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CrmLead {
  id: string;
  name: string;
  lead_date: string | null;
  call: boolean;
  deals: string | null;
  no_conversion_reason: string | null;
  department: string | null;
  job_title: string | null;
  status: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  delivery_location: string | null;
  delivery_timeline: string | null;
  machine_model: string | null;
  machine_quantity: number | null;
  location_type: string | null;
  location_other: string | null;
  end_user_or_supplier: string | null;
  user_type_specify: string | null;
  valuable_features: string | null;
  challenges: string | null;
  preferred_contact: string | null;
  how_heard: string | null;
  how_heard_specify: string | null;
  include_capability: string | null;
  additional_info: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign_2: string | null;
  utm_content: string | null;
  gclid: string | null;
  utm_term: string | null;
  lead_group: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmFilters {
  search: string;
  status: string[];
  department: string[];
  noConversionReason: string[];
  leadGroup: string[];
}

interface CrmState {
  leads: CrmLead[];
  isLoading: boolean;
  selectedLeadId: string | null;
  filters: CrmFilters;
  sortField: keyof CrmLead | null;
  sortDir: 'asc' | 'desc';

  // Actions
  fetchLeads: () => Promise<void>;
  selectLead: (id: string | null) => void;
  updateLead: (id: string, updates: Partial<CrmLead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addLead: (lead: Partial<CrmLead>) => Promise<void>;
  setFilter: (key: keyof CrmFilters, value: string | string[]) => void;
  clearFilters: () => void;
  setSort: (field: keyof CrmLead) => void;
}

const EMPTY_FILTERS: CrmFilters = {
  search: '',
  status: [],
  department: [],
  noConversionReason: [],
  leadGroup: [],
};

export const useCrmStore = create<CrmState>()((set, get) => ({
  leads: [],
  isLoading: false,
  selectedLeadId: null,
  filters: { ...EMPTY_FILTERS },
  sortField: 'lead_date',
  sortDir: 'desc',

  fetchLeads: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .order('lead_date', { ascending: false, nullsFirst: false });

    if (!error && data) {
      set({ leads: data as CrmLead[], isLoading: false });
    } else {
      console.error('CRM fetch error:', error);
      set({ isLoading: false });
    }
  },

  selectLead: (id) => set({ selectedLeadId: id }),

  updateLead: async (id, updates) => {
    const { error } = await supabase
      .from('crm_leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      set((s) => ({
        leads: s.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      }));
    }
  },

  deleteLead: async (id) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (!error) {
      set((s) => ({
        leads: s.leads.filter((l) => l.id !== id),
        selectedLeadId: s.selectedLeadId === id ? null : s.selectedLeadId,
      }));
    }
  },

  addLead: async (lead) => {
    const { data, error } = await supabase
      .from('crm_leads')
      .insert([{ status: 'New Lead', lead_group: 'GM', ...lead }])
      .select()
      .single();

    if (!error && data) {
      set((s) => ({ leads: [data as CrmLead, ...s.leads] }));
    }
  },

  setFilter: (key, value) => {
    set((s) => ({
      filters: { ...s.filters, [key]: value },
    }));
  },

  clearFilters: () => set({ filters: { ...EMPTY_FILTERS } }),

  setSort: (field) => {
    const { sortField, sortDir } = get();
    if (sortField === field) {
      set({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      set({ sortField: field, sortDir: 'asc' });
    }
  },
}));
