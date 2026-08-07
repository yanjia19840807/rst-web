import { delay, http, HttpResponse } from 'msw'

import type { PageResult, StartSessionInput, TmsSession } from '@/features/tms-management/types'

import { getAgentToolkits, readSessions, writeSessions } from '../data/tms'

let sessions = readSessions()

function save(next: TmsSession[]) {
  sessions = next
  writeSessions(sessions)
}

function problem(status: number, detail: string) {
  return HttpResponse.json(
    {
      type: 'tms-session-error',
      title: 'TMS session request failed',
      status,
      detail,
    },
    { status },
  )
}

function pageOf(items: TmsSession[], page: number, pageSize: number): PageResult<TmsSession> {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  }
}

export const tmsHandlers = [
  http.get('*/api/v1/toolkits', async () => {
    await delay(120)
    return HttpResponse.json(getAgentToolkits())
  }),

  http.get('*/api/v1/tms/summary', async () => {
    await delay(100)
    return HttpResponse.json({
      sessionsToday: 4,
      totalVolume: 89,
      pausedSessions: sessions.filter((session) => session.status === 'paused').length,
    })
  }),

  http.get('*/api/v1/tms/sessions/current', async () => {
    await delay(80)
    return HttpResponse.json(
      sessions.find((session) => session.status === 'running' || session.status === 'paused') ?? null,
    )
  }),

  http.get('*/api/v1/tms/sessions', async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const query = url.searchParams.get('query')?.trim().toLowerCase() ?? ''
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const page = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10)

    const filtered = sessions
      .filter((session) => !status || session.status === status)
      .filter(
        (session) =>
          !query ||
          session.id.toLowerCase().includes(query) ||
          session.reference.toLowerCase().includes(query),
      )
      .filter((session) => !dateFrom || session.startedAt.slice(0, 10) >= dateFrom)
      .filter((session) => !dateTo || session.startedAt.slice(0, 10) <= dateTo)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

    return HttpResponse.json(pageOf(filtered, page, pageSize))
  }),

  http.post('*/api/v1/tms/sessions', async ({ request }) => {
    await delay(180)
    if (sessions.some((session) => session.status === 'running' || session.status === 'paused')) {
      return problem(409, 'Resume/end or discard the active session before starting another.')
    }

    const input = (await request.json()) as StartSessionInput
    const toolkit = getAgentToolkits().find((item) => item.id === input.toolkitId)
    const subtask = toolkit?.subtasks.find((item) => item.id === input.subtaskId)
    if (!toolkit || !subtask || input.processedVolume <= 0) {
      return problem(422, 'The session details are invalid.')
    }

    const now = new Date()
    const session: TmsSession = {
      id: `TMS-${now.getTime()}`,
      toolkitId: toolkit.id,
      toolkitName: toolkit.name,
      subtaskId: subtask.id,
      subtaskName: subtask.name,
      processedVolume: input.processedVolume,
      reference: input.reference,
      remarks: input.remarks,
      status: 'running',
      startedAt: now.toISOString(),
      pausedAt: null,
      endedAt: null,
      netDurationSeconds: 0,
    }
    save([session, ...sessions])
    return HttpResponse.json(session, { status: 201 })
  }),

  http.post('*/api/v1/tms/sessions/:id/pause', async ({ params }) => {
    await delay(140)
    const session = sessions.find((item) => item.id === params.id)
    if (!session || session.status !== 'running') {
      return problem(409, 'Only a running session can be paused.')
    }

    const now = new Date()
    const updated: TmsSession = {
      ...session,
      status: 'paused',
      pausedAt: now.toISOString(),
      netDurationSeconds:
        session.netDurationSeconds +
        Math.max(0, Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000)),
    }
    save(sessions.map((item) => (item.id === updated.id ? updated : item)))
    return HttpResponse.json(updated)
  }),

  http.post('*/api/v1/tms/sessions/:id/resume', async ({ params }) => {
    await delay(140)
    if (
      sessions.some(
        (candidate) =>
          candidate.id !== params.id &&
          (candidate.status === 'running' || candidate.status === 'paused'),
      )
    ) {
      return problem(409, 'Resolve the active session before resuming another.')
    }
    const session = sessions.find((item) => item.id === params.id)
    if (!session || session.status !== 'paused') {
      return problem(409, 'Only a paused session can be resumed.')
    }

    const updated: TmsSession = {
      ...session,
      status: 'running',
      startedAt: new Date().toISOString(),
      pausedAt: null,
    }
    save(sessions.map((item) => (item.id === updated.id ? updated : item)))
    return HttpResponse.json(updated)
  }),

  http.post('*/api/v1/tms/sessions/:id/end', async ({ params }) => {
    await delay(140)
    const session = sessions.find((item) => item.id === params.id)
    if (!session || session.status !== 'running') {
      return problem(409, 'Only a running session can be ended.')
    }

    const now = new Date()
    const updated: TmsSession = {
      ...session,
      status: 'completed',
      endedAt: now.toISOString(),
      netDurationSeconds:
        session.netDurationSeconds +
        Math.max(0, Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000)),
    }
    save(sessions.map((item) => (item.id === updated.id ? updated : item)))
    return HttpResponse.json(updated)
  }),

  http.post('*/api/v1/tms/sessions/:id/discard', async ({ params, request }) => {
    await delay(100)
    const session = sessions.find((candidate) => candidate.id === params.id)
    const body = (await request.json()) as { reason?: string }
    if (!session) {
      return problem(404, 'The session no longer exists.')
    }
    if (!body.reason?.trim()) return problem(422, 'A discard reason is required.')
    const discarded = { ...session, status: 'discarded' as const, discardReason: body.reason }
    // Discard is a state transition; TMS history must remain queryable.
    save(sessions.map((item) => (item.id === discarded.id ? discarded : item)))
    return HttpResponse.json(discarded)
  }),
]
