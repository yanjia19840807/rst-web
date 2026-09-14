import { describe, expect, it } from 'vitest'

import { personMatchesQuery } from '../personPickerQuery'

const person = {
  name: 'Grace Li',
  email: 'grace.li@example.com',
  ccgid: 'S00628182',
}

describe('personMatchesQuery', () => {
  it('matches an empty query', () => {
    expect(personMatchesQuery(person, '')).toBe(true)
    expect(personMatchesQuery(person, '   ')).toBe(true)
  })

  it('matches name, email or CCGID', () => {
    expect(personMatchesQuery(person, 'grace')).toBe(true)
    expect(personMatchesQuery(person, 'EXAMPLE.COM')).toBe(true)
    expect(personMatchesQuery(person, '628182')).toBe(true)
  })

  it('rejects text that hits none of the three fields', () => {
    expect(personMatchesQuery(person, 'ramesh')).toBe(false)
  })
})
