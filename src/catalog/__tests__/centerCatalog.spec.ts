import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiRequest } from '@/api/client'

import { useCenterCatalogStore, writeCenterCatalog } from '../centerCatalog'

vi.mock('@/api/client', () => ({
  apiRequest: vi.fn(),
}))

afterEach(() => {
  writeCenterCatalog([])
  vi.mocked(apiRequest).mockReset()
})

describe('centerCatalog store', () => {
  it('hydrates the snapshot used by formatters', async () => {
    setActivePinia(createPinia())
    const catalog = useCenterCatalogStore()
    catalog.hydrate([{ center: 'GBS CHINA', timeZone: 'Asia/Shanghai' }])
    expect(catalog.ready).toBe(true)
    expect(catalog.defaultTimeZone).toBe('Asia/Shanghai')
  })

  it('loads the backend catalog once', async () => {
    vi.mocked(apiRequest).mockResolvedValue([
      { center: 'GBS CHINA', timeZone: 'Asia/Shanghai' },
      { center: 'GBS INDIA', timeZone: 'Asia/Kolkata' },
    ])
    setActivePinia(createPinia())
    const catalog = useCenterCatalogStore()
    await catalog.load()
    await catalog.load()
    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(catalog.items).toHaveLength(2)
    expect(catalog.error).toBeNull()
  })

  it('does not invent a zone when the request fails', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('offline'))
    setActivePinia(createPinia())
    const catalog = useCenterCatalogStore()
    await catalog.load()
    expect(catalog.ready).toBe(false)
    expect(catalog.error).toBe('offline')
    expect(catalog.defaultTimeZone).toBeNull()
  })
})
