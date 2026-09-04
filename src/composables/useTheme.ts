import { computed, readonly } from 'vue'
import { useDark } from '@vueuse/core'

export const THEME_STORAGE_KEY = 'rst-theme'

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  storageKey: THEME_STORAGE_KEY,
})

export function useTheme() {
  const theme = computed(() => (isDark.value ? 'dark' : 'light'))

  function toggleTheme() {
    isDark.value = !isDark.value
  }

  return {
    isDark: readonly(isDark),
    theme,
    toggleTheme,
  }
}
