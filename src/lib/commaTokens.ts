/** Splits values on commas, trims, and keeps first-seen literals. */
export function distinctCommaTokens(
  values: Array<string | null | undefined> | null | undefined,
): string[] {
  const tokens: string[] = []
  const seen = new Set<string>()
  for (const value of values ?? []) {
    if (!value) continue
    for (const part of String(value).split(',')) {
      const token = part.trim()
      if (token && !seen.has(token)) {
        seen.add(token)
        tokens.push(token)
      }
    }
  }
  return tokens
}

/** Customer Country display: split, dedupe, then join with commas. */
export function joinCommaTokens(
  values: Array<string | null | undefined> | null | undefined,
): string {
  return distinctCommaTokens(values).join(', ')
}
