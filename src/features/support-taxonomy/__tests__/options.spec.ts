import { describe, expect, it } from 'vitest'

import { categoriesForSelect } from '../options'

const catalog = [
  { id: 'cat-1', name: 'Quality Control' },
  { id: 'cat-2', name: 'Reporting' },
]

describe('support category select options', () => {
  it('keeps the catalog order for active categories', () => {
    expect(categoriesForSelect(catalog).map((item) => item.id)).toEqual(['cat-1', 'cat-2'])
  })

  it('prepends the current category when it is missing from the lookup', () => {
    expect(
      categoriesForSelect(catalog, { id: 'cat-old', name: 'Retired' }).map((item) => item.id),
    ).toEqual(['cat-old', 'cat-1', 'cat-2'])
  })
})
