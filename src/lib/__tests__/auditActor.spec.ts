import { describe, expect, it } from 'vitest'

import {
  actorLabel,
  hasDistinctActor,
  isDelegated,
  onBehalfLabel,
  ownerLabel,
  ownerViaLabel,
  personLabel,
  sameAuditActor,
  viaLabel,
} from '../auditActor'

describe('auditActor', () => {
  const delegated = {
    actorCcgid: 'SUP1',
    actorName: 'CHEN Cindy',
    subjectCcgid: 'AGT1',
    subjectName: 'WU Rongchan',
    subjectPositionId: '174327',
    delegated: true,
  }

  it('formats actor, via, and on-behalf labels', () => {
    expect(actorLabel(delegated)).toBe('CHEN Cindy')
    expect(ownerLabel(delegated)).toBe('WU Rongchan')
    expect(viaLabel(delegated)).toBe('via CHEN Cindy')
    expect(ownerViaLabel(delegated)).toBe('WU Rongchan via CHEN Cindy')
    expect(onBehalfLabel(delegated)).toBe('WU Rongchan · Position 174327')
    expect(isDelegated(delegated)).toBe(true)
    expect(hasDistinctActor(delegated)).toBe(true)
    expect(
      hasDistinctActor({
        ...delegated,
        subjectCcgid: 'SUP1',
        subjectName: 'CHEN Cindy',
      }),
    ).toBe(false)
  })

  it('skips CCGID-as-name so lists match TMS display names', () => {
    expect(personLabel('S001', 'S001')).toBe('')
    expect(ownerLabel({
      actorCcgid: 'S001',
      actorName: 'S001',
      subjectCcgid: 'S001',
      subjectName: 'S001',
    })).toBe('S001')
    expect(ownerLabel({
      actorCcgid: 'SUP1',
      actorName: 'SUP1',
      subjectCcgid: 'AGT1',
      subjectName: 'WU Rongchan',
    })).toBe('WU Rongchan')
  })

  it('treats the same actor as unchanged', () => {
    expect(sameAuditActor(delegated, { ...delegated })).toBe(true)
    expect(sameAuditActor(delegated, { ...delegated, actorCcgid: 'SUP2' })).toBe(false)
  })
})
