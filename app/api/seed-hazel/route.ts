import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const BOARD_ID  = 'b-hazel-apr27';
  const HAZEL_ID  = 'u1';

  const G_ADS     = 'g-hz-ads';
  const G_CONTENT = 'g-hz-content';
  const G_SEO     = 'g-hz-seo';
  const G_RUNFLAT = 'g-hz-runflat';

  const COLUMNS = [
    { id: 'task-name', type: 'task-name', label: 'Task', width: 380, sortable: true, filterable: false },
    { id: 'assignee', type: 'assignee', label: 'People', width: 120, sortable: false, filterable: true },
    { id: 'status', type: 'status', label: 'Status', width: 150, sortable: true, filterable: true },
    { id: 'timeline', type: 'timeline', label: 'Timeline', width: 170, sortable: true, filterable: false },
    { id: 'link', type: 'link', label: 'Link', width: 120, sortable: false, filterable: false },
  ];

  const now = new Date().toISOString();

  function makeTask(
    id: string, groupId: string, name: string, order: number,
    opts: { timelineStart?: string; timelineEnd?: string; linkUrl?: string; linkLabel?: string } = {}
  ) {
    return {
      id, group_id: groupId, board_id: BOARD_ID, name, order,
      cells: {
        assignee: { type: 'assignee', userIds: [HAZEL_ID] },
        status: { type: 'status', statusId: 'not-started' },
        timeline: { type: 'timeline', start: opts.timelineStart || null, end: opts.timelineEnd || null },
        link: { type: 'link', url: opts.linkUrl || '', label: opts.linkLabel || '' },
      },
      created_at: now, updated_at: now,
    };
  }

  const adsTasks = [
    makeTask('t-hz-ads-1', G_ADS, 'Review Runflat Tire Machine campaign errors — apply pending changes', 0,
      { timelineStart: '2026-04-27', timelineEnd: '2026-04-27', linkUrl: 'https://ads.google.com', linkLabel: 'Google Ads' }),
    makeTask('t-hz-ads-2', G_ADS, 'Review Runflat Military Tires campaign errors — apply pending changes', 1,
      { timelineStart: '2026-04-27', timelineEnd: '2026-04-27', linkUrl: 'https://ads.google.com', linkLabel: 'Google Ads' }),
    makeTask('t-hz-ads-3', G_ADS, 'Fix missing sitelink extensions — Runflat Tire Machine campaign', 2,
      { timelineStart: '2026-04-27', timelineEnd: '2026-04-28', linkUrl: 'https://ads.google.com', linkLabel: 'Google Ads' }),
    makeTask('t-hz-ads-4', G_ADS, 'Fix missing sitelink extensions — Runflat Military Tires campaign', 3,
      { timelineStart: '2026-04-27', timelineEnd: '2026-04-28', linkUrl: 'https://ads.google.com', linkLabel: 'Google Ads' }),
    makeTask('t-hz-ads-5', G_ADS, 'Add missing image extensions — both Runflat campaigns', 4,
      { timelineStart: '2026-04-27', timelineEnd: '2026-04-28', linkUrl: 'https://ads.google.com', linkLabel: 'Google Ads' }),
    makeTask('t-hz-ads-6', G_ADS, 'Resolve conflicting negative keywords — both Runflat campaigns', 5,
      { timelineStart: '2026-04-27', timelineEnd: '2026-04-28', linkUrl: 'https://ads.google.com', linkLabel: 'Google Ads' }),
  ];

  const contentTasks = [
    makeTask('t-hz-cnt-1', G_CONTENT, 'Publish HCM blog content — 10 articles total for this week', 0,
      { timelineStart: '2026-04-30', timelineEnd: '2026-05-01', linkUrl: 'https://www.healthcaremassagechair.com/blogs', linkLabel: 'HCM Blog' }),
    makeTask('t-hz-cnt-2', G_CONTENT, 'Publish MCM blog content — 10 articles total for this week', 1,
      { timelineStart: '2026-04-30', timelineEnd: '2026-05-01', linkUrl: 'https://www.massagechairmarket.com/blogs', linkLabel: 'MCM Blog' }),
    makeTask('t-hz-cnt-3', G_CONTENT, 'Write GM Defensive content — 5 articles total for this week', 2,
      { timelineStart: '2026-04-27', timelineEnd: '2026-05-01', linkUrl: 'https://www.gmdefensive.com', linkLabel: 'GM Defensive' }),
  ];

  const seoTasks = [
    makeTask('t-hz-seo-1', G_SEO, 'Fix 98 long title elements — HCM site audit', 0,
      { timelineStart: '2026-04-27', timelineEnd: '2026-04-28',
        linkUrl: 'https://www.semrush.com/siteaudit/campaign/28577731/review/issue/detail/102?sort=url_asc', linkLabel: 'Semrush HCM' }),
    makeTask('t-hz-seo-2', G_SEO, 'Fix 41 long title elements — MCM site audit', 1,
      { timelineStart: '2026-04-27', timelineEnd: '2026-04-28',
        linkUrl: 'https://www.semrush.com/siteaudit/campaign/28577729/review/issue/detail/102?sort=url_asc', linkLabel: 'Semrush MCM' }),
  ];

  const runflatTasks = [
    makeTask('t-hz-rf-1', G_RUNFLAT, 'Write 5 blog articles for runflattiremachine.com (publish on WordPress)', 0,
      { timelineStart: '2026-04-27', timelineEnd: '2026-05-01', linkUrl: 'https://www.runflattiremachine.com', linkLabel: 'RFT Machine' }),
    makeTask('t-hz-rf-2', G_RUNFLAT, 'Write 5 blog articles for runflatmilitarytires.com (code-based — send docs to Ömer via Slack)', 1,
      { timelineStart: '2026-04-27', timelineEnd: '2026-05-01', linkUrl: 'https://www.runflatmilitarytires.com', linkLabel: 'RFT Military' }),
  ];

  const results: string[] = [];

  // 1. Board — upsert
  const { error: boardErr } = await supabase.from('boards').upsert({
    id: BOARD_ID, workspace_id: 'ws1',
    name: 'Hazel — 27 April – 1 May',
    description: "Hazel's weekly task board for April 27 – May 1, 2026",
    columns: COLUMNS,
    group_order: [G_ADS, G_CONTENT, G_SEO, G_RUNFLAT],
    created_at: now,
  }, { onConflict: 'id' });
  results.push(boardErr ? `Board: ${boardErr.message}` : '✅ Board upserted');

  // 2. Groups — upsert
  const groups = [
    { id: G_ADS, board_id: BOARD_ID, name: 'Google Ads Campaign Fixes', color: '#e11d48', task_order: adsTasks.map(t => t.id), collapsed: false, position: 0 },
    { id: G_CONTENT, board_id: BOARD_ID, name: 'Content Publishing', color: '#059669', task_order: contentTasks.map(t => t.id), collapsed: false, position: 1 },
    { id: G_SEO, board_id: BOARD_ID, name: 'SEO Technical Fixes', color: '#6366f1', task_order: seoTasks.map(t => t.id), collapsed: false, position: 2 },
    { id: G_RUNFLAT, board_id: BOARD_ID, name: 'Runflat Content Writing', color: '#f59e0b', task_order: runflatTasks.map(t => t.id), collapsed: false, position: 3 },
  ];
  const { error: groupErr } = await supabase.from('groups').upsert(groups, { onConflict: 'id' });
  results.push(groupErr ? `Groups: ${groupErr.message}` : '✅ 4 groups upserted');

  // 3. Tasks — upsert
  const allTasks = [...adsTasks, ...contentTasks, ...seoTasks, ...runflatTasks];
  const { error: taskErr } = await supabase.from('tasks').upsert(allTasks, { onConflict: 'id' });
  results.push(taskErr ? `Tasks: ${taskErr.message}` : `✅ ${allTasks.length} tasks upserted`);

  return NextResponse.json({ success: !boardErr && !groupErr && !taskErr, results });
}
