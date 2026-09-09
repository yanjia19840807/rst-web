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
import type { TimesheetAlignmentView } from '@/features/timesheet-alignment/types'

import type { Exercise } from '../types'
import ToolkitInfoPanel from './ToolkitInfoPanel.vue'

const open = defineModel<boolean>('open', { default: false })

defineProps<{
  snapshot: Exercise['snapshot'] | null
  alignment?: TimesheetAlignmentView | null
}>()
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex h-[92vh] w-[min(1080px,96vw)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Toolkit Info</DialogTitle>
        <DialogDescription>
          Read-only Process Mapping, Shared KPI Scope Split, and Subtasks.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
        <ToolkitInfoPanel :snapshot="snapshot" :alignment="alignment" />
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button type="button" variant="outline" @click="open = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
