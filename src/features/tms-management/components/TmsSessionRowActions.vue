<script setup lang="ts">
import TableTextLink from '@/components/TableTextLink.vue'

defineProps<{
  canToggleEnabled?: boolean
  enabled?: boolean
  toggling?: boolean
}>()

const emit = defineEmits<{
  open: []
  toggleEnabled: []
}>()
</script>

<template>
  <span class="inline-flex gap-3">
    <TableTextLink @click="emit('open')">View</TableTextLink>
    <TableTextLink
      v-if="canToggleEnabled"
      :destructive="enabled !== false"
      :disabled="toggling"
      @click="emit('toggleEnabled')"
    >
      {{ enabled === false ? 'Enable' : 'Disable' }}
    </TableTextLink>
  </span>
</template>
