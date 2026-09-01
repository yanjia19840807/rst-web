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

function positionWithName(id: string | null | undefined, name: string | null | undefined) {
  if (id == null || id === '') return '—'
  if (name == null || name === '') return id
  return `${id} (${name})`
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
    positionHelper.accessor((row) => positionWithName(row.agentPositionId, row.agentName), {
      id: 'agentPositionId',
      header: 'Agent position',
    }),
    positionHelper.accessor((row) => dash(row.center), { id: 'center', header: 'Center' }),
    positionHelper.accessor((row) => positionWithName(row.supervisorPositionId, row.supervisorName), {
      id: 'supervisorPositionId',
      header: 'Supervisor position',
    }),
    positionHelper.accessor((row) => positionWithName(row.srManagerPositionId, row.srManagerName), {
      id: 'srManagerPositionId',
      header: 'SR Manager position',
    }),
    positionHelper.accessor((row) => positionWithName(row.domainHeadPositionId, row.domainHeadName), {
      id: 'domainHeadPositionId',
      header: 'Domain Head position',
    }),
  ]
}

export function createSnapshotScopeColumns(): ColumnDef<TimesheetSnapshotScope>[] {
  return [
    scopeHelper.accessor((row) => positionWithName(row.supervisorPositionId, row.supervisorName), {
      id: 'supervisorPositionId',
      header: 'Supervisor position',
    }),
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
    assignmentHelper.accessor((row) => positionWithName(row.agentPositionId, row.agentName), {
      id: 'agentPositionId',
      header: 'Agent position',
    }),
    assignmentHelper.accessor((row) => positionWithName(row.supervisorPositionId, row.supervisorName), {
      id: 'supervisorPositionId',
      header: 'Supervisor position',
    }),
    assignmentHelper.accessor('pl3Code', { header: 'PL3 code' }),
    assignmentHelper.accessor((row) => dash(row.pl3Name), { id: 'pl3Name', header: 'PL3' }),
    assignmentHelper.accessor((row) => dash(row.center), { id: 'center', header: 'Center' }),
  ]
}

export function createSnapshotKpiColumns(): ColumnDef<TimesheetSnapshotKpi>[] {
  return [
    kpiHelper.accessor((row) => positionWithName(row.supervisorPositionId, row.supervisorName), {
      id: 'supervisorPositionId',
      header: 'Supervisor position',
    }),
    kpiHelper.accessor((row) => dash(row.center), { id: 'center', header: 'Center' }),
    kpiHelper.accessor('pl3Code', { header: 'PL3 code' }),
    kpiHelper.accessor((row) => dash(row.pl3Name), { id: 'pl3Name', header: 'PL3' }),
    kpiHelper.accessor('carrier', { header: 'Carrier' }),
    kpiHelper.accessor('site', { header: 'Site' }),
    kpiHelper.accessor('customerCountry', { header: 'Country' }),
    kpiHelper.accessor((row) => dash(row.hc), { id: 'hc', header: 'Delivery HC' }),
  ]
}
