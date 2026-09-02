<script setup lang="ts">
import { Button } from '@/components/ui/button'

const props = defineProps<{
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
  <div class="flex items-center justify-end gap-3">
    <Button
      size="sm"
      variant="link"
      class="h-auto px-0 font-semibold"
      :disabled="createDisabled"
      :title="
        createDisabled
          ? 'Reconfigure Shared KPI scope before creating an Exercise.'
          : undefined
      "
      @click="emit('create')"
    >
      Create Exercise
    </Button>
    <Button
      size="sm"
      variant="link"
      class="h-auto px-0 font-semibold"
      :loading="exporting"
      :disabled="exportDisabled"
      @click="emit('export')"
    >
      {{ exporting ? 'Exporting…' : 'Export' }}
    </Button>
    <Button
      size="sm"
      variant="link"
      class="h-auto px-0 font-semibold"
      @click="emit('edit')"
    >
      Edit
    </Button>
  </div>
</template>
