<script setup lang="ts">
import { Info } from '@lucide/vue'

defineProps<{
  name: string
  canInfo?: boolean
}>()

const emit = defineEmits<{
  info: []
}>()
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <span>{{ name }}</span>
    <button
      v-if="canInfo"
      type="button"
      class="inline-flex size-5 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/10"
      title="Toolkit info"
      @click="emit('info')"
    >
      <Info class="size-3.5" />
      <span class="sr-only">Toolkit info</span>
    </button>
  </span>
</template>
