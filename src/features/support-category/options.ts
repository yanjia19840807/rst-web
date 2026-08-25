export type CategoryChoice = { id: string; name: string }

/**
 * Active categories from the lookup, plus the row's current category when it is no longer active.
 */
export function categoriesForSelect(
  categories: readonly CategoryChoice[],
  current?: { id: string | null; name: string } | null,
): CategoryChoice[] {
  const list = [...categories]
  if (current?.id && current.name && !list.some((item) => item.id === current.id)) {
    return [{ id: current.id, name: current.name }, ...list]
  }
  return list
}
