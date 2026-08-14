import { readonly, ref } from 'vue'

const open = ref(false)
const title = ref('Notices')
const summary = ref('')
const notices = ref<string[]>([])

export function showOperationNotices(options: {
  /** Short dialog chrome title. Defaults to "Notices". */
  title?: string
  /** Situation explained inside the panel. */
  summary: string
  notices: string[]
}) {
  const cleaned = options.notices.map((n) => n.trim()).filter((n) => n.length > 0)
  if (cleaned.length === 0) return false
  title.value = options.title?.trim() || 'Notices'
  summary.value = options.summary.trim()
  notices.value = cleaned
  open.value = true
  return true
}

export function useOperationNotices() {
  function dismiss() {
    open.value = false
    notices.value = []
    summary.value = ''
    title.value = 'Notices'
  }

  return {
    open,
    title: readonly(title),
    summary: readonly(summary),
    notices: readonly(notices),
    dismiss,
  }
}
