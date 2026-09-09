import type { SupervisorToolkit } from '@/features/toolkit-management/types'

import type { Exercise } from './types'

export function snapshotFromToolkit(toolkit: SupervisorToolkit): Exercise['snapshot'] {
  return {
    toolkit: {
      id: toolkit.id,
      name: toolkit.name,
      center: toolkit.center,
      domain: toolkit.domain,
      pl1: toolkit.pl1,
      pl2: toolkit.pl2,
      pl3Code: toolkit.pl3Code,
      pl3Name: toolkit.pl3Name,
      combineSubtasksTime: toolkit.combineSubtasksTime,
      enabled: toolkit.enabled !== false,
      version: toolkit.version,
    },
    subtasks: toolkit.subtasks,
    sharedKpis: toolkit.sharedKpiSelections.map((selection, index) => {
      const match = toolkit.alignment?.lines.find(
        (line) =>
          line.carrier === selection.carrier &&
          line.site === selection.site &&
          line.customerCountry === selection.customerCountry,
      )
      return {
        id: `${selection.carrier}-${selection.site}-${selection.customerCountry}-${index}`,
        sourceSelectionId: null,
        carrier: selection.carrier,
        site: selection.site,
        customerCountry: selection.customerCountry,
        deliveryHc: Number(match?.currentDeliveryHc ?? 0),
        valid: !match?.missing,
      }
    }),
    timesheetSyncDate: toolkit.alignment?.currentMonthlySyncDate ?? '',
  }
}
