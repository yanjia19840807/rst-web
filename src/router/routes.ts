import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'agent-session' },
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
    path: '/supervisor',
    redirect: { name: 'supervisor-toolkits' },
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
      subtitle: 'In Progress, review and archived sizing exercises',
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
    path: '/supervisor/exercises/:id/submission',
    name: 'supervisor-submission',
    component: () => import('@/pages/supervisor/SubmittedDetailsPage.vue'),
    meta: {
      title: 'Submitted Exercise Details',
      subtitle: 'Read-only official package and approval history',
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
      subtitle: 'Awaiting Review and archived submissions',
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
    path: '/:pathMatch(.*)*',
    redirect: { name: 'agent-session' },
  },
]
