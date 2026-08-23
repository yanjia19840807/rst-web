<script setup lang="ts">
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  create: []
  edit: []
}>()
</script>

<template>
  <div class="flex items-center justify-end gap-3">
    <Button
      size="sm"
      variant="link"
      class="h-auto px-0 font-semibold"
      @click="emit('create')"
    >
      Create Exercise
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
