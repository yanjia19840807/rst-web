<script setup lang="ts">
import TableTextLink from '@/components/TableTextLink.vue'

defineProps<{
  label: string
}>()

const emit = defineEmits<{
  review: []
}>()
</script>

<template>
  <TableTextLink @click="emit('review')">{{ label }}</TableTextLink>
</template>
