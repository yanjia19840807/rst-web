<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue'

import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <Button type="button" variant="outline" @click="emit('click', $event)">
    <ChevronLeft />
    <slot />
  </Button>
</template>
