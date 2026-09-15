import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/api/client'

export type CenterZone = {
  center: string
  timeZone: string
}

let snapshot: CenterZone[] = []

export function readCenterCatalog(): CenterZone[] {
  return snapshot
}

export function writeCenterCatalog(entries: CenterZone[]) {
  writeSnapshot(entries)
}

function writeSnapshot(entries: CenterZone[]) {
  snapshot = entries
    .filter((entry) => entry.center?.trim() && entry.timeZone?.trim())
    .map((entry) => ({
      center: entry.center.trim(),
      timeZone: entry.timeZone.trim(),
    }))
}

/**
 * Backend Center → IANA catalog. Loaded once at session start.
 */
export const useCenterCatalogStore = defineStore('centerCatalog', () => {
  const items = ref<CenterZone[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let loadPromise: Promise<void> | null = null

  const ready = computed(() => items.value.length > 0)
  const defaultCenter = computed(() => items.value[0]?.center ?? null)
  const defaultTimeZone = computed(() => items.value[0]?.timeZone ?? null)

  function apply(entries: CenterZone[]) {
    writeSnapshot(entries)
    items.value = snapshot
  }

  function hydrate(entries: CenterZone[]) {
    apply(entries)
    error.value = null
  }

  async function load() {
    if (loadPromise) return loadPromise
    if (items.value.length > 0) return
    loading.value = true
    loadPromise = apiRequest<CenterZone[]>('/api/v1/centers')
      .then((data) => {
        if (!data?.length) {
          throw new Error('Center catalog is empty.')
        }
        apply(data)
        error.value = null
      })
      .catch((err: unknown) => {
        apply([])
        error.value = err instanceof Error ? err.message : 'Could not load Center catalog.'
      })
      .finally(() => {
        loading.value = false
      })
    return loadPromise
  }

  async function reload() {
    loadPromise = null
    items.value = []
    writeSnapshot([])
    await load()
  }

  return {
    items,
    loading,
    error,
    ready,
    defaultCenter,
    defaultTimeZone,
    hydrate,
    load,
    reload,
  }
})
