<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

const props = defineProps<{
  decision?: string | null
}>()

function tone() {
  if (props.decision === 'Returned' || props.decision === 'Rejected') return 'bad' as const
  if (props.decision === 'Approved') return 'good' as const
  return 'muted' as const
}
</script>

<template>
  <Badge
    :variant="tone() === 'bad' ? 'destructive' : 'outline'"
    :class="{
      'border-emerald-200 bg-emerald-50 text-emerald-700': tone() === 'good',
    }"
  >
    {{ decision || '—' }}
  </Badge>
</template>
