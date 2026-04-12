#!/usr/bin/env node
// Fix Hazel board links — only use links provided by user

const BASE = 'https://tgyldglldaaretrydelz.supabase.co/rest/v1';
const KEY = 'sb_publishable_ptsW9EyVCJmZ3Q_kgWaPpg_2CMg6Wzs';
const HEADERS = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

// User-provided links
const LINKS = {
  // MCM Google Ads tasks → ChatGPT MCM link
  MCM_ADS: {
    url: 'https://chatgpt.com/g/g-p-699e53a1252c819192edffc3669ea599-seo-mcm/c/69dbdaad-b988-8331-9b82-2c8287a4d620',
    label: 'MCM Ads Plan',
  },
  // HCM Google Ads tasks → ChatGPT HCM link
  HCM_ADS: {
    url: 'https://chatgpt.com/c/69dbdec0-e054-8331-9933-90f4747876eb',
    label: 'HCM Ads Plan',
  },
  // HCM 404 Redirects → Shopify redirect manager
  HCM_REDIRECTS: {
    url: 'https://admin.shopify.com/store/houseofmassagechairs/apps/nabu-redirect-manager/shopify/redirect-manager/dashboard',
    label: 'Redirect Manager',
  },
  // GM Defensive → Google Sheets
  GMD: {
    url: 'https://docs.google.com/spreadsheets/d/17RYsA2HXGP-h54iEnq9bSVYhV42i1-_ImudRPqkwI8k/edit?gid=0#gid=0',
    label: 'URL Master Sheet',
  },
  // Empty — no link provided
  NONE: { url: '', label: '' },
};

// Task ID → which link to use
const TASK_LINKS = {
  // OKR 1: MCM Google Ads (all 5 tasks)
  't-hz-01': LINKS.MCM_ADS,
  't-hz-02': LINKS.MCM_ADS,
  't-hz-03': LINKS.MCM_ADS,
  't-hz-04': LINKS.MCM_ADS,
  't-hz-05': LINKS.MCM_ADS,
  // OKR 2: HCM Google Ads (all 5 tasks)
  't-hz-06': LINKS.HCM_ADS,
  't-hz-07': LINKS.HCM_ADS,
  't-hz-08': LINKS.HCM_ADS,
  't-hz-09': LINKS.HCM_ADS,
  't-hz-10': LINKS.HCM_ADS,
  // OKR 3: Daily Blog Content (no specific link given)
  't-hz-11': LINKS.NONE,
  't-hz-12': LINKS.NONE,
  // OKR 4: MCM Site Audit (no specific link given)
  't-hz-13': LINKS.NONE,
  't-hz-14': LINKS.NONE,
  't-hz-15': LINKS.NONE,
  // OKR 5: HCM 404 Redirects
  't-hz-16': LINKS.HCM_REDIRECTS,
  't-hz-17': LINKS.HCM_REDIRECTS,
  't-hz-18': LINKS.HCM_REDIRECTS,
  // OKR 6: GM Defensive
  't-hz-19': LINKS.GMD,
  't-hz-20': LINKS.GMD,
};

async function fixLinks() {
  console.log('\n🔗 Fixing Hazel board links...\n');

  for (const [taskId, link] of Object.entries(TASK_LINKS)) {
    // Fetch current task to get existing cells
    const res = await fetch(`${BASE}/tasks?id=eq.${taskId}&select=cells`, {
      headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` },
    });
    const data = await res.json();
    if (!data[0]) { console.log(`  ⚠ ${taskId} not found`); continue; }

    const cells = data[0].cells || {};
    cells.link = { type: 'link', url: link.url, label: link.label };

    const patchRes = await fetch(`${BASE}/tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ cells }),
    });

    if (!patchRes.ok) {
      console.error(`  ✗ ${taskId}:`, await patchRes.text());
    } else {
      console.log(`  ✓ ${taskId} → ${link.label || '(empty)'}`);
    }
  }

  console.log('\n✅ All links updated!\n');
}

fixLinks().catch(console.error);
