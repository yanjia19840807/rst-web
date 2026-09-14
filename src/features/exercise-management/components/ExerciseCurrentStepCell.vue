<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'

defineProps<{
  label: string
  returned?: boolean
  title?: string
}>()
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-1.5" :title="title">
    <span>{{ label }}</span>
    <StatusBadge v-if="returned" status="Returned" />
  </span>
</template>
