import { describe, expect, it } from 'vitest'

import { pickScenario, remainingScenarios } from '../scenarioSelection'

const s1 = { id: 's1' }
const s2 = { id: 's2' }
const official = { id: 'official' }

describe('remainingScenarios', () => {
  it('drops the removed id and keeps the rest', () => {
    expect(remainingScenarios([s1, official, s2], official.id)).toEqual([s1, s2])
  })

  it('returns an empty list after the last scenario is removed', () => {
    expect(remainingScenarios([s1], s1.id)).toEqual([])
  })
})

describe('pickScenario', () => {
  it('prefers Official when it is still present', () => {
    expect(pickScenario([s1, official, s2], official.id)).toEqual(official)
  })

  it('falls back to the first remaining scenario', () => {
    expect(pickScenario([s1, s2], official.id)).toEqual(s1)
  })

  it('is undefined when no scenarios remain', () => {
    expect(pickScenario([], official.id)).toBeUndefined()
  })
})
