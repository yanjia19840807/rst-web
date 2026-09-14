<script setup lang="ts">
import TableTextLink from '@/components/TableTextLink.vue'

const emit = defineEmits<{
  open: []
}>()
</script>

<template>
  <span class="inline-flex gap-3">
    <TableTextLink @click="emit('open')">Open</TableTextLink>
  </span>
</template>
