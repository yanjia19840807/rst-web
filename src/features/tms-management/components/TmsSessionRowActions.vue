<script setup lang="ts">
import TableTextLink from '@/components/TableTextLink.vue'

defineProps<{
  enabled?: boolean
  toggling?: boolean
}>()

const emit = defineEmits<{
  toggleEnabled: []
}>()
</script>

<template>
  <TableTextLink
    :destructive="enabled !== false"
    :disabled="toggling"
    @click="emit('toggleEnabled')"
  >
    {{ enabled === false ? 'Enable' : 'Disable' }}
  </TableTextLink>
</template>
