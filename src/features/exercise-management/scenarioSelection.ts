export function remainingScenarios<T extends { id: string }>(
  scenarios: readonly T[],
  removedId: string | null | undefined,
): T[] {
  if (!removedId) return [...scenarios]
  return scenarios.filter((item) => item.id !== removedId)
}

export function pickScenario<T extends { id: string }>(
  scenarios: readonly T[],
  officialId: string | null | undefined,
): T | undefined {
  return scenarios.find((item) => item.id === officialId) ?? scenarios[0]
}
