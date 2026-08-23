<script setup lang="ts">
import { Button } from '@/components/ui/button'

defineProps<{
  canWithdraw?: boolean
}>()

const emit = defineEmits<{
  withdraw: []
  open: []
}>()
</script>

<template>
  <div class="flex items-center justify-end gap-3">
    <Button
      v-if="canWithdraw"
      size="sm"
      variant="link-destructive"
      class="h-auto px-0 font-semibold"
      @click="emit('withdraw')"
    >
      Withdraw
    </Button>
    <Button
      size="sm"
      variant="link"
      class="h-auto px-0 font-semibold"
      @click="emit('open')"
    >
      Open
    </Button>
  </div>
</template>
