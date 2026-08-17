<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: string | number | null | undefined }>()

const display = computed(() => {
  if (props.value == null || props.value === '') return '—'
  const n = Number.parseFloat(String(props.value).replace(/[+%]/g, ''))
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
})

const toneClass = computed(() => {
  const n = Number.parseFloat(String(props.value ?? '').replace(/[+%]/g, ''))
  if (!Number.isFinite(n) || n === 0) return 'text-foreground'
  return n > 0 ? 'text-emerald-600 font-semibold' : 'text-destructive font-semibold'
})
</script>

<template>
  <span :class="toneClass">{{ display }}</span>
</template>
