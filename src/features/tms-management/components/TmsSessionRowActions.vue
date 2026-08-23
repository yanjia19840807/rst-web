<script setup lang="ts">
import { Button } from '@/components/ui/button'

defineProps<{
  canDelete?: boolean
  deleting?: boolean
}>()

const emit = defineEmits<{
  open: []
  delete: []
}>()
</script>

<template>
  <div class="flex items-center justify-end gap-3">
    <Button
      size="sm"
      variant="link"
      class="h-auto px-0 text-sm font-semibold"
      @click="emit('open')"
    >
      View
    </Button>
    <Button
      v-if="canDelete"
      size="sm"
      variant="link-destructive"
      class="h-auto px-0 text-sm font-semibold"
      :disabled="deleting"
      @click="emit('delete')"
    >
      Delete
    </Button>
  </div>
</template>
