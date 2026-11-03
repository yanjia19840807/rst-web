import type { GeoGroup } from './types'

export function assignmentConflict(
  groups: readonly GeoGroup[],
  editingId: string | null,
  countries: readonly string[],
  kind: 'region' | 'cluster',
): string | null {
  for (const country of countries) {
    const other = groups.find(
      (group) => group.id !== editingId && group.countries.includes(country),
    )
    if (other) {
      return `${country} is already assigned to ${kind} ${other.name}.`
    }
  }
  return null
}
