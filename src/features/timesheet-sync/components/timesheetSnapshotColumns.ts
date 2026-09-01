import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'

import type {
  TimesheetSnapshotAssignment,
  TimesheetSnapshotKpi,
  TimesheetSnapshotPerson,
  TimesheetSnapshotPosition,
  TimesheetSnapshotScope,
} from '../types'

const personHelper = createColumnHelper<TimesheetSnapshotPerson>()
const positionHelper = createColumnHelper<TimesheetSnapshotPosition>()
const scopeHelper = createColumnHelper<TimesheetSnapshotScope>()
const assignmentHelper = createColumnHelper<TimesheetSnapshotAssignment>()
const kpiHelper = createColumnHelper<TimesheetSnapshotKpi>()

function dash(value: string | number | null | undefined) {
  if (value == null || value === '') return '—'
  return String(value)
}

export function createSnapshotPersonColumns(): ColumnDef<TimesheetSnapshotPerson>[] {
  return [
    personHelper.accessor('ccgid', { header: 'CCGID' }),
    personHelper.accessor((row) => dash(row.empId), { id: 'empId', header: 'Emp ID' }),
    personHelper.accessor('name', { header: 'Name' }),
    personHelper.accessor((row) => dash(row.email), { id: 'email', header: 'Email' }),
    personHelper.accessor((row) => dash(row.center), { id: 'center', header: 'Center' }),
    personHelper.accessor((row) => dash(row.positionId), { id: 'positionId', header: 'Position' }),
  ]
}

export function createSnapshotPositionColumns(): ColumnDef<TimesheetSnapshotPosition>[] {
  return [
    positionHelper.accessor('agentPositionId', { header: 'Agent position' }),
    positionHelper.accessor((row) => dash(row.supervisorPositionId), {
      id: 'supervisorPositionId',
      header: 'Supervisor position',
    }),
    positionHelper.accessor((row) => dash(row.srManagerPositionId), {
      id: 'srManagerPositionId',
      header: 'SR Manager position',
    }),
    positionHelper.accessor((row) => dash(row.domainHeadPositionId), {
      id: 'domainHeadPositionId',
      header: 'Domain Head position',
    }),
  ]
}

export function createSnapshotScopeColumns(): ColumnDef<TimesheetSnapshotScope>[] {
  return [
    scopeHelper.accessor('supervisorPositionId', { header: 'Supervisor position' }),
    scopeHelper.accessor('center', { header: 'Center' }),
    scopeHelper.accessor((row) => dash(row.domain), { id: 'domain', header: 'Domain' }),
    scopeHelper.accessor((row) => dash(row.pl1), { id: 'pl1', header: 'PL1' }),
    scopeHelper.accessor((row) => dash(row.pl2), { id: 'pl2', header: 'PL2' }),
    scopeHelper.accessor('pl3Code', { header: 'PL3 code' }),
    scopeHelper.accessor((row) => dash(row.pl3Name), { id: 'pl3Name', header: 'PL3' }),
  ]
}

export function createSnapshotAssignmentColumns(): ColumnDef<TimesheetSnapshotAssignment>[] {
  return [
    assignmentHelper.accessor('empCcgid', { header: 'CCGID' }),
    assignmentHelper.accessor((row) => dash(row.empId), { id: 'empId', header: 'Emp ID' }),
    assignmentHelper.accessor('supervisorPositionId', { header: 'Supervisor position' }),
    assignmentHelper.accessor('pl3Code', { header: 'PL3 code' }),
  ]
}

export function createSnapshotKpiColumns(): ColumnDef<TimesheetSnapshotKpi>[] {
  return [
    kpiHelper.accessor('supervisorPositionId', { header: 'Supervisor position' }),
    kpiHelper.accessor('pl3Code', { header: 'PL3 code' }),
    kpiHelper.accessor('carrier', { header: 'Carrier' }),
    kpiHelper.accessor('site', { header: 'Site' }),
    kpiHelper.accessor('customerCountry', { header: 'Country' }),
    kpiHelper.accessor((row) => dash(row.hc), { id: 'hc', header: 'Delivery HC' }),
  ]
}
