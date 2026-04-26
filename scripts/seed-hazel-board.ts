/**
 * Seed script: Hazel — 27 April – 1 May Board
 *
 * Run:  npx tsx scripts/seed-hazel-board.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tgyldglldaaretrydelz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ptsW9EyVCJmZ3Q_kgWaPpg_2CMg6Wzs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── IDs ─────────────────────────────────────────────────────────────────────

const BOARD_ID  = 'b-hazel-apr27';
const WS_ID     = 'ws1';          // Existing "Alba" workspace
const HAZEL_ID  = 'u1';           // Hazel user

// Groups
const G_ADS     = 'g-hz-ads';      // Google Ads Campaign Fixes
const G_CONTENT = 'g-hz-content';  // Content Publishing
const G_SEO     = 'g-hz-seo';      // SEO Technical Fixes
const G_RUNFLAT = 'g-hz-runflat';  // Runflat Content

// ─── Column schema (same as DEFAULT_COLUMNS) ────────────────────────────────

const COLUMNS = [
  { id: 'task-name', type: 'task-name', label: 'Task', width: 380, sortable: true, filterable: false },
  { id: 'assignee', type: 'assignee', label: 'People', width: 120, sortable: false, filterable: true },
  { id: 'status', type: 'status', label: 'Status', width: 150, sortable: true, filterable: true },
  { id: 'timeline', type: 'timeline', label: 'Timeline', width: 170, sortable: true, filterable: false },
  { id: 'link', type: 'link', label: 'Link', width: 120, sortable: false, filterable: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const now = new Date().toISOString();

function makeTask(
  id: string,
  groupId: string,
  name: string,
  order: number,
  opts: {
    assigneeIds?: string[];
    statusId?: string;
    timelineStart?: string;
    timelineEnd?: string;
    linkUrl?: string;
    linkLabel?: string;
  } = {}
) {
  return {
    id,
    group_id: groupId,
    board_id: BOARD_ID,
    name,
    order,
    cells: {
      assignee: { type: 'assignee', userIds: opts.assigneeIds || [HAZEL_ID] },
      status: { type: 'status', statusId: opts.statusId || 'not-started' },
      timeline: {
        type: 'timeline',
        start: opts.timelineStart || null,
        end: opts.timelineEnd || null,
      },
      link: {
        type: 'link',
        url: opts.linkUrl || '',
        label: opts.linkLabel || '',
      },
    },
    created_at: now,
    updated_at: now,
  };
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

// Group 1: Google Ads Campaign Fixes
const adsTasks = [
  makeTask('t-hz-ads-1', G_ADS, 'Review Runflat Tire Machine campaign errors — apply pending changes', 0, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-04-27',
    linkUrl: 'https://ads.google.com',
    linkLabel: 'Google Ads',
  }),
  makeTask('t-hz-ads-2', G_ADS, 'Review Runflat Military Tires campaign errors — apply pending changes', 1, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-04-27',
    linkUrl: 'https://ads.google.com',
    linkLabel: 'Google Ads',
  }),
  makeTask('t-hz-ads-3', G_ADS, 'Fix missing sitelink extensions — Runflat Tire Machine campaign', 2, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-04-28',
    linkUrl: 'https://ads.google.com',
    linkLabel: 'Google Ads',
  }),
  makeTask('t-hz-ads-4', G_ADS, 'Fix missing sitelink extensions — Runflat Military Tires campaign', 3, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-04-28',
    linkUrl: 'https://ads.google.com',
    linkLabel: 'Google Ads',
  }),
  makeTask('t-hz-ads-5', G_ADS, 'Add missing image extensions — both Runflat campaigns', 4, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-04-28',
    linkUrl: 'https://ads.google.com',
    linkLabel: 'Google Ads',
  }),
  makeTask('t-hz-ads-6', G_ADS, 'Resolve conflicting negative keywords — both Runflat campaigns', 5, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-04-28',
    linkUrl: 'https://ads.google.com',
    linkLabel: 'Google Ads',
  }),
];

// Group 2: Content Publishing (HCM, MCM, GM Defensive)
const contentTasks = [
  makeTask('t-hz-cnt-1', G_CONTENT, 'Publish HCM blog content — 10 articles total for this week', 0, {
    statusId: 'not-started',
    timelineStart: '2026-04-30',
    timelineEnd: '2026-05-01',
    linkUrl: 'https://www.healthcaremassagechair.com/blogs',
    linkLabel: 'HCM Blog',
  }),
  makeTask('t-hz-cnt-2', G_CONTENT, 'Publish MCM blog content — 10 articles total for this week', 1, {
    statusId: 'not-started',
    timelineStart: '2026-04-30',
    timelineEnd: '2026-05-01',
    linkUrl: 'https://www.massagechairmarket.com/blogs',
    linkLabel: 'MCM Blog',
  }),
  makeTask('t-hz-cnt-3', G_CONTENT, 'Write GM Defensive content — 5 articles total for this week', 2, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-05-01',
    linkUrl: 'https://www.gmdefensive.com',
    linkLabel: 'GM Defensive',
  }),
];

// Group 3: SEO Technical Fixes (Long Title Elements)
const seoTasks = [
  makeTask('t-hz-seo-1', G_SEO, 'Fix 98 long title elements — HCM site audit', 0, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-04-28',
    linkUrl: 'https://www.semrush.com/siteaudit/campaign/28577731/review/issue/detail/102?sort=url_asc',
    linkLabel: 'Semrush HCM',
  }),
  makeTask('t-hz-seo-2', G_SEO, 'Fix 41 long title elements — MCM site audit', 1, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-04-28',
    linkUrl: 'https://www.semrush.com/siteaudit/campaign/28577729/review/issue/detail/102?sort=url_asc',
    linkLabel: 'Semrush MCM',
  }),
];

// Group 4: Runflat Content Writing
const runflatTasks = [
  makeTask('t-hz-rf-1', G_RUNFLAT, 'Write 5 blog articles for runflattiremachine.com (publish on WordPress)', 0, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-05-01',
    linkUrl: 'https://www.runflattiremachine.com',
    linkLabel: 'RFT Machine',
  }),
  makeTask('t-hz-rf-2', G_RUNFLAT, 'Write 5 blog articles for runflatmilitarytires.com (code-based — send docs to Ömer via Slack)', 1, {
    statusId: 'not-started',
    timelineStart: '2026-04-27',
    timelineEnd: '2026-05-01',
    linkUrl: 'https://www.runflatmilitarytires.com',
    linkLabel: 'RFT Military',
  }),
];

// ─── Seed Function ───────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding Hazel board: 27 April – 1 May …\n');

  // 1. Insert board
  const { error: boardErr } = await supabase.from('boards').insert({
    id: BOARD_ID,
    workspace_id: WS_ID,
    name: 'Hazel — 27 April – 1 May',
    description: "Hazel's weekly task board for April 27 – May 1, 2026",
    columns: COLUMNS,
    group_order: [G_ADS, G_CONTENT, G_SEO, G_RUNFLAT],
    created_at: now,
  });
  if (boardErr) {
    console.error('❌ Board insert failed:', boardErr.message);
    if (boardErr.code === '23505') {
      console.log('   Board already exists — skipping board insert.');
    } else {
      return;
    }
  } else {
    console.log('✅ Board created');
  }

  // 2. Update workspace board list — append new board
  const { data: ws } = await supabase.from('workspaces').select('*').eq('id', WS_ID).single();
  if (ws) {
    // We don't have a board_order column, boards are fetched by workspace_id FK
    console.log('✅ Board linked to workspace:', ws.name);
  }

  // 3. Insert groups
  const groups = [
    { id: G_ADS, board_id: BOARD_ID, name: 'Google Ads Campaign Fixes', color: '#e11d48', task_order: adsTasks.map(t => t.id), collapsed: false, position: 0 },
    { id: G_CONTENT, board_id: BOARD_ID, name: 'Content Publishing', color: '#059669', task_order: contentTasks.map(t => t.id), collapsed: false, position: 1 },
    { id: G_SEO, board_id: BOARD_ID, name: 'SEO Technical Fixes', color: '#6366f1', task_order: seoTasks.map(t => t.id), collapsed: false, position: 2 },
    { id: G_RUNFLAT, board_id: BOARD_ID, name: 'Runflat Content Writing', color: '#f59e0b', task_order: runflatTasks.map(t => t.id), collapsed: false, position: 3 },
  ];

  const { error: groupErr } = await supabase.from('groups').insert(groups);
  if (groupErr) {
    console.error('❌ Groups insert failed:', groupErr.message);
    if (groupErr.code !== '23505') return;
    console.log('   Groups may already exist — continuing.');
  } else {
    console.log('✅ 4 groups created');
  }

  // 4. Insert tasks
  const allTasks = [...adsTasks, ...contentTasks, ...seoTasks, ...runflatTasks];
  const { error: taskErr } = await supabase.from('tasks').insert(allTasks);
  if (taskErr) {
    console.error('❌ Tasks insert failed:', taskErr.message);
    if (taskErr.code !== '23505') return;
    console.log('   Tasks may already exist — continuing.');
  } else {
    console.log(`✅ ${allTasks.length} tasks created`);
  }

  console.log('\n🎉 Done! Board "Hazel — 27 April – 1 May" is ready.');
  console.log('   Open NXFlow → Work Management to see it.\n');

  // Summary table
  console.log('┌─────────────────────────────────────────┬──────────┬────────────────────────┐');
  console.log('│ Group                                   │ Tasks    │ Timeline               │');
  console.log('├─────────────────────────────────────────┼──────────┼────────────────────────┤');
  console.log('│ Google Ads Campaign Fixes                │ 6        │ Apr 27 – 28            │');
  console.log('│ Content Publishing (HCM/MCM/GM)          │ 3        │ Apr 27 – May 1         │');
  console.log('│ SEO Technical Fixes (Title Elements)     │ 2        │ Apr 27 – 28            │');
  console.log('│ Runflat Content Writing                  │ 2        │ Apr 27 – May 1         │');
  console.log('├─────────────────────────────────────────┼──────────┼────────────────────────┤');
  console.log('│ TOTAL                                   │ 13       │                        │');
  console.log('└─────────────────────────────────────────┴──────────┴────────────────────────┘');
}

seed().catch(console.error);
