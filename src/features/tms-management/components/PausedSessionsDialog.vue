<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePager from '@/components/TablePager.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'

import { useTmsSessionMutations } from '../api/mutations'
import { useTmsSessionsQuery } from '../api/queries'
import type { SessionFilters } from '../types'
import { createPausedSessionColumns } from './pausedSessionColumns'

const props = defineProps<{
  open: boolean
  hasRunningSession: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const queryInput = ref('')
const appliedQuery = ref('')
const page = ref(1)
const pageSize = ref(10)

const listQuery = computed<SessionFilters & { status: 'paused' }>(() => ({
  status: 'paused',
  query: appliedQuery.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const pausedQuery = useTmsSessionsQuery(listQuery, 'agent', () => props.open)
const { resume, discard } = useTmsSessionMutations()
const deleteTargetId = ref('')
const deleteOpen = ref(false)

const items = computed(() => pausedQuery.data.value?.items ?? [])
const total = computed(() => pausedQuery.data.value?.total ?? 0)
const loading = computed(() => pausedQuery.isPending.value && !pausedQuery.data.value)

const columns = computed(() =>
  createPausedSessionColumns({
    hasRunningSession: props.hasRunningSession,
    resumePending: resume.isPending.value,
    deletePending: discard.isPending.value,
    onResume: (id) => {
      void resumeSession(id)
    },
    onDelete: openDelete,
  }),
)

watchDebounced(
  queryInput,
  (value) => {
    appliedQuery.value = value
    page.value = 1
  },
  { debounce: 400 },
)

watch(
  () => props.open,
  (open) => {
    if (open) return
    queryInput.value = ''
    appliedQuery.value = ''
    page.value = 1
  },
)

watch(
  () => ({
    totalPages: pausedQuery.data.value?.totalPages,
    fetching: pausedQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => pausedQuery.isError.value,
  (isError) => {
    if (!isError || !props.open) return
    toast.error(
      pausedQuery.error.value instanceof Error
        ? pausedQuery.error.value.message
        : 'Could not load paused sessions.',
    )
  },
)

async function resumeSession(id: string) {
  try {
    await resume.mutateAsync(id)
    toast.success(`Resumed ${id}`)
    emit('update:open', false)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not resume the session.')
  }
}

function openDelete(id: string) {
  deleteTargetId.value = id
  deleteOpen.value = true
}

async function confirmDelete() {
  try {
    await discard.mutateAsync(deleteTargetId.value)
    deleteOpen.value = false
    toast.success('Paused session deleted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not delete the session.')
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Paused Sessions</DialogTitle>
        <DialogDescription>
          {{ total }} session{{ total === 1 ? '' : 's' }}
          currently paused
          <template v-if="hasRunningSession">
            · Pause or end the running session to resume one of these.
          </template>
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div class="rounded-lg border bg-card p-4">
          <div class="grid gap-4">
            <Input v-model="queryInput" placeholder="Session No / Reference" />

            <DataTable
              :columns="columns"
              :data="items"
              :pending="loading"
              empty-text="No paused sessions found."
              table-class="min-w-[680px]"
              :get-row-id="(row) => row.id"
            />

            <TablePager
              :total="total"
              :page="page"
              :page-size="pageSize"
              label="sessions"
              @update:page="page = $event"
              @update:page-size="
                (size) => {
                  pageSize = size
                  page = 1
                }
              "
            />
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    v-model:open="deleteOpen"
    title="Delete Session"
    warning="This will discard the paused timing session."
    :rows="[{ label: 'Session No', value: deleteTargetId, strong: true }]"
    confirm-label="Delete"
    :pending="discard.isPending.value"
    @confirm="confirmDelete"
  />
</template>
