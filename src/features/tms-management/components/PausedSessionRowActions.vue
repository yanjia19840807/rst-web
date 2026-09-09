<script setup lang="ts">
import { Button } from '@/components/ui/button'

defineProps<{
  resumeDisabled?: boolean
  discardDisabled?: boolean
}>()

const emit = defineEmits<{
  resume: []
  discard: []
}>()
</script>

<template>
  <div class="flex items-center justify-end gap-3">
    <Button
      size="sm"
      variant="link"
      class="h-auto px-0 font-semibold"
      :disabled="resumeDisabled"
      @click="emit('resume')"
    >
      Resume
    </Button>
    <Button
      size="sm"
      variant="link-destructive"
      class="h-auto px-0 font-semibold"
      :disabled="discardDisabled"
      @click="emit('discard')"
    >
      Discard
    </Button>
  </div>
</template>
