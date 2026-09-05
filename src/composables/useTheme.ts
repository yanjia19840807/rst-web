import { computed, readonly, watch } from 'vue'
import { useDark } from '@vueuse/core'

export const THEME_STORAGE_KEY = 'rst-theme'

function applyColorScheme(dark: boolean) {
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  storageKey: THEME_STORAGE_KEY,
})

// index.html sets inline color-scheme before paint. useDark only toggles the
// `dark` class, so the inline value must be kept in sync or CSS `.dark {
// color-scheme }` loses to the style attribute until the next reload.
watch(isDark, (dark) => applyColorScheme(dark), { immediate: true })

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
