<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useOperationNotices } from '@/composables/useOperationNotices'

const { open, title, summary, notices, dismiss } = useOperationNotices()

function onOpenChange(value: boolean) {
  if (!value) dismiss()
}
</script>

<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent
      class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>Review the notes from this operation.</DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div class="rounded-lg border bg-card p-4">
          <h3 class="mb-3 text-sm font-medium leading-relaxed text-foreground">
            {{ summary }}
          </h3>
          <ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            <li v-for="(notice, index) in notices" :key="index">
              {{ notice }}
            </li>
          </ul>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button @click="dismiss">OK</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
