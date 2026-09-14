<script setup lang="ts">
import TableTextLink from '@/components/TableTextLink.vue'

const emit = defineEmits<{
  open: []
}>()
</script>

<template>
  <TableTextLink @click="emit('open')">View</TableTextLink>
</template>
