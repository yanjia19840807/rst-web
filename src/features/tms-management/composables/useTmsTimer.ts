import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'

import type { TmsSession } from '../types'

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':')
}

export function useTmsTimer(session: Ref<TmsSession | null>) {
  const now = ref(Date.now())
  const baseline = ref(Date.now())
  let interval: ReturnType<typeof setInterval> | undefined

  const stop = () => {
    if (interval) clearInterval(interval)
    interval = undefined
  }

  watch(
    () => session.value,
    (status) => {
      stop()
      now.value = Date.now()
      baseline.value = now.value
      if (status?.status === 'running') {
        interval = setInterval(() => {
          now.value = Date.now()
        }, 1000)
      }
    },
    { immediate: true },
  )

  onScopeDispose(stop)

  const elapsedSeconds = computed(() => {
    const active = session.value
    if (!active) return 0
    if (active.status !== 'running') return active.netDurationSeconds
    return (
      active.netDurationSeconds + Math.max(0, Math.floor((now.value - baseline.value) / 1000))
    )
  })

  return {
    elapsedSeconds,
    formattedElapsed: computed(() => formatDuration(elapsedSeconds.value)),
  }
}
