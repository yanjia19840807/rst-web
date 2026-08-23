<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '@/components/ui/badge'
import { agingTone } from '@/lib/hcFormat'

const props = defineProps<{
  days?: number | null
  fallbackZero?: boolean
}>()

const value = computed(() => (props.days != null ? props.days : props.fallbackZero ? 0 : null))
const tone = computed(() => agingTone(value.value))
</script>

<template>
  <Badge
    v-if="value != null"
    :variant="tone === 'bad' ? 'destructive' : 'outline'"
    :class="{
      'border-amber-200 bg-amber-50 text-amber-800': tone === 'warn',
    }"
  >
    {{ value }}
    {{ value === 1 ? 'day' : 'days' }}
  </Badge>
  <span v-else>—</span>
</template>
