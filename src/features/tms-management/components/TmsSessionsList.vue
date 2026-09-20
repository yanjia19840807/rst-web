<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePager from '@/components/TablePager.vue'
import { Card, CardContent } from '@/components/ui/card'
import { triggerDownload } from '@/features/exercise-management/downloadBlob'
import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import { snapshotFromToolkit } from '@/features/exercise-management/snapshotFromToolkit'
import type { Exercise } from '@/features/exercise-management/types'
import type { TimesheetAlignmentView } from '@/features/timesheet-alignment/types'
import { toolkitApi } from '@/features/toolkit-management/api'
import { toolkitQueryKeys } from '@/features/toolkit-management/api/queries'

import { tmsApi } from '../api'
import { useTmsSessionMutations } from '../api/mutations'
import {
  useManagedToolkitsQuery,
  useTeamAgentsQuery,
  useTmsSessionsQuery,
  useToolkitsQuery,
} from '../api/queries'
import type { TmsListMode, TmsSession } from '../types'
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
  toolkitInfo: [toolkitId: string]
}>()

const router = useRouter()
const queryClient = useQueryClient()
const isSupervisor = computed(() => props.mode === 'supervisor')

const emptyFilterValues = (): TmsSessionFilterValues => ({
  sessionNo: '',
  reference: '',
  dateFrom: '',
  dateTo: '',
  agentCcgid: '',
  toolkitId: '',
  center: '',
  domain: '',
  pl3Code: '',
  carrier: '',
  site: '',
  customerCountry: '',
  enabled: '',
})

const applied = reactive(emptyFilterValues())
const pagination = reactive({
  page: 1,
  pageSize: 10,
})

const queryFilters = computed(() => ({
  status: 'completed' as const,
  ...applied,
  enabled:
    applied.enabled === 'true' ? true : applied.enabled === 'false' ? false : undefined,
  page: pagination.page,
  pageSize: pagination.pageSize,
}))

const sessionsQuery = useTmsSessionsQuery(queryFilters, () => props.mode)
const teamAgentsQuery = useTeamAgentsQuery(isSupervisor)
const agentToolkitsQuery = useToolkitsQuery(() => !isSupervisor.value)
const managedToolkitsQuery = useManagedToolkitsQuery(isSupervisor)
const visibleToolkits = computed(() =>
  isSupervisor.value
    ? managedToolkitsQuery.data.value ?? []
    : agentToolkitsQuery.data.value ?? [],
)
const { setEnabled } = useTmsSessionMutations()
const togglingId = ref('')
const toggleTarget = ref<{ id: string; enabled: boolean } | null>(null)
const toggleOpen = ref(false)
const exportOpen = ref(false)
const exporting = ref(false)
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)
const toolkitAlignment = ref<TimesheetAlignmentView | null>(null)

function applySearch(values: TmsSessionFilterValues) {
  Object.assign(applied, values)
  pagination.page = 1
}

function clearFilters() {
  Object.assign(applied, emptyFilterValues())
  pagination.page = 1
}

function openToggle(id: string) {
  const session = sessionsQuery.data.value?.items.find((item) => item.id === id)
  toggleTarget.value = { id, enabled: session?.enabled !== false }
  toggleOpen.value = true
}

async function confirmToggle() {
  const target = toggleTarget.value
  if (!target) return
  togglingId.value = target.id
  const nextEnabled = !target.enabled
  try {
    await setEnabled.mutateAsync({ id: target.id, enabled: nextEnabled })
    toggleOpen.value = false
    toast.success(nextEnabled ? 'TMS session enabled.' : 'TMS session disabled.')
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : 'Could not update the session status.',
    )
  } finally {
    togglingId.value = ''
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

async function openToolkitInfo(session: TmsSession) {
  if (!session.toolkitId) {
    toast.error('Could not load toolkit info.')
    return
  }
  if (props.embedded) {
    emit('toolkitInfo', session.toolkitId)
    return
  }
  try {
    const toolkit = await queryClient.fetchQuery({
      queryKey: toolkitQueryKeys.detail(session.toolkitId),
      queryFn: () => toolkitApi.get(session.toolkitId),
    })
    toolkitSnapshot.value = snapshotFromToolkit(toolkit)
    toolkitAlignment.value = toolkit.alignment ?? null
    toolkitInfoOpen.value = true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkit info.')
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
    <Card :class="embedded ? 'overflow-visible bg-transparent py-0 ring-0' : undefined">
      <CardContent :class="embedded ? 'grid gap-3 px-0' : 'grid gap-4'">
        <TmsSessionFilters
          :show-team-filters="isSupervisor"
          :show-export="true"
          :exporting="exporting"
          :agents="teamAgentsQuery.data.value ?? []"
          :toolkits="visibleToolkits"
          @search="applySearch"
          @clear="clearFilters"
          @export="exportOpen = true"
        />

        <TmsSessionsTable
          :sessions="sessionsQuery.data.value?.items ?? []"
          :pending="sessionsQuery.isPending.value"
          :toggling-id="togglingId"
          :show-agent="isSupervisor"
          :show-toolkit-info="true"
          :can-toggle-enabled="isSupervisor"
          @toggle-enabled="openToggle"
          @open="openDetail"
          @toolkit-info="openToolkitInfo"
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

    <ToolkitInfoDialog
      v-if="!embedded"
      v-model:open="toolkitInfoOpen"
      :snapshot="toolkitSnapshot"
      :alignment="toolkitAlignment"
    />

    <ConfirmDialog
      v-if="isSupervisor"
      v-model:open="toggleOpen"
      :title="toggleTarget?.enabled ? 'Disable Session' : 'Enable Session'"
      :warning="
        toggleTarget?.enabled
          ? 'This completed session will be excluded from cycle time and will not occupy the same Toolkit, TASK and Reference.'
          : undefined
      "
      :description="
        toggleTarget?.enabled
          ? undefined
          : 'This completed session will be included in cycle time again and will occupy the same Toolkit, TASK and Reference.'
      "
      :rows="[{ label: 'Session No', value: toggleTarget?.id ?? '', strong: true }]"
      :confirm-label="toggleTarget?.enabled ? 'Disable' : 'Enable'"
      :confirm-variant="toggleTarget?.enabled ? 'destructive' : 'default'"
      :pending="Boolean(togglingId)"
      @confirm="confirmToggle"
    />
  </div>
</template>
