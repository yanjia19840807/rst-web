export type PersonQueryFields = {
  name?: string | null
  email?: string | null
  ccgid?: string | null
}

export function personMatchesQuery(person: PersonQueryFields, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [person.name, person.email, person.ccgid].some((part) =>
    (part ?? '').toLowerCase().includes(needle),
  )
}
