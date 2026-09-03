import { delay, http, HttpResponse } from 'msw'

import type {
  PageResult,
  SessionDetailsInput,
  StartSessionInput,
  TmsSession,
} from '@/features/tms-management/types'

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

async function readSessionDetails(request: Request): Promise<SessionDetailsInput | null> {
  const text = await request.text()
  if (!text.trim()) return null
  return JSON.parse(text) as SessionDetailsInput
}

function applySessionDetails(
  session: TmsSession,
  details: SessionDetailsInput | null,
): Pick<TmsSession, 'subtaskId' | 'subtaskName' | 'processedVolume' | 'reference' | 'remarks'> {
  if (!details) {
    return {
      subtaskId: session.subtaskId,
      subtaskName: session.subtaskName,
      processedVolume: session.processedVolume ?? 1,
      reference: session.reference,
      remarks: session.remarks,
    }
  }
  const toolkit = getAgentToolkits().find((item) => item.id === session.toolkitId)
  const subtask = details.subtaskId
    ? toolkit?.subtasks.find((item) => item.id === details.subtaskId)
    : undefined
  return {
    subtaskId: details.subtaskId ?? null,
    subtaskName: subtask?.name ?? (details.subtaskId ? session.subtaskName : '—'),
    processedVolume: details.processedVolume ?? 1,
    reference: details.reference ?? '',
    remarks: details.remarks ?? '',
  }
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
    return HttpResponse.json(sessions.find((session) => session.status === 'running') ?? null)
  }),

  http.get('*/api/v1/tms/sessions', async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const sessionNo = url.searchParams.get('sessionNo')?.trim().toLowerCase() ?? ''
    const reference = url.searchParams.get('reference')?.trim().toLowerCase() ?? ''
    const query = url.searchParams.get('query')?.trim().toLowerCase() ?? ''
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const page = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10)

    const filtered = sessions
      .filter((session) => !status || session.status === status)
      .filter((session) => !sessionNo || session.id.toLowerCase().includes(sessionNo))
      .filter((session) => !reference || session.reference.toLowerCase().includes(reference))
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
    if (sessions.some((session) => session.status === 'running')) {
      return problem(409, 'Pause or end the running session before starting another.')
    }

    const input = (await request.json()) as StartSessionInput
    const toolkit = getAgentToolkits().find((item) => item.id === input.toolkitId)
    const subtask = input.subtaskId
      ? toolkit?.subtasks.find((item) => item.id === input.subtaskId)
      : undefined
    if (
      !toolkit ||
      (input.subtaskId && !subtask) ||
      (input.processedVolume != null && input.processedVolume <= 0)
    ) {
      return problem(422, 'The session details are invalid.')
    }

    const now = new Date()
    const session: TmsSession = {
      id: `TMS-${now.getTime()}`,
      toolkitId: toolkit.id,
      toolkitName: toolkit.name,
      subtaskId: subtask?.id ?? null,
      subtaskName: subtask?.name ?? '—',
      processedVolume: input.processedVolume ?? 1,
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

  http.post('*/api/v1/tms/sessions/:id/pause', async ({ params, request }) => {
    await delay(140)
    const session = sessions.find((item) => item.id === params.id)
    if (!session || session.status !== 'running') {
      return problem(409, 'Only a running session can be paused.')
    }

    const now = new Date()
    const updated: TmsSession = {
      ...session,
      ...applySessionDetails(session, await readSessionDetails(request)),
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
    if (sessions.some((candidate) => candidate.id !== params.id && candidate.status === 'running')) {
      return problem(409, 'Pause or end the running session before resuming another.')
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

  http.post('*/api/v1/tms/sessions/:id/end', async ({ params, request }) => {
    await delay(140)
    const session = sessions.find((item) => item.id === params.id)
    if (!session || session.status !== 'running') {
      return problem(409, 'Only a running session can be ended.')
    }

    const now = new Date()
    const updated: TmsSession = {
      ...session,
      ...applySessionDetails(session, await readSessionDetails(request)),
      status: 'completed',
      endedAt: now.toISOString(),
      netDurationSeconds:
        session.netDurationSeconds +
        Math.max(0, Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000)),
    }
    save(sessions.map((item) => (item.id === updated.id ? updated : item)))
    return HttpResponse.json(updated)
  }),

  http.get('*/api/v1/tms/sessions/:id', async ({ params }) => {
    await delay(80)
    const session = sessions.find((candidate) => candidate.id === params.id)
    if (!session) return problem(404, 'The TMS session was not found.')
    return HttpResponse.json(session)
  }),

  http.get('*/api/v1/tms/team/agents', async () => {
    await delay(80)
    return HttpResponse.json([
      { ccgid: 'AGENT010', name: 'Test Agent AGENT010', email: 'agent010@cma-cgm.com' },
      { ccgid: 'AGENT011', name: 'Test Agent AGENT011', email: 'agent011@cma-cgm.com' },
    ])
  }),

  http.get('*/api/v1/tms/team/sessions', async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const sessionNo = url.searchParams.get('sessionNo')?.trim().toLowerCase() ?? ''
    const reference = url.searchParams.get('reference')?.trim().toLowerCase() ?? ''
    const query = url.searchParams.get('query')?.trim().toLowerCase() ?? ''
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const agentCcgid = url.searchParams.get('agentCcgid')
    const toolkitId = url.searchParams.get('toolkitId')
    const pl3Code = url.searchParams.get('pl3Code')
    const page = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10)

    const filtered = sessions
      .filter((session) => !status || session.status === status)
      .filter((session) => !sessionNo || session.id.toLowerCase().includes(sessionNo))
      .filter((session) => !reference || session.reference.toLowerCase().includes(reference))
      .filter(
        (session) =>
          !query ||
          session.id.toLowerCase().includes(query) ||
          session.reference.toLowerCase().includes(query),
      )
      .filter((session) => !agentCcgid || session.agentCcgid === agentCcgid)
      .filter((session) => !toolkitId || session.toolkitId === toolkitId)
      .filter((session) => !pl3Code || session.toolkitName.includes(pl3Code))
      .filter((session) => !dateFrom || session.startedAt.slice(0, 10) >= dateFrom)
      .filter((session) => !dateTo || session.startedAt.slice(0, 10) <= dateTo)
    return HttpResponse.json(pageOf(filtered, page, pageSize))
  }),

  http.get('*/api/v1/tms/team/sessions/:id', async ({ params }) => {
    await delay(80)
    const session = sessions.find((candidate) => candidate.id === params.id)
    if (!session) return problem(404, 'The TMS session was not found.')
    return HttpResponse.json(session)
  }),

  http.post('*/api/v1/tms/sessions/:id/discard', async ({ params }) => {
    await delay(100)
    const session = sessions.find((candidate) => candidate.id === params.id)
    if (!session) {
      return problem(404, 'The session no longer exists.')
    }
    const discarded = { ...session, status: 'discarded' as const }
    // Discard is a state transition; TMS history must remain queryable.
    save(sessions.map((item) => (item.id === discarded.id ? discarded : item)))
    return HttpResponse.json(discarded)
  }),
]
