<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useTmsSessionMutations } from '../api/mutations'
import {
  useSupervisorToolkitsQuery,
  useTeamAgentsQuery,
  useTmsSessionsQuery,
} from '../api/queries'
import type { TmsListMode } from '../types'
import TmsSessionFilters from './TmsSessionFilters.vue'
import TmsSessionsTable from './TmsSessionsTable.vue'

const props = withDefaults(
  defineProps<{
    mode?: TmsListMode
  }>(),
  { mode: 'agent' },
)

const router = useRouter()
const isSupervisor = computed(() => props.mode === 'supervisor')

const filters = reactive({
  status: 'completed' as const,
  sessionNo: '',
  reference: '',
  dateFrom: '',
  dateTo: '',
  agentCcgid: '',
  toolkitId: '',
  pl3Code: '',
  page: 1,
  pageSize: 10,
})
const queryFilters = computed(() => ({ ...filters }))
const sessionsQuery = useTmsSessionsQuery(queryFilters, () => props.mode)
const teamAgentsQuery = useTeamAgentsQuery(isSupervisor)
const toolkitsQuery = useSupervisorToolkitsQuery(isSupervisor)
const { discard } = useTmsSessionMutations()
const deletingId = ref('')
const deleteTargetId = ref('')
const deleteOpen = ref(false)

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

const hasActiveFilters = computed(
  () =>
    Boolean(
      filters.sessionNo ||
        filters.reference ||
        filters.dateFrom ||
        filters.dateTo ||
        filters.agentCcgid ||
        filters.toolkitId ||
        filters.pl3Code,
    ),
)

watch(
  () => [
    filters.sessionNo,
    filters.reference,
    filters.dateFrom,
    filters.dateTo,
    filters.agentCcgid,
    filters.toolkitId,
    filters.pl3Code,
  ],
  () => {
    filters.page = 1
  },
)

function clearFilters() {
  filters.sessionNo = ''
  filters.reference = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.agentCcgid = ''
  filters.toolkitId = ''
  filters.pl3Code = ''
  filters.page = 1
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

function openDetail(id: string) {
  void router.push({
    name: isSupervisor.value ? 'supervisor-session-detail' : 'agent-session-detail',
    params: { id },
  })
}
</script>

<template>
  <Card>
    <CardHeader class="items-baseline">
      <CardTitle>{{ isSupervisor ? 'Team TMS Sessions' : 'My TMS Sessions' }}</CardTitle>
      <CardAction v-if="hasActiveFilters">
        <Button variant="ghost" size="sm" class="text-primary" @click="clearFilters">
          Clear All
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent class="grid gap-4">
      <TmsSessionFilters
        v-model:session-no="filters.sessionNo"
        v-model:reference="filters.reference"
        v-model:date-from="filters.dateFrom"
        v-model:date-to="filters.dateTo"
        v-model:agent-ccgid="filters.agentCcgid"
        v-model:toolkit-id="filters.toolkitId"
        v-model:pl3-code="filters.pl3Code"
        :show-team-filters="isSupervisor"
        :agents="teamAgentsQuery.data.value ?? []"
        :toolkits="toolkitsQuery.data.value ?? []"
        :pl3-options="pl3Options"
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
        :page="filters.page"
        :page-size="filters.pageSize"
        label="sessions"
        @update:page="filters.page = $event"
        @update:page-size="
          (size) => {
            filters.pageSize = size
            filters.page = 1
          }
        "
      />
    </CardContent>
  </Card>

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
</template>
