import { describe, expect, it } from 'vitest'

import { chosenNextPositionId, mustChooseHandler } from '../nextHandler'

const ada = { positionId: 'POS-1', name: 'Ada', ccgid: 'DH001' }
const ben = { positionId: 'POS-2', name: 'Ben', ccgid: 'DH002' }

describe('next handler choice', () => {
  it('does not ask when the next step has one handler', () => {
    expect(mustChooseHandler([ada])).toBe(false)
    expect(chosenNextPositionId([ada], '')).toBe('POS-1')
  })

  it('requires a configured handler when several are available', () => {
    expect(mustChooseHandler([ada, ben])).toBe(true)
    expect(chosenNextPositionId([ada, ben], '')).toBeNull()
    expect(chosenNextPositionId([ada, ben], 'POS-9')).toBeNull()
    expect(chosenNextPositionId([ada, ben], 'POS-2')).toBe('POS-2')
  })
})
