import type { Toolkit, TmsSession } from '@/features/tms-management/types'

import { supervisorToolkits } from './supervisor'

// Bump when the active-session invariant or session shape changes so stale browser
// mock storage cannot resurrect multiple paused sessions.
const storageKey = 'rst-web:tms-sessions:v2'

export function getAgentToolkits(): Toolkit[] {
  // Mock ACTIVE Timesheet says the current Agent belongs to POS-SUP-001 + PL3-BANK-REC.
  return supervisorToolkits
    .filter(
      (item) =>
        !item.deletedAt &&
        item.supervisorPositionId === 'POS-SUP-001' &&
        item.pl3Code === 'PL3-BANK-REC',
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      center: item.center,
      domain: item.domain,
      pl1: item.pl1,
      pl2: item.pl2,
      pl3Name: item.pl3Name,
      combineSubtasksTime: item.combineSubtasksTime,
      subtasks: item.subtasks
        .filter((subtask) => !subtask.deletedAt)
        .map((subtask) => ({ id: subtask.id, name: subtask.name, deletedAt: null })),
    }))
}

const completedSeed: TmsSession[] = [
  [
    'TMS-1042-20250723-001',
    'Manual match',
    '2025-07-23T09:10:00Z',
    '2025-07-23T10:08:00Z',
    25,
    'INV-8841',
    '',
  ],
  [
    'TMS-1038-20250722-001',
    'RFI follow-up',
    '2025-07-22T14:05:00Z',
    '2025-07-22T14:49:00Z',
    19,
    'INV-8836',
    '2 cases pending RFI',
  ],
  [
    'TMS-1029-20250721-001',
    'Posting check',
    '2025-07-21T11:30:00Z',
    '2025-07-21T12:52:00Z',
    18,
    'INV-8818',
    'System slow in afternoon',
  ],
  [
    'TMS-1025-20250718-001',
    'Manual match',
    '2025-07-18T10:42:00Z',
    '2025-07-18T11:13:00Z',
    27,
    'INV-8792',
    '',
  ],
  [
    'TMS-1020-20250717-001',
    'Manual match',
    '2025-07-17T08:55:00Z',
    '2025-07-17T09:46:00Z',
    22,
    'INV-8779',
    '',
  ],
  [
    'TMS-1015-20250716-001',
    'RFI follow-up',
    '2025-07-16T13:20:00Z',
    '2025-07-16T13:57:00Z',
    15,
    'INV-8710',
    'INV-8710 escalated',
  ],
  [
    'TMS-1010-20250715-001',
    'Posting check',
    '2025-07-15T10:00:00Z',
    '2025-07-15T11:05:00Z',
    20,
    'INV-8698',
    '',
  ],
].map(([id, subtask, startedAt, endedAt, processedVolume, reference, remarks]) => ({
  id: String(id),
  toolkitId: 'ca651a20-909f-4aef-a545-269cb1f0b414',
  toolkitName: 'Bank Reconciliation',
  subtaskId:
    String(subtask) === 'Posting check'
      ? '774470ed-41fb-48f4-97ed-665cdf325c9e'
      : String(subtask) === 'RFI follow-up'
        ? 'f1b3a57a-5ace-465f-b236-2707f5cf270c'
        : '221fd99d-d164-4224-a42e-b5f78ed29d46',
  subtaskName: String(subtask),
  processedVolume: Number(processedVolume),
  reference: String(reference),
  remarks: String(remarks),
  status: 'completed',
  startedAt: String(startedAt),
  pausedAt: null,
  endedAt: String(endedAt),
  netDurationSeconds:
    (new Date(String(endedAt)).getTime() - new Date(String(startedAt)).getTime()) / 1000,
}))

const pausedRows: Array<[string, string, string]> = [
  ['TMS-1041-20250723-001', '2025-07-23T09:14:00Z', 'INV-8841'],
]

const pausedSeed: TmsSession[] = pausedRows.map(([id, pausedAt, reference], index) => ({
  id,
  toolkitId: 'ca651a20-909f-4aef-a545-269cb1f0b414',
  toolkitName: 'Bank Reconciliation',
  subtaskId:
    [
      '221fd99d-d164-4224-a42e-b5f78ed29d46',
      'f1b3a57a-5ace-465f-b236-2707f5cf270c',
      '774470ed-41fb-48f4-97ed-665cdf325c9e',
    ][index % 3] ?? '221fd99d-d164-4224-a42e-b5f78ed29d46',
  subtaskName: ['Manual match', 'Legacy RFI', 'Posting check'][index % 3] ?? 'Manual match',
  processedVolume: 10 + index,
  reference,
  remarks: '',
  status: 'paused',
  startedAt: new Date(new Date(pausedAt).getTime() - 180_000).toISOString(),
  pausedAt,
  endedAt: null,
  netDurationSeconds: 180,
}))

const seedSessions = [...pausedSeed, ...completedSeed]

export function readSessions(): TmsSession[] {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const rows = JSON.parse(saved) as Array<
        TmsSession & { subtask?: string; volume?: number; accumulatedSeconds?: number }
      >
      const normalized = rows.map((row) => ({
        ...row,
        // Preserve names from pre-UUID demo sessions so soft-deleted history remains readable.
        subtaskId: row.subtaskId || crypto.randomUUID(),
        subtaskName: row.subtaskName || row.subtask || 'Historical Subtask',
        processedVolume: row.processedVolume ?? row.volume ?? 0,
        netDurationSeconds: row.netDurationSeconds ?? row.accumulatedSeconds ?? 0,
      }))
      let activeSeen = false
      return normalized.map((row) => {
        if (row.status !== 'running' && row.status !== 'paused') return row
        if (!activeSeen) {
          activeSeen = true
          return row
        }
        // Repair legacy mock storage that predates the one-active-session invariant.
        return { ...row, status: 'discarded' as const }
      })
    }
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
  return seedSessions.map((session) => ({ ...session }))
}

export function writeSessions(sessions: TmsSession[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(sessions))
  } catch {
    // The in-memory handler state remains usable when persistence is unavailable.
  }
}
