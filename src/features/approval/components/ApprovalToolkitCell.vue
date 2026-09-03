<script setup lang="ts">
import { Info } from '@lucide/vue'

import { infoHintButtonClass, infoHintIconClass } from '@/components/ui/alert'

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
      :class="infoHintButtonClass"
      title="Toolkit info"
      @click="emit('info')"
    >
      <Info :class="infoHintIconClass" />
      <span class="sr-only">Toolkit info</span>
    </button>
  </span>
</template>
