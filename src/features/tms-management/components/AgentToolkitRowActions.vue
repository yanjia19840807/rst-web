<script setup lang="ts">
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  open: []
}>()
</script>

<template>
  <div class="flex items-center justify-end">
    <Button
      size="sm"
      variant="link"
      class="h-auto px-0 text-sm font-semibold"
      @click="emit('open')"
    >
      View
    </Button>
  </div>
</template>
