<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePager from '@/components/TablePager.vue'
import { Card, CardContent } from '@/components/ui/card'
import { triggerDownload } from '@/features/exercise-management/downloadBlob'

import { tmsApi } from '../api'
import { useTmsSessionMutations } from '../api/mutations'
import {
  useManagedToolkitsQuery,
  useTeamAgentsQuery,
  useTmsSessionsQuery,
} from '../api/queries'
import type { TmsListMode } from '../types'
import TmsSessionFilters, {
  type TmsSessionFilterValues,
} from './TmsSessionFilters.vue'
import TmsSessionsTable from './TmsSessionsTable.vue'

const props = withDefaults(
  defineProps<{
    mode?: TmsListMode
    embedded?: boolean
  }>(),
  { mode: 'agent', embedded: false },
)

const emit = defineEmits<{
  open: [id: string]
}>()

const router = useRouter()
const isSupervisor = computed(() => props.mode === 'supervisor')

const emptyFilterValues = (): TmsSessionFilterValues => ({
  sessionNo: '',
  reference: '',
  dateFrom: '',
  dateTo: '',
  agentCcgid: '',
  toolkitId: '',
  pl3Code: '',
})

const applied = reactive(emptyFilterValues())
const pagination = reactive({
  page: 1,
  pageSize: 10,
})

const queryFilters = computed(() => ({
  status: 'completed' as const,
  ...applied,
  page: pagination.page,
  pageSize: pagination.pageSize,
}))

const sessionsQuery = useTmsSessionsQuery(queryFilters, () => props.mode)
const teamAgentsQuery = useTeamAgentsQuery(isSupervisor)
const toolkitsQuery = useManagedToolkitsQuery(isSupervisor)
const { discard } = useTmsSessionMutations()
const deletingId = ref('')
const deleteTargetId = ref('')
const deleteOpen = ref(false)
const exportOpen = ref(false)
const exporting = ref(false)

const pl3Options = computed(() => {
  const map = new Map<string, string>()
  for (const toolkit of toolkitsQuery.data.value ?? []) {
    if (!toolkit.pl3Code) continue
    if (!map.has(toolkit.pl3Code)) {
      map.set(toolkit.pl3Code, toolkit.pl3Name || toolkit.pl3Code)
    }
  }
  return [...map.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

function applySearch(values: TmsSessionFilterValues) {
  Object.assign(applied, values)
  pagination.page = 1
}

function clearFilters() {
  Object.assign(applied, emptyFilterValues())
  pagination.page = 1
}

function openDelete(id: string) {
  deleteTargetId.value = id
  deleteOpen.value = true
}

async function confirmDelete() {
  deletingId.value = deleteTargetId.value
  try {
    await discard.mutateAsync(deleteTargetId.value)
    deleteOpen.value = false
    toast.success('TMS session deleted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not delete the session.')
  } finally {
    deletingId.value = ''
  }
}

async function confirmExport() {
  exporting.value = true
  try {
    const result = await tmsApi.exportSessions(queryFilters.value, props.mode)
    triggerDownload(result.blob, result.filename)
    exportOpen.value = false
    toast.success('Export downloaded.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Export failed.')
  } finally {
    exporting.value = false
  }
}

function openDetail(id: string) {
  if (props.embedded) {
    emit('open', id)
    return
  }
  void router.push({
    name: isSupervisor.value ? 'supervisor-session-detail' : 'agent-session-detail',
    params: { id },
  })
}
</script>

<template>
  <div>
    <Card :class="embedded ? 'bg-transparent py-0 ring-0' : undefined">
      <CardContent :class="embedded ? 'grid gap-4 px-0' : 'grid gap-4'">
        <TmsSessionFilters
          :show-team-filters="isSupervisor"
          :show-export="true"
          :exporting="exporting"
          :agents="teamAgentsQuery.data.value ?? []"
          :toolkits="toolkitsQuery.data.value ?? []"
          :pl3-options="pl3Options"
          @search="applySearch"
          @clear="clearFilters"
          @export="exportOpen = true"
        />

        <TmsSessionsTable
          :sessions="sessionsQuery.data.value?.items ?? []"
          :pending="sessionsQuery.isPending.value"
          :deleting-id="deletingId"
          :show-agent="isSupervisor"
          :can-delete="!isSupervisor"
          @delete="openDelete"
          @open="openDetail"
        />

        <TablePager
          :total="sessionsQuery.data.value?.total ?? 0"
          :page="pagination.page"
          :page-size="pagination.pageSize"
          label="sessions"
          @update:page="pagination.page = $event"
          @update:page-size="
            (size) => {
              pagination.pageSize = size
              pagination.page = 1
            }
          "
        />
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="exportOpen"
      title="Export TMS Sessions"
      description="Download all sessions matching the applied search filters as an Excel file. Pagination is not applied."
      confirm-label="Export"
      confirm-variant="default"
      :pending="exporting"
      @confirm="confirmExport"
    />

    <ConfirmDialog
      v-if="!isSupervisor"
      v-model:open="deleteOpen"
      title="Delete Session"
      warning="This will discard the completed timing session from the list."
      :rows="[{ label: 'Session No', value: deleteTargetId, strong: true }]"
      confirm-label="Delete"
      :pending="Boolean(deletingId)"
      @confirm="confirmDelete"
    />
  </div>
</template>
