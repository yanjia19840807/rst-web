<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

defineProps<{
  label: string
  returned?: boolean
  title?: string
}>()
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-1.5" :title="title">
    <span>{{ label }}</span>
    <Badge v-if="returned" variant="outline">Returned</Badge>
  </span>
</template>
