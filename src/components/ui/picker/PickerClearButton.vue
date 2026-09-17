<script setup lang="ts">
import { XIcon } from '@lucide/vue'

import { Button } from '@/components/ui/button'

defineProps<{
  label: string
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon-xs"
    class="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    :aria-label="label"
    @click.stop="emit('click')"
  >
    <XIcon />
  </Button>
</template>
