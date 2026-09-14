<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'

defineProps<{
  decision?: string | null
}>()
</script>

<template>
  <StatusBadge :status="decision" />
</template>
