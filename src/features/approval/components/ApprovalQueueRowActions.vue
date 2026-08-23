<script setup lang="ts">
import { Button } from '@/components/ui/button'

defineProps<{
  label: string
}>()

const emit = defineEmits<{
  review: []
}>()
</script>

<template>
  <Button
    size="sm"
    variant="link"
    class="h-auto px-0 font-semibold"
    @click="emit('review')"
  >
    {{ label }}
  </Button>
</template>
