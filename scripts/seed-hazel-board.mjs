#!/usr/bin/env node
// Hazel Weekly Plan — April 13-17, 2026
// OKR-based board with tasks and subtasks

const BASE = 'https://tgyldglldaaretrydelz.supabase.co/rest/v1';
const KEY = 'sb_publishable_ptsW9EyVCJmZ3Q_kgWaPpg_2CMg6Wzs';
const HEADERS = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

async function insert(table, data) {
  const res = await fetch(`${BASE}/${table}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`ERROR inserting into ${table}:`, text);
    throw new Error(text);
  }
  console.log(`  ✓ ${table}: ${data.id || data.name || 'ok'}`);
}

const BOARD_ID = 'b-hazel-weekly';
const HAZEL = 'u1';
const W = 'ws1';

const DEFAULT_COLUMNS = [
  { id: 'task-name', type: 'task-name', label: 'Task', width: 380, sortable: true, filterable: false },
  { id: 'assignee', type: 'assignee', label: 'People', width: 120, sortable: false, filterable: true },
  { id: 'status', type: 'status', label: 'Status', width: 150, sortable: true, filterable: true },
  { id: 'timeline', type: 'timeline', label: 'Timeline', width: 170, sortable: true, filterable: false },
  { id: 'link', type: 'link', label: 'Link', width: 120, sortable: false, filterable: false },
];

// ─── Group IDs ────────────────────────────────────────────────────────────────
const G_MCM_ADS = 'g-hz-mcm-ads';
const G_HCM_ADS = 'g-hz-hcm-ads';
const G_CONTENT = 'g-hz-content';
const G_MCM_AUDIT = 'g-hz-mcm-audit';
const G_HCM_404 = 'g-hz-hcm-404';
const G_GMD = 'g-hz-gmd';

// ─── Timelines ────────────────────────────────────────────────────────────────
const MON = '2026-04-13';
const TUE = '2026-04-14';
const WED = '2026-04-15';
const THU = '2026-04-16';
const FRI = '2026-04-17';
const FULL_WEEK = { start: MON, end: FRI };

function task(id, groupId, name, timeline, order, link = '', linkLabel = '') {
  return {
    id,
    group_id: groupId,
    board_id: BOARD_ID,
    name,
    cells: {
      assignee: { type: 'assignee', userIds: [HAZEL] },
      status: { type: 'status', statusId: 'not-started' },
      timeline: { type: 'timeline', ...timeline },
      link: { type: 'link', url: link, label: linkLabel },
    },
    order,
  };
}

function sub(id, taskId, name, pos) {
  return { id, task_id: taskId, name, completed: false, position: pos };
}

async function seed() {
  console.log('\n🚀 Creating Hazel Weekly Board...\n');

  // 1. Board
  await insert('boards', {
    id: BOARD_ID,
    workspace_id: W,
    name: 'Hazel — Week Apr 13-17',
    description: 'Hazel\'s OKR-based weekly plan: MCM & HCM Google Ads restructuring, content generation, site audits, 404 redirects, GM Defensive migration',
    group_order: [G_MCM_ADS, G_HCM_ADS, G_CONTENT, G_MCM_AUDIT, G_HCM_404, G_GMD],
    columns: DEFAULT_COLUMNS,
  });

  // 2. Update workspace board_ids
  const wsRes = await fetch(`${BASE}/workspaces?id=eq.${W}`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` },
  });
  const wsData = await wsRes.json();
  const existingBoardIds = wsData[0]?.board_ids || [];
  if (!existingBoardIds.includes(BOARD_ID)) {
    await fetch(`${BASE}/workspaces?id=eq.${W}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ board_ids: [...existingBoardIds, BOARD_ID] }),
    });
    console.log('  ✓ workspace: board_ids updated');
  }

  // 3. Groups
  const groups = [
    { id: G_MCM_ADS, board_id: BOARD_ID, name: 'OKR 1 — MCM Google Ads Restructure', color: '#6366f1', task_order: ['t-hz-01','t-hz-02','t-hz-03','t-hz-04','t-hz-05'], position: 0 },
    { id: G_HCM_ADS, board_id: BOARD_ID, name: 'OKR 2 — HCM Google Ads Restructure', color: '#0891b2', task_order: ['t-hz-06','t-hz-07','t-hz-08','t-hz-09','t-hz-10'], position: 1 },
    { id: G_CONTENT, board_id: BOARD_ID, name: 'OKR 3 — Daily Blog Content', color: '#059669', task_order: ['t-hz-11','t-hz-12'], position: 2 },
    { id: G_MCM_AUDIT, board_id: BOARD_ID, name: 'OKR 4 — MCM Site Audit Fixes', color: '#f59e0b', task_order: ['t-hz-13','t-hz-14','t-hz-15'], position: 3 },
    { id: G_HCM_404, board_id: BOARD_ID, name: 'OKR 5 — HCM 404 Redirect Cleanup', color: '#e11d48', task_order: ['t-hz-16','t-hz-17','t-hz-18'], position: 4 },
    { id: G_GMD, board_id: BOARD_ID, name: 'OKR 6 — GM Defensive URL Migration', color: '#7c3aed', task_order: ['t-hz-19','t-hz-20'], position: 5 },
  ];
  for (const g of groups) await insert('groups', g);

  // ═══ OKR 1: MCM Google Ads ═══
  const mcmTasks = [
    task('t-hz-01', G_MCM_ADS, 'OHCO & KOYO brand-defense campaigns — setup', { start: MON, end: TUE }, 0, 'https://ads.google.com', 'Google Ads'),
    task('t-hz-02', G_MCM_ADS, 'Brand-defense budget isolation per campaign', { start: TUE, end: TUE }, 1),
    task('t-hz-03', G_MCM_ADS, 'Keyword restructure — brand/model exact + phrase', { start: TUE, end: WED }, 2),
    task('t-hz-04', G_MCM_ADS, 'RSA rewrite — service/warranty/showroom certainty', { start: WED, end: THU }, 3),
    task('t-hz-05', G_MCM_ADS, 'Asset completion — sitelinks, callouts, location, call', { start: THU, end: FRI }, 4),
  ];
  for (const t of mcmTasks) await insert('tasks', t);

  const mcmSubs = [
    // t-hz-01 subs
    sub('s-01-1', 't-hz-01', 'Create OHCO brand-defense campaign in Google Ads', 0),
    sub('s-01-2', 't-hz-01', 'Create KOYO brand-defense campaign in Google Ads', 1),
    sub('s-01-3', 't-hz-01', 'Set campaign goals, bidding strategy (target impression share)', 2),
    sub('s-01-4', 't-hz-01', 'Define ad schedule and geo-targeting', 3),
    // t-hz-02 subs
    sub('s-02-1', 't-hz-02', 'Set separate daily budgets for OHCO defense campaign', 0),
    sub('s-02-2', 't-hz-02', 'Set separate daily budgets for KOYO defense campaign', 1),
    sub('s-02-3', 't-hz-02', 'Enable budget protection (shared budgets OFF)', 2),
    // t-hz-03 subs
    sub('s-03-1', 't-hz-03', 'Build OHCO exact match keyword list (brand + model names)', 0),
    sub('s-03-2', 't-hz-03', 'Build KOYO exact match keyword list (brand + model names)', 1),
    sub('s-03-3', 't-hz-03', 'Add phrase match variants for each brand', 2),
    sub('s-03-4', 't-hz-03', 'Add negative keywords to prevent cross-brand cannibalization', 3),
    // t-hz-04 subs
    sub('s-04-1', 't-hz-04', 'Write OHCO RSAs — service/warranty/showroom messaging', 0),
    sub('s-04-2', 't-hz-04', 'Write KOYO RSAs — service/warranty/showroom messaging', 1),
    sub('s-04-3', 't-hz-04', 'Pin headlines and descriptions for brand-defense positioning', 2),
    sub('s-04-4', 't-hz-04', 'A/B test copy variants (certainty vs. comparison angles)', 3),
    // t-hz-05 subs
    sub('s-05-1', 't-hz-05', 'Create sitelink extensions (showroom, warranty, models, contact)', 0),
    sub('s-05-2', 't-hz-05', 'Create callout extensions (free delivery, showroom experience)', 1),
    sub('s-05-3', 't-hz-05', 'Set up location extensions (all showroom addresses)', 2),
    sub('s-05-4', 't-hz-05', 'Set up call extensions with tracking numbers', 3),
  ];
  for (const s of mcmSubs) await insert('subtasks', s);

  // ═══ OKR 2: HCM Google Ads ═══
  const hcmTasks = [
    task('t-hz-06', G_HCM_ADS, 'Osaki & Fujiiryoki brand-defense campaigns — setup', { start: MON, end: TUE }, 0, 'https://ads.google.com', 'Google Ads'),
    task('t-hz-07', G_HCM_ADS, 'Extract brand-core queries from model ad groups', { start: TUE, end: WED }, 1),
    task('t-hz-08', G_HCM_ADS, 'Negative sculpting — clean query ownership', { start: WED, end: THU }, 2),
    task('t-hz-09', G_HCM_ADS, 'Exact-first keyword architecture', { start: THU, end: THU }, 3),
    task('t-hz-10', G_HCM_ADS, 'RSA + asset sets rewrite — brand-specific', { start: THU, end: FRI }, 4),
  ];
  for (const t of hcmTasks) await insert('tasks', t);

  const hcmSubs = [
    sub('s-06-1', 't-hz-06', 'Create Osaki brand-defense campaign', 0),
    sub('s-06-2', 't-hz-06', 'Create Fujiiryoki brand-defense campaign', 1),
    sub('s-06-3', 't-hz-06', 'Set bidding to target impression share (top of page)', 2),
    sub('s-06-4', 't-hz-06', 'Define daily budgets per brand campaign', 3),
    sub('s-07-1', 't-hz-07', 'Audit existing model ad groups for brand-core queries', 0),
    sub('s-07-2', 't-hz-07', 'Extract and document brand-core query list per brand', 1),
    sub('s-07-3', 't-hz-07', 'Move brand-core queries to brand-defense campaigns', 2),
    sub('s-07-4', 't-hz-07', 'Add brand-core as negatives in model ad groups', 3),
    sub('s-08-1', 't-hz-08', 'Run search terms report — identify mismatch queries', 0),
    sub('s-08-2', 't-hz-08', 'Add negative keywords for competitor brands', 1),
    sub('s-08-3', 't-hz-08', 'Ensure Osaki queries don\'t trigger Fujiiryoki ads & vice versa', 2),
    sub('s-08-4', 't-hz-08', 'Verify query ownership clean separation after sculpting', 3),
    sub('s-09-1', 't-hz-09', 'Set all brand keywords to exact match as primary', 0),
    sub('s-09-2', 't-hz-09', 'Add phrase match as secondary for discovery', 1),
    sub('s-09-3', 't-hz-09', 'Remove broad match keywords from brand campaigns', 2),
    sub('s-10-1', 't-hz-10', 'Rewrite Osaki RSAs — brand authority messaging', 0),
    sub('s-10-2', 't-hz-10', 'Rewrite Fujiiryoki RSAs — premium positioning', 1),
    sub('s-10-3', 't-hz-10', 'Create brand-specific sitelinks + callouts', 2),
    sub('s-10-4', 't-hz-10', 'Add structured snippets (models, features, categories)', 3),
  ];
  for (const s of hcmSubs) await insert('subtasks', s);

  // ═══ OKR 3: Daily Blog Content ═══
  const contentTasks = [
    task('t-hz-11', G_CONTENT, 'MCM daily blog generation & publish (5 posts)', FULL_WEEK, 0, 'https://massagechairmart.com/blog', 'MCM Blog'),
    task('t-hz-12', G_CONTENT, 'HCM daily blog generation & publish (5 posts)', FULL_WEEK, 1, 'https://houseofmassagechairs.com/blog', 'HCM Blog'),
  ];
  for (const t of contentTasks) await insert('tasks', t);

  const contentSubs = [
    sub('s-11-1', 't-hz-11', 'Mon — Generate & publish MCM blog post #1', 0),
    sub('s-11-2', 't-hz-11', 'Tue — Generate & publish MCM blog post #2', 1),
    sub('s-11-3', 't-hz-11', 'Wed — Generate & publish MCM blog post #3', 2),
    sub('s-11-4', 't-hz-11', 'Thu — Generate & publish MCM blog post #4', 3),
    sub('s-11-5', 't-hz-11', 'Fri — Generate & publish MCM blog post #5', 4),
    sub('s-12-1', 't-hz-12', 'Mon — Generate & publish HCM blog post #1', 0),
    sub('s-12-2', 't-hz-12', 'Tue — Generate & publish HCM blog post #2', 1),
    sub('s-12-3', 't-hz-12', 'Wed — Generate & publish HCM blog post #3', 2),
    sub('s-12-4', 't-hz-12', 'Thu — Generate & publish HCM blog post #4', 3),
    sub('s-12-5', 't-hz-12', 'Fri — Generate & publish HCM blog post #5', 4),
  ];
  for (const s of contentSubs) await insert('subtasks', s);

  // ═══ OKR 4: MCM Site Audit ═══
  const auditTasks = [
    task('t-hz-13', G_MCM_AUDIT, 'Fix 39 pages with long title elements', { start: MON, end: WED }, 0, 'https://massagechairmart.com', 'MCM Site'),
    task('t-hz-14', G_MCM_AUDIT, 'Fix 2 uncrawlable links (incorrect URL formats)', { start: WED, end: WED }, 1),
    task('t-hz-15', G_MCM_AUDIT, 'Fix 4 broken external links', { start: WED, end: THU }, 2),
  ];
  for (const t of auditTasks) await insert('tasks', t);

  const auditSubs = [
    sub('s-13-1', 't-hz-13', 'Export list of 39 pages with title > 60 characters', 0),
    sub('s-13-2', 't-hz-13', 'Rewrite titles — keep under 60 chars, include primary keyword', 1),
    sub('s-13-3', 't-hz-13', 'Update title tags in CMS / Shopify', 2),
    sub('s-13-4', 't-hz-13', 'Verify changes in Screaming Frog re-crawl', 3),
    sub('s-14-1', 't-hz-14', 'Identify the 2 URLs with incorrect format', 0),
    sub('s-14-2', 't-hz-14', 'Fix URL format issues (encoding, special chars, trailing slashes)', 1),
    sub('s-14-3', 't-hz-14', 'Verify crawlability after fix', 2),
    sub('s-15-1', 't-hz-15', 'Identify all 4 broken external link destinations', 0),
    sub('s-15-2', 't-hz-15', 'Find replacement URLs or remove dead links', 1),
    sub('s-15-3', 't-hz-15', 'Update links in page content', 2),
    sub('s-15-4', 't-hz-15', 'Test all 4 links return 200 status', 3),
  ];
  for (const s of auditSubs) await insert('subtasks', s);

  // ═══ OKR 5: HCM 404 Redirects ═══
  const redirectTasks = [
    task('t-hz-16', G_HCM_404, 'Audit 33 pages returning 404 — identify correct blog URLs', { start: MON, end: TUE }, 0, 'https://admin.shopify.com/store/houseofmassagechairs/apps/nabu-redirect-manager/shopify/redirect-manager/dashboard', 'Redirect Manager'),
    task('t-hz-17', G_HCM_404, 'Create 301 redirects — old URLs → correct blog posts', { start: TUE, end: THU }, 1),
    task('t-hz-18', G_HCM_404, 'Rerun site audit after redirects + verify 0 errors', { start: FRI, end: FRI }, 2),
  ];
  for (const t of redirectTasks) await insert('tasks', t);

  const redirectSubs = [
    sub('s-16-1', 't-hz-16', 'Export all 33 URLs returning 404 from redirect manager', 0),
    sub('s-16-2', 't-hz-16', 'For each 404 blog URL — find matching live blog post in Shopify', 1),
    sub('s-16-3', 't-hz-16', 'Document old URL → new URL mapping in spreadsheet', 2),
    sub('s-16-4', 't-hz-16', 'VERIFY: No redirect points to homepage (/) — every redirect must go to a specific page', 3),
    sub('s-17-1', 't-hz-17', 'Enter all 301 redirects in Shopify Nabu Redirect Manager', 0),
    sub('s-17-2', 't-hz-17', 'Set redirect type to 301 (permanent) for all', 1),
    sub('s-17-3', 't-hz-17', 'Test 5 sample redirects — verify they resolve correctly', 2),
    sub('s-17-4', 't-hz-17', 'Bulk test all 33 redirects with curl/HTTP status checker', 3),
    sub('s-18-1', 't-hz-18', 'Run full site crawl in Screaming Frog / Semrush', 0),
    sub('s-18-2', 't-hz-18', 'Verify 0 remaining 404 errors for previously broken URLs', 1),
    sub('s-18-3', 't-hz-18', 'Check Search Console for any new crawl errors', 2),
    sub('s-18-4', 't-hz-18', 'Submit updated sitemap to Google Search Console', 3),
  ];
  for (const s of redirectSubs) await insert('subtasks', s);

  // ═══ OKR 6: GM Defensive URL Migration ═══
  const gmdTasks = [
    task('t-hz-19', G_GMD, 'Review assigned URLs — index/noindex/redirect decisions', FULL_WEEK, 0, 'https://docs.google.com/spreadsheets/d/17RYsA2HXGP-h54iEnq9bSVYhV42i1-_ImudRPqkwI8k/edit', 'URL Master Sheet'),
    task('t-hz-20', G_GMD, 'Document redirect destinations for each URL', FULL_WEEK, 1),
  ];
  for (const t of gmdTasks) await insert('tasks', t);

  const gmdSubs = [
    sub('s-19-1', 't-hz-19', 'Go through each assigned URL in the master sheet', 0),
    sub('s-19-2', 't-hz-19', 'Mark each URL as: INDEX / NOINDEX / REDIRECT', 1),
    sub('s-19-3', 't-hz-19', 'For REDIRECT pages — identify the correct new destination URL', 2),
    sub('s-19-4', 't-hz-19', 'For NOINDEX pages — add justification (duplicate, thin, obsolete)', 3),
    sub('s-19-5', 't-hz-19', 'Cross-reference with Google Analytics for traffic data per URL', 4),
    sub('s-20-1', 't-hz-20', 'Fill redirect destination column in master sheet', 0),
    sub('s-20-2', 't-hz-20', 'Verify no redirect points to homepage or generic pages', 1),
    sub('s-20-3', 't-hz-20', 'Flag any URLs needing Tulu\'s review/decision', 2),
    sub('s-20-4', 't-hz-20', 'Update status column when each URL decision is finalized', 3),
  ];
  for (const s of gmdSubs) await insert('subtasks', s);

  console.log('\n✅ Hazel Weekly Board created with 6 OKRs, 20 tasks, 73 subtasks!\n');
}

seed().catch(console.error);
