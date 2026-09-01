import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: { render: () => null },
  },
  {
    path: '/agent',
    redirect: { name: 'agent-session' },
  },
  {
    path: '/agent/session',
    name: 'agent-session',
    component: () => import('@/pages/agent/TmsSessionPage.vue'),
    meta: {
      title: 'TMS Session',
      subtitle: 'My Assigned Campaign',
      roles: ['agent'],
    },
  },
  {
    path: '/agent/sessions',
    name: 'agent-sessions',
    component: () => import('@/pages/agent/TmsListPage.vue'),
    meta: {
      title: 'TMS List',
      subtitle: 'My recent timing sessions',
      roles: ['agent'],
    },
  },
  {
    path: '/agent/sessions/:id',
    name: 'agent-session-detail',
    component: () => import('@/pages/agent/TmsSessionDetailPage.vue'),
    meta: {
      title: 'TMS Session Detail',
      subtitle: 'Read-only timing session',
      roles: ['agent'],
    },
  },
  {
    path: '/supervisor',
    redirect: { name: 'supervisor-toolkits' },
  },
  {
    path: '/supervisor/sessions',
    name: 'supervisor-sessions',
    component: () => import('@/pages/supervisor/TmsListPage.vue'),
    meta: {
      title: 'TMS List',
      subtitle: 'Team timing sessions across your agents and toolkits',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/sessions/:id',
    name: 'supervisor-session-detail',
    component: () => import('@/pages/supervisor/TmsSessionDetailPage.vue'),
    meta: {
      title: 'TMS Session Detail',
      subtitle: 'Read-only team timing session',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/toolkits',
    name: 'supervisor-toolkits',
    component: () => import('@/pages/supervisor/ToolkitManagementPage.vue'),
    meta: {
      title: 'Toolkits',
      subtitle: 'Manage All Toolkits — PL3, subtasks, and Shared KPI.',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/toolkits/new',
    name: 'supervisor-toolkit-new',
    component: () => import('@/pages/supervisor/ToolkitFormPage.vue'),
    meta: {
      title: 'Add Toolkit',
      subtitle: 'Process mapping, Subtasks, and Shared KPI Scope Split',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/toolkits/:id/edit',
    name: 'supervisor-toolkit-edit',
    component: () => import('@/pages/supervisor/ToolkitFormPage.vue'),
    meta: {
      title: 'Edit Toolkit',
      subtitle: 'Process mapping, Subtasks, and Shared KPI Scope Split',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/exercises',
    name: 'supervisor-exercises',
    component: () => import('@/pages/supervisor/ExerciseManagementPage.vue'),
    meta: {
      title: 'Exercises',
      subtitle: 'In Progress and archived sizing exercises',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/exercises/:id',
    name: 'supervisor-exercise-detail',
    component: () => import('@/pages/supervisor/ExerciseDetailPage.vue'),
    meta: {
      title: 'Exercise Detail',
      subtitle: 'Associated Data, Scenario Matrix, and Submit',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/exercises/:id/snapshot',
    name: 'supervisor-exercise-snapshot',
    component: () => import('@/pages/supervisor/ExerciseDetailPage.vue'),
    meta: {
      title: 'Exercise Snapshot',
      subtitle: 'Submission snapshot · read-only',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/exercises/:id/scenarios/:scenarioId',
    name: 'supervisor-scenario-form',
    component: () => import('@/pages/supervisor/ScenarioFormPage.vue'),
    meta: {
      title: 'Scenario Form',
      subtitle: 'Assumptions, forecast and simulation stubs',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/exercises/:id/snapshot/scenarios/:scenarioId',
    name: 'supervisor-scenario-snapshot',
    component: () => import('@/pages/supervisor/ScenarioFormPage.vue'),
    meta: {
      title: 'Scenario Snapshot',
      subtitle: 'Read-only scenario and simulation',
      roles: ['supervisor'],
    },
  },
  {
    path: '/supervisor/exercises/:id/submission',
    name: 'supervisor-submission',
    component: () => import('@/pages/supervisor/SubmittedDetailsPage.vue'),
    meta: {
      title: 'Submitted Exercise Details',
      subtitle: 'Read-only official scenario and approval history',
      roles: ['supervisor'],
    },
  },
  {
    path: '/approver',
    redirect: { name: 'approver-queue' },
  },
  {
    path: '/approver/queue',
    name: 'approver-queue',
    component: () => import('@/pages/approver/ApprovalQueuePage.vue'),
    meta: {
      title: 'Approval Queue',
      subtitle: 'Awaiting Review and completed tasks',
      roles: ['approver'],
    },
  },
  {
    path: '/approver/domain-heads',
    redirect: '/approver/timesheet-sync',
  },
  {
    path: '/approver/timesheet-sync',
    name: 'approver-timesheet-sync',
    component: () => import('@/pages/approver/TimesheetSyncPage.vue'),
    meta: {
      title: 'Timesheet Sync',
      subtitle: 'Monitor Daily and Monthly snapshots and upload a report.',
      roles: ['approver'],
    },
  },
  {
    path: '/approver/submissions/:submissionId',
    name: 'approver-review',
    component: () => import('@/pages/approver/ApprovalReviewPage.vue'),
    meta: {
      title: 'Submission Review',
      subtitle: 'Approve or return the official scenario package',
      roles: ['approver'],
    },
  },
  {
    path: '/approver/repository',
    name: 'approver-repository',
    component: () => import('@/pages/approver/RstRepositoryPage.vue'),
    meta: {
      title: 'RST Repository',
      subtitle: 'All submitted RST records by Shared KPI line.',
      roles: ['approver', 'ho'],
    },
  },
  {
    path: '/approver/support-repository',
    name: 'approver-support-repository',
    component: () => import('@/pages/approver/SupportRepositoryPage.vue'),
    meta: {
      title: 'Support Repository',
      subtitle: 'Production Support FTE across validated submissions.',
      roles: ['approver', 'ho'],
    },
  },
  {
    path: '/approver/validation-workflow',
    name: 'approver-validation-workflow',
    component: () => import('@/pages/approver/ValidationWorkflowPage.vue'),
    meta: {
      title: 'Validation Workflow',
      subtitle: 'RST stuck in validation — aging and capacity impact.',
      roles: ['approver'],
    },
  },
  {
    path: '/approver/dashboard',
    name: 'approver-dashboard',
    component: () => import('@/pages/approver/GlobalDashboardPage.vue'),
    meta: {
      title: 'Global Dashboard',
      subtitle: 'Completion, aging, and capacity creation overview.',
      roles: ['approver', 'ho'],
    },
  },
  {
    path: '/approver/benchmarking',
    name: 'approver-benchmarking',
    component: () => import('@/pages/approver/BenchmarkingPage.vue'),
    meta: {
      title: 'Benchmarking',
      subtitle: 'Same-PL3 cycle time and capacity benchmarks.',
      roles: ['approver', 'ho'],
    },
  },
  // Legacy HO paths — same screens as Approver governance (permission-gated in the menu).
  {
    path: '/ho',
    redirect: { name: 'approver-dashboard' },
  },
  {
    path: '/ho/dashboard',
    redirect: { name: 'approver-dashboard' },
  },
  {
    path: '/ho/repository',
    redirect: { name: 'approver-repository' },
  },
  {
    path: '/ho/support-repository',
    redirect: { name: 'approver-support-repository' },
  },
  {
    path: '/ho/benchmarking',
    redirect: { name: 'approver-benchmarking' },
  },
  {
    path: '/admin/support-categories',
    name: 'admin-support-categories',
    component: () => import('@/pages/admin/SupportCategoriesPage.vue'),
    meta: {
      title: 'Support Categories',
      subtitle: 'Maintain Standard Production Support categories.',
      roles: ['admin'],
    },
  },
  {
    path: '/settings/delegation',
    name: 'settings-delegation',
    component: () => import('@/pages/settings/DelegationPage.vue'),
    meta: {
      title: 'Delegation',
      subtitle: 'Let a colleague act as you, or act on someone else’s behalf.',
    },
  },
  {
    path: '/settings/mail',
    name: 'settings-mail',
    component: () => import('@/pages/settings/MailPreferencesPage.vue'),
    meta: {
      title: 'Email notifications',
      subtitle: 'Choose which RST mail this role should receive.',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: { render: () => null },
  },
]
