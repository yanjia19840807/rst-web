<script setup lang="ts">
import { ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import TmsSessionDetail from './TmsSessionDetail.vue'
import TmsSessionsList from './TmsSessionsList.vue'

const open = defineModel<boolean>('open', { default: false })
const selectedSessionId = ref('')

watch(open, (isOpen) => {
  if (!isOpen) selectedSessionId.value = ''
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[calc(100vh-2rem)] w-[min(1440px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-[calc(100vw-2rem)]"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>{{ selectedSessionId ? 'TMS Session Detail' : 'All Sessions' }}</DialogTitle>
        <DialogDescription>
          {{
            selectedSessionId
              ? 'Read-only timing session.'
              : 'Completed timing sessions with filters and export.'
          }}
        </DialogDescription>
      </DialogHeader>
      <div class="min-w-0 px-5 py-4">
        <div class="min-w-0 rounded-lg border bg-card p-4">
          <div class="all-sessions-list min-w-0" :class="{ hidden: Boolean(selectedSessionId) }">
            <TmsSessionsList
              v-if="open"
              embedded
              @open="selectedSessionId = $event"
            />
          </div>
          <div v-if="selectedSessionId" class="grid gap-4">
            <Button
              variant="link"
              class="h-auto w-fit px-0 font-semibold"
              @click="selectedSessionId = ''"
            >
              ← Back to All Sessions
            </Button>
            <TmsSessionDetail embedded :session-id="selectedSessionId" />
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
