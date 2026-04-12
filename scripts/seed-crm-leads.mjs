#!/usr/bin/env node
// CRM Leads — Create table + import data from Monday.com Excel export

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const BASE = 'https://tgyldglldaaretrydelz.supabase.co/rest/v1';
const KEY = 'sb_publishable_ptsW9EyVCJmZ3Q_kgWaPpg_2CMg6Wzs';
const HEADERS = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

// ─── Parse Excel ──────────────────────────────────────────────────────────────

function parseLeads() {
  const wb = XLSX.readFile('/Users/tulu/Downloads/Leads_1776027538.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: 2 });

  const leads = [];
  let currentGroup = 'GM';

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    // Header row → new group (group name is on previous row)
    if (row[0] === 'Name' && row[1] === 'Date') {
      if (i > 1 && raw[i-1][0] && raw[i-1][0] !== 'Name') {
        currentGroup = raw[i-1][0];
      }
      continue;
    }
    // Skip group name rows & empty
    if (!row[0] || (row[0] && !row[1] && !row[3] && !row[4] && !row[5])) continue;

    // Parse date (Excel serial → ISO)
    let dateStr = '';
    if (typeof row[1] === 'number') {
      const d = XLSX.SSF.parse_date_code(row[1]);
      dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    } else if (row[1]) {
      dateStr = String(row[1]);
    }

    leads.push({
      name: String(row[0] || '').trim(),
      lead_date: dateStr || null,
      call: row[2] === true || row[2] === '✓' || row[2] === 'TRUE' || row[2] === 1,
      deals: String(row[3] || '').trim() || null,
      no_conversion_reason: String(row[4] || '').trim() || null,
      department: String(row[5] || '').trim() || null,
      job_title: String(row[6] || '').trim() || null,
      status: String(row[7] || '').trim() || 'New Lead',
      company: String(row[8] || '').trim() || null,
      email: String(row[9] || '').trim() || null,
      phone: String(row[10] || '').trim() || null,
      delivery_location: String(row[11] || '').trim() || null,
      delivery_timeline: String(row[12] || '').trim() || null,
      machine_model: String(row[13] || '').trim() || null,
      machine_quantity: row[14] ? parseInt(row[14]) || null : null,
      location_type: String(row[15] || '').trim() || null,
      location_other: String(row[16] || '').trim() || null,
      end_user_or_supplier: String(row[17] || '').trim() || null,
      user_type_specify: String(row[18] || '').trim() || null,
      valuable_features: String(row[19] || '').trim() || null,
      challenges: String(row[20] || '').trim() || null,
      preferred_contact: String(row[21] || '').trim() || null,
      how_heard: String(row[22] || '').trim() || null,
      how_heard_specify: String(row[23] || '').trim() || null,
      include_capability: String(row[24] || '').trim() || null,
      additional_info: String(row[25] || '').trim() || null,
      utm_campaign: String(row[26] || '').trim() || null,
      utm_source: String(row[27] || '').trim() || null,
      utm_medium: String(row[28] || '').trim() || null,
      utm_campaign_2: String(row[29] || '').trim() || null,
      utm_content: String(row[30] || '').trim() || null,
      gclid: String(row[31] || '').trim() || null,
      utm_term: String(row[32] || '').trim() || null,
      lead_group: currentGroup,
    });
  }

  return leads;
}

// ─── Create table via RPC (SQL) ───────────────────────────────────────────────

async function createTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS crm_leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      lead_date date,
      call boolean DEFAULT false,
      deals text,
      no_conversion_reason text,
      department text,
      job_title text,
      status text DEFAULT 'New Lead',
      company text,
      email text,
      phone text,
      delivery_location text,
      delivery_timeline text,
      machine_model text,
      machine_quantity integer,
      location_type text,
      location_other text,
      end_user_or_supplier text,
      user_type_specify text,
      valuable_features text,
      challenges text,
      preferred_contact text,
      how_heard text,
      how_heard_specify text,
      include_capability text,
      additional_info text,
      utm_campaign text,
      utm_source text,
      utm_medium text,
      utm_campaign_2 text,
      utm_content text,
      gclid text,
      utm_term text,
      lead_group text DEFAULT 'GM',
      notes text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- RLS (open for now, same as other tables)
    ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for crm_leads" ON crm_leads;
    CREATE POLICY "Allow all for crm_leads" ON crm_leads FOR ALL USING (true) WITH CHECK (true);

    -- Enable realtime
    ALTER PUBLICATION supabase_realtime ADD TABLE crm_leads;
  `;

  const res = await fetch(`${BASE}/rpc/exec_sql`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // Try direct SQL via management API — fallback to inserting data assuming table exists
    console.log('⚠ exec_sql RPC not available. Create the table manually in Supabase SQL editor.');
    console.log('SQL:\n', sql);
    return false;
  }
  console.log('✓ Table crm_leads created');
  return true;
}

// ─── Insert leads in batches ──────────────────────────────────────────────────

async function insertLeads(leads) {
  const BATCH = 20;
  let inserted = 0;

  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    const res = await fetch(`${BASE}/crm_leads`, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`✗ Batch ${i}-${i+batch.length}:`, err);
      return inserted;
    }
    inserted += batch.length;
    console.log(`  ✓ Imported ${inserted}/${leads.length} leads`);
  }
  return inserted;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🏗️  CRM Leads — Table Setup & Data Import\n');

  // Parse
  const leads = parseLeads();
  console.log(`📊 Parsed ${leads.length} leads from Excel\n`);

  // Groups
  const groups = {};
  leads.forEach(l => { groups[l.lead_group] = (groups[l.lead_group] || 0) + 1; });
  console.log('Groups:', groups);

  // Create table
  await createTable();

  // Insert
  console.log('\n📥 Importing leads...');
  const count = await insertLeads(leads);
  console.log(`\n✅ Import complete: ${count}/${leads.length} leads imported\n`);
}

main().catch(console.error);
