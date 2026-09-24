<script setup lang="ts">
import TableTextLink from '@/components/TableTextLink.vue'

defineProps<{
  name: string
  canInfo?: boolean
}>()

const emit = defineEmits<{
  info: []
}>()
</script>

<template>
  <span v-if="!canInfo">{{ name }}</span>
  <TableTextLink v-else title="Toolkit info" @click="emit('info')">{{ name }}</TableTextLink>
</template>
