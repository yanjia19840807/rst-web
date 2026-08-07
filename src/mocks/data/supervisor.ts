import type { Exercise } from '@/features/exercise-management/types'
import type {
  HierarchyOption,
  SharedKpiCandidate,
  SupervisorToolkit,
} from '@/features/toolkit-management/types'

export const activeTimesheetSyncDate = '2026-08-05'
export const supervisorPositionId = 'POS-SUP-001'

export const hierarchy: HierarchyOption[] = [
  {
    supervisorPositionId,
    center: 'Kuala Lumpur',
    domain: 'Finance',
    pl1: 'Accounting',
    pl2: 'Record to Report',
    pl3Code: 'PL3-BANK-REC',
    pl3Name: 'Bank Reconciliation',
  },
  {
    supervisorPositionId,
    center: 'Kuala Lumpur',
    domain: 'Finance',
    pl1: 'Accounting',
    pl2: 'Procure to Pay',
    pl3Code: 'PL3-INVOICE',
    pl3Name: 'Invoice Processing',
  },
  {
    supervisorPositionId,
    center: 'Chennai',
    domain: 'Customer Care',
    pl1: 'Booking',
    pl2: 'Booking Management',
    pl3Code: 'PL3-BOOKING',
    pl3Name: 'Booking Validation',
  },
]

const kpiByPl3: Record<string, SharedKpiCandidate[]> = {
  'PL3-BANK-REC': [
    { carrier: 'CMA CGM', site: 'Sydney', customerCountry: 'Australia', deliveryHc: 12.5, valid: true },
    { carrier: 'ANL', site: 'Melbourne', customerCountry: 'Australia', deliveryHc: 8, valid: true },
    { carrier: 'CMA CGM', site: 'Auckland', customerCountry: 'New Zealand', deliveryHc: 4.5, valid: true },
  ],
  'PL3-INVOICE': [
    { carrier: 'CMA CGM', site: 'Singapore', customerCountry: 'Singapore', deliveryHc: 16, valid: true },
  ],
  'PL3-BOOKING': [
    { carrier: 'APL', site: 'Los Angeles', customerCountry: 'United States', deliveryHc: 21, valid: true },
  ],
}

export function kpiCandidates(pl3Code: string) {
  return (kpiByPl3[pl3Code] ?? []).map((item) => ({ ...item }))
}

export const supervisorToolkits: SupervisorToolkit[] = [
  {
    id: 'ca651a20-909f-4aef-a545-269cb1f0b414',
    name: 'Bank Reconciliation',
    description: 'Manual and automated reconciliation work.',
    supervisorPositionId,
    center: 'Kuala Lumpur',
    domain: 'Finance',
    pl1: 'Accounting',
    pl2: 'Record to Report',
    pl3Code: 'PL3-BANK-REC',
    pl3Name: 'Bank Reconciliation',
    combineSubtasksTime: false,
    subtasks: [
      {
        id: '221fd99d-d164-4224-a42e-b5f78ed29d46',
        name: 'Manual match',
        description: 'Match unmatched bank entries.',
        displayOrder: 1,
        deletedAt: null,
      },
      {
        id: '774470ed-41fb-48f4-97ed-665cdf325c9e',
        name: 'Posting check',
        description: 'Validate posting results.',
        displayOrder: 2,
        deletedAt: null,
      },
      {
        id: 'f1b3a57a-5ace-465f-b236-2707f5cf270c',
        name: 'Legacy RFI',
        description: 'Historical task retained for TMS display.',
        displayOrder: 3,
        deletedAt: '2026-07-01T00:00:00Z',
      },
    ],
    sharedKpiSelections: [
      { carrier: 'CMA CGM', site: 'Sydney', customerCountry: 'Australia' },
      { carrier: 'ANL', site: 'Melbourne', customerCountry: 'Australia' },
    ],
    version: 2,
    deletedAt: null,
  },
]

export const exercises: Exercise[] = []
