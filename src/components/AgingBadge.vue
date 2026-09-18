<script setup lang="ts">
import { computed } from 'vue'

import { agingTone } from '@/lib/hcFormat'

const props = defineProps<{
  days?: number | null
  fallbackZero?: boolean
}>()

const value = computed(() => (props.days != null ? props.days : props.fallbackZero ? 0 : null))
const tone = computed(() => agingTone(value.value))
const toneClass = computed(() => {
  if (tone.value === 'bad') return 'text-destructive'
  if (tone.value === 'warn') return 'text-amber-600'
  return undefined
})
</script>

<template>
  <span v-if="value != null" :class="toneClass">{{ value }}</span>
  <span v-else>—</span>
</template>
