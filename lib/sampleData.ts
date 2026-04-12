import { AppState } from './types';
import { DEFAULT_COLUMNS, STATUS_OPTIONS } from './columns';

const USERS = {
  'u1': { id: 'u1', name: 'Hazel', initials: 'HZ', avatarColor: '#7c3aed', email: 'hazel@alba.com' },
  'u2': { id: 'u2', name: 'Batuhan', initials: 'BT', avatarColor: '#0891b2', email: 'batuhan@alba.com' },
  'u3': { id: 'u3', name: 'Omer', initials: 'OM', avatarColor: '#059669', email: 'omer@alba.com' },
  'u4': { id: 'u4', name: 'Sera', initials: 'SR', avatarColor: '#e11d48', email: 'sera@alba.com' },
  'u5': { id: 'u5', name: 'Berat', initials: 'BR', avatarColor: '#d97706', email: 'berat@alba.com' },
  'u6': { id: 'u6', name: 'Tulu', initials: 'TL', avatarColor: '#6366f1', email: 'tulu@alba.com' },
};

export const SAMPLE_DATA: AppState = {
  users: USERS,
  statusOptions: STATUS_OPTIONS,
  activeWorkspaceId: 'ws1',
  activeBoardId: 'b1',

  workspaces: {
    'ws1': {
      id: 'ws1',
      name: 'Alba',
      icon: 'A',
      boardIds: ['b1', 'b2', 'b3'],
    },
  },

  boards: {
    'b1': {
      id: 'b1',
      workspaceId: 'ws1',
      name: 'Q2 Roadmap',
      description: 'Tracking all Q2 initiatives',
      groupIds: ['g1', 'g2', 'g3'],
      columns: DEFAULT_COLUMNS,
      createdAt: '2024-03-01T00:00:00Z',
    },
    'b2': {
      id: 'b2',
      workspaceId: 'ws1',
      name: 'Marketing Campaigns',
      description: 'Campaign planning and execution',
      groupIds: [],
      columns: DEFAULT_COLUMNS,
      createdAt: '2024-03-05T00:00:00Z',
    },
    'b3': {
      id: 'b3',
      workspaceId: 'ws1',
      name: 'Infrastructure',
      description: 'DevOps and platform work',
      groupIds: [],
      columns: DEFAULT_COLUMNS,
      createdAt: '2024-03-10T00:00:00Z',
    },
  },

  groups: {
    'g1': {
      id: 'g1',
      boardId: 'b1',
      name: 'Product Launch',
      color: '#6366f1',
      taskIds: ['t1', 't2', 't3', 't4', 't5'],
      collapsed: false,
    },
    'g2': {
      id: 'g2',
      boardId: 'b1',
      name: 'Engineering & Infrastructure',
      color: '#10b981',
      taskIds: ['t6', 't7', 't8', 't9'],
      collapsed: false,
    },
    'g3': {
      id: 'g3',
      boardId: 'b1',
      name: 'Marketing & Growth',
      color: '#f59e0b',
      taskIds: ['t10', 't11', 't12', 't13', 't14'],
      collapsed: false,
    },
  },

  tasks: {
    't1': {
      id: 't1', groupId: 'g1', boardId: 'b1', name: 'Define product requirements and PRD', order: 0,
      createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-10T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u1', 'u2', 'u6'] },
        status: { type: 'status', statusId: 'done' },
        timeline: { type: 'timeline', start: '2024-03-01', end: '2024-03-08' },
        link: { type: 'link', url: 'https://notion.so/prd', label: 'PRD Doc' },
      },
    },
    't2': {
      id: 't2', groupId: 'g1', boardId: 'b1', name: 'Design system — components v2', order: 1,
      createdAt: '2024-03-05T00:00:00Z', updatedAt: '2024-03-12T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u3'] },
        status: { type: 'status', statusId: 'done' },
        timeline: { type: 'timeline', start: '2024-03-05', end: '2024-03-18' },
        link: { type: 'link', url: 'https://figma.com/design', label: 'Figma' },
      },
    },
    't3': {
      id: 't3', groupId: 'g1', boardId: 'b1', name: 'Frontend implementation — dashboard', order: 2,
      createdAt: '2024-03-10T00:00:00Z', updatedAt: '2024-03-20T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u2', 'u5'] },
        status: { type: 'status', statusId: 'working' },
        timeline: { type: 'timeline', start: '2024-03-15', end: '2024-04-05' },
        link: { type: 'link', url: '', label: '' },
      },
    },
    't4': {
      id: 't4', groupId: 'g1', boardId: 'b1', name: 'QA and regression testing', order: 3,
      createdAt: '2024-03-20T00:00:00Z', updatedAt: '2024-03-20T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u4'] },
        status: { type: 'status', statusId: 'not-started' },
        timeline: { type: 'timeline', start: '2024-04-06', end: '2024-04-12' },
        link: { type: 'link', url: '', label: '' },
      },
    },
    't5': {
      id: 't5', groupId: 'g1', boardId: 'b1', name: 'Stakeholder review + sign-off', order: 4,
      createdAt: '2024-03-20T00:00:00Z', updatedAt: '2024-03-20T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u1', 'u3', 'u4'] },
        status: { type: 'status', statusId: 'in-review' },
        timeline: { type: 'timeline', start: '2024-04-10', end: '2024-04-15' },
        link: { type: 'link', url: 'https://docs.google.com/review', label: 'Slides' },
      },
    },

    't6': {
      id: 't6', groupId: 'g2', boardId: 'b1', name: 'Set up CI/CD pipeline (GitHub Actions)', order: 0,
      createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-15T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u2'] },
        status: { type: 'status', statusId: 'done' },
        timeline: { type: 'timeline', start: '2024-03-01', end: '2024-03-10' },
        link: { type: 'link', url: 'https://github.com/alba/ci', label: 'GitHub' },
      },
    },
    't7': {
      id: 't7', groupId: 'g2', boardId: 'b1', name: 'Migrate to Kubernetes — staging env', order: 1,
      createdAt: '2024-03-10T00:00:00Z', updatedAt: '2024-03-22T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u2', 'u5'] },
        status: { type: 'status', statusId: 'working' },
        timeline: { type: 'timeline', start: '2024-03-12', end: '2024-03-28' },
        link: { type: 'link', url: '', label: '' },
      },
    },
    't8': {
      id: 't8', groupId: 'g2', boardId: 'b1', name: 'Set up Datadog monitoring + alerting', order: 2,
      createdAt: '2024-03-15T00:00:00Z', updatedAt: '2024-03-15T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u5'] },
        status: { type: 'status', statusId: 'stuck' },
        timeline: { type: 'timeline', start: '2024-03-20', end: '2024-04-02' },
        link: { type: 'link', url: 'https://datadoghq.com', label: 'Datadog' },
      },
    },
    't9': {
      id: 't9', groupId: 'g2', boardId: 'b1', name: 'Load testing — 10k concurrent users', order: 3,
      createdAt: '2024-03-20T00:00:00Z', updatedAt: '2024-03-20T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u2', 'u6'] },
        status: { type: 'status', statusId: 'not-started' },
        timeline: { type: 'timeline', start: '2024-04-05', end: '2024-04-10' },
        link: { type: 'link', url: '', label: '' },
      },
    },

    't10': {
      id: 't10', groupId: 'g3', boardId: 'b1', name: 'Launch blog content series — 8 articles', order: 0,
      createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-18T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u1', 'u4'] },
        status: { type: 'status', statusId: 'working' },
        timeline: { type: 'timeline', start: '2024-03-05', end: '2024-04-15' },
        link: { type: 'link', url: 'https://notion.so/content', label: 'Content plan' },
      },
    },
    't11': {
      id: 't11', groupId: 'g3', boardId: 'b1', name: 'Google Ads setup + SEM campaign', order: 1,
      createdAt: '2024-03-08T00:00:00Z', updatedAt: '2024-03-22T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u4'] },
        status: { type: 'status', statusId: 'done' },
        timeline: { type: 'timeline', start: '2024-03-08', end: '2024-03-20' },
        link: { type: 'link', url: 'https://ads.google.com', label: 'Google Ads' },
      },
    },
    't12': {
      id: 't12', groupId: 'g3', boardId: 'b1', name: 'Partnership outreach — 5 SaaS companies', order: 2,
      createdAt: '2024-03-12T00:00:00Z', updatedAt: '2024-03-12T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u1'] },
        status: { type: 'status', statusId: 'in-review' },
        timeline: { type: 'timeline', start: '2024-03-18', end: '2024-04-10' },
        link: { type: 'link', url: '', label: '' },
      },
    },
    't13': {
      id: 't13', groupId: 'g3', boardId: 'b1', name: 'Product Hunt launch preparation', order: 3,
      createdAt: '2024-03-15T00:00:00Z', updatedAt: '2024-03-15T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u1', 'u3', 'u4'] },
        status: { type: 'status', statusId: 'not-started' },
        timeline: { type: 'timeline', start: '2024-04-08', end: '2024-04-20' },
        link: { type: 'link', url: 'https://producthunt.com', label: 'PH Page' },
      },
    },
    't14': {
      id: 't14', groupId: 'g3', boardId: 'b1', name: 'Email nurture sequence — onboarding', order: 4,
      createdAt: '2024-03-18T00:00:00Z', updatedAt: '2024-03-18T00:00:00Z',
      cells: {
        assignee: { type: 'assignee', userIds: ['u4', 'u5'] },
        status: { type: 'status', statusId: 'stuck' },
        timeline: { type: 'timeline', start: '2024-03-25', end: '2024-04-05' },
        link: { type: 'link', url: '', label: '' },
      },
    },
  },
};
