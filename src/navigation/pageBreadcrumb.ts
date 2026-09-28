import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import type { BreadcrumbItem } from './breadcrumbs'

const items = ref<BreadcrumbItem[] | null>(null)
let nextId = 0
let activeId = 0

export function useBreadcrumbOverride() {
  return items
}

/** Page-owned trail. Replaces the route default until the page unmounts. */
export function usePageBreadcrumb(
  source: MaybeRefOrGetter<BreadcrumbItem[] | null | undefined>,
) {
  const id = ++nextId
  watch(
    () => toValue(source),
    (value) => {
      activeId = id
      items.value = value?.length ? value : null
    },
    { immediate: true },
  )
  onUnmounted(() => {
    if (activeId !== id) return
    items.value = null
    activeId = 0
  })
}
