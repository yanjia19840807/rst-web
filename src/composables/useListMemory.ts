import { nextTick, onBeforeUnmount, onMounted, toRaw, type Ref } from 'vue'

type ListMemory = {
  draft: Record<string, unknown>
  applied: Record<string, unknown>
  page: number
  pageSize: number
  scrollTop: number
}

const lists = new Map<string, ListMemory>()

function cloneRecord(value: object): Record<string, unknown> {
  return structuredClone(toRaw(value)) as Record<string, unknown>
}

/**
 * Remembers filters, page, and main-panel scroll for one list across a visit
 * to a detail page. Cleared when the browser session reloads.
 */
export function useListMemory(
  key: string,
  state: {
    draft: object
    applied: object
    page: Ref<number>
    pageSize: Ref<number>
  },
) {
  const saved = lists.get(key)
  if (saved) {
    Object.assign(state.draft, structuredClone(saved.draft))
    Object.assign(state.applied, structuredClone(saved.applied))
    state.page.value = saved.page
    state.pageSize.value = saved.pageSize
  }

  onMounted(() => {
    const top = lists.get(key)?.scrollTop ?? 0
    if (top <= 0) return
    void nextTick(() => {
      const main = document.getElementById('main-content')
      if (main) main.scrollTop = top
    })
  })

  onBeforeUnmount(() => {
    lists.set(key, {
      draft: cloneRecord(state.draft),
      applied: cloneRecord(state.applied),
      page: state.page.value,
      pageSize: state.pageSize.value,
      scrollTop: document.getElementById('main-content')?.scrollTop ?? 0,
    })
  })
}
