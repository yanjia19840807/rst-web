import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'

import { THEME_STORAGE_KEY, useTheme } from '../useTheme'

describe('useTheme', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = ''
    localStorage.removeItem(THEME_STORAGE_KEY)
  })

  it('keeps the inline color-scheme in sync when toggling', async () => {
    const { theme, toggleTheme } = useTheme()

    expect(theme.value).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')

    toggleTheme()
    await flushPromises()

    expect(theme.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')

    toggleTheme()
    await flushPromises()

    expect(theme.value).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})
