<script setup lang="ts">
import { computed } from 'vue'

import { capacityTone, parseSignedMetric } from '@/lib/hcFormat'

const props = defineProps<{
  value: string | number | null | undefined
  percent?: boolean
}>()

const display = computed(() => {
  const n = parseSignedMetric(props.value)
  if (n == null) return '—'
  if (props.percent) return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
})

const toneClass = computed(() => capacityTone(props.value) || 'text-foreground')
</script>

<template>
  <span :class="toneClass">{{ display }}</span>
</template>
