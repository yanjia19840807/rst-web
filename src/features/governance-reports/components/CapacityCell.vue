<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: string }>()

const toneClass = computed(() => {
  const n = Number.parseFloat(props.value.replace(/[+%]/g, ''))
  if (Number.isNaN(n) || n === 0) return 'text-foreground'
  return n > 0 ? 'text-emerald-600 font-semibold' : 'text-destructive font-semibold'
})
</script>

<template>
  <span :class="toneClass">{{ value }}</span>
</template>
