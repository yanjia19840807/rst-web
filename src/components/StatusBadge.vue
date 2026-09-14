<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { statusBadgeVariant } from '@/lib/statusBadge'

defineProps<{
  status?: string | null
  title?: string
}>()
</script>

<template>
  <Badge v-if="status" :variant="statusBadgeVariant(status)" :title="title">{{ status }}</Badge>
  <span v-else>—</span>
</template>
