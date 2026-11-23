import type { HierarchyOption } from './types'

function text(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => text(value)).filter((value) => value.length > 0))]
}

export interface HierarchySelection {
  center: string
  domain: string
  pl1: string
  pl2: string
}

/**
 * Each list is the next level of the rows that match the levels already chosen.
 * A blank level is not a choice: it is omitted, and it does not open the next list.
 */
export function cascadeHierarchy(rows: HierarchyOption[], selected: HierarchySelection) {
  const center = text(selected.center)
  const domain = text(selected.domain)
  const pl1 = text(selected.pl1)
  const pl2 = text(selected.pl2)

  const inCenter = center ? rows.filter((item) => text(item.center) === center) : []
  const inDomain = domain ? inCenter.filter((item) => text(item.domain) === domain) : []
  const inPl1 = pl1 ? inDomain.filter((item) => text(item.pl1) === pl1) : []
  const inPl2 = pl2 ? inPl1.filter((item) => text(item.pl2) === pl2) : []

  return {
    centers: unique(rows.map((item) => item.center)),
    domains: unique(inCenter.map((item) => item.domain)),
    pl1s: unique(inDomain.map((item) => item.pl1)),
    pl2s: unique(inPl1.map((item) => item.pl2)),
    pl3s: inPl2,
  }
}
