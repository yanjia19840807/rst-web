<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import ListLoading from '@/components/ListLoading.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ToolkitInfoPanel from '@/features/exercise-management/components/ToolkitInfoPanel.vue'
import { snapshotFromToolkit } from '@/features/exercise-management/snapshotFromToolkit'
import { useToolkitQuery } from '@/features/toolkit-management/api/queries'

import TmsSessionDetail from './TmsSessionDetail.vue'
import TmsSessionsList from './TmsSessionsList.vue'

const open = defineModel<boolean>('open', { default: false })
const selectedSessionId = ref('')
const selectedToolkitId = ref('')

const showingList = computed(() => !selectedSessionId.value && !selectedToolkitId.value)
const toolkitQuery = useToolkitQuery(selectedToolkitId)
const toolkitSnapshot = computed(() => {
  const toolkit = toolkitQuery.data.value
  return toolkit ? snapshotFromToolkit(toolkit) : null
})

watch(open, (isOpen) => {
  if (isOpen) return
  selectedSessionId.value = ''
  selectedToolkitId.value = ''
})

function openSession(id: string) {
  selectedToolkitId.value = ''
  selectedSessionId.value = id
}

function openToolkitInfo(toolkitId: string) {
  selectedSessionId.value = ''
  selectedToolkitId.value = toolkitId
}

function backToList() {
  selectedSessionId.value = ''
  selectedToolkitId.value = ''
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[calc(100vh-2rem)] w-[min(1440px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-[calc(100vw-2rem)]"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>
          {{
            selectedToolkitId
              ? 'Toolkit Info'
              : selectedSessionId
                ? 'TMS Session Detail'
                : 'Completed Sessions'
          }}
        </DialogTitle>
        <DialogDescription>
          {{
            selectedToolkitId
              ? 'Read-only Process Mapping, Shared KPI Scope Split, and Subtasks.'
              : selectedSessionId
                ? 'Read-only timing session.'
                : 'Completed timing sessions with filters and export.'
          }}
        </DialogDescription>
      </DialogHeader>
      <div class="min-w-0 px-5 py-4">
        <div class="min-w-0 rounded-lg border bg-card p-4">
          <div class="all-sessions-list min-w-0" :class="{ hidden: !showingList }">
            <TmsSessionsList
              v-if="open"
              embedded
              @open="openSession"
              @toolkit-info="openToolkitInfo"
            />
          </div>
          <div v-if="selectedSessionId" class="grid gap-4">
            <Button
              variant="link"
              class="h-auto w-fit px-0 font-semibold"
              @click="backToList"
            >
              ← Back to Completed Sessions
            </Button>
            <TmsSessionDetail embedded :session-id="selectedSessionId" />
          </div>
          <div v-else-if="selectedToolkitId" class="grid gap-4">
            <Button
              variant="link"
              class="h-auto w-fit px-0 font-semibold"
              @click="backToList"
            >
              ← Back to Completed Sessions
            </Button>
            <ListLoading v-if="toolkitQuery.isPending.value" />
            <p
              v-else-if="toolkitQuery.isError.value"
              class="py-6 text-center text-sm text-destructive"
            >
              {{
                toolkitQuery.error.value instanceof Error
                  ? toolkitQuery.error.value.message
                  : 'Could not load toolkit info.'
              }}
            </p>
            <ToolkitInfoPanel
              v-else
              embedded
              :snapshot="toolkitSnapshot"
              :alignment="toolkitQuery.data.value?.alignment"
            />
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
