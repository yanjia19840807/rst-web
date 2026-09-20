<script setup lang="ts">
import { XIcon } from '@lucide/vue'

defineProps<{
  label: string
}>()

const emit = defineEmits<{
  click: []
}>()

/** Keep the trigger from seeing this press; do not preventDefault or click never fires in Edge. */
function stopBubble(event: Event) {
  event.stopPropagation()
}

function onClear(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  emit('click')
}
</script>

<template>
  <button
    type="button"
    class="absolute top-1/2 right-1 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
    :aria-label="label"
    @pointerdown="stopBubble"
    @mousedown="stopBubble"
    @click="onClear"
  >
    <XIcon class="size-3" />
  </button>
</template>
