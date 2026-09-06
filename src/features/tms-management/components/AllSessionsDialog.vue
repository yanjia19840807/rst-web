<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import TmsSessionsList from './TmsSessionsList.vue'

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[85vh] w-[min(1080px,96vw)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>All Sessions</DialogTitle>
        <DialogDescription>Completed timing sessions with filters and export.</DialogDescription>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
        <TmsSessionsList v-if="open" embedded />
      </div>
    </DialogContent>
  </Dialog>
</template>
