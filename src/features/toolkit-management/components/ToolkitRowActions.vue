<script setup lang="ts">
import TableTextLink from '@/components/TableTextLink.vue'

defineProps<{
  exporting?: boolean
  exportDisabled?: boolean
  createDisabled?: boolean
}>()

const emit = defineEmits<{
  create: []
  edit: []
  export: []
}>()
</script>

<template>
  <span class="inline-flex gap-3">
    <TableTextLink
      :disabled="createDisabled"
      :title="
        createDisabled
          ? 'Enable the Toolkit and fix Shared KPI scope before creating an Exercise.'
          : undefined
      "
      @click="emit('create')"
    >
      Create Exercise
    </TableTextLink>
    <TableTextLink :disabled="exportDisabled || exporting" @click="emit('export')">
      {{ exporting ? 'Exporting…' : 'Export' }}
    </TableTextLink>
    <TableTextLink @click="emit('edit')">Edit</TableTextLink>
  </span>
</template>
