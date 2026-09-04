<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import { infoHintButtonClass, infoHintIconClass } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import type { Exercise } from '@/features/exercise-management/types'
import type { TimesheetAlignmentView } from '@/features/timesheet-alignment/types'
import { toolkitApi } from '@/features/toolkit-management/api'
import { toolkitQueryKeys } from '@/features/toolkit-management/api/queries'
import type { SupervisorToolkit } from '@/features/toolkit-management/types'
import { formatDate } from '@/lib/datetime'

import { useTmsSessionDetailQuery } from '../api/queries'
import { formatDuration } from '../composables/useTmsTimer'
import { formatSessionVolume } from './tmsSessionColumns'
import type { TmsListMode } from '../types'

const props = withDefaults(
  defineProps<{
    sessionId: string
    mode?: TmsListMode
  }>(),
  { mode: 'agent' },
)

const router = useRouter()
const queryClient = useQueryClient()
const detailQuery = useTmsSessionDetailQuery(
  () => props.sessionId,
  () => props.mode,
)

const session = computed(() => detailQuery.data.value ?? null)
const isSupervisor = computed(() => props.mode === 'supervisor')
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)
const toolkitAlignment = ref<TimesheetAlignmentView | null>(null)
const toolkitInfoPending = ref(false)

function cycleTimeLabel() {
  const item = session.value
  if (!item) return '—'
  const volume = Number(item.processedVolume)
  const divisor = Number.isFinite(volume) && volume > 0 ? volume : 1
  return `${Math.round(item.netDurationSeconds / divisor)}s`
}

const rows = computed(() => {
  const item = session.value
  if (!item) return []
  const base = [
    { label: 'Session No', value: item.id, strong: true },
    { label: 'Status', value: item.status },
  ]
  if (isSupervisor.value) {
    base.push({
      label: 'Agent',
      value: item.agentName
        ? item.agentCcgid
          ? `${item.agentName} (${item.agentCcgid})`
          : item.agentName
        : '—',
    })
  }
  base.push(
    { key: 'toolkit', label: 'Toolkit', value: item.toolkitName },
    { label: 'Subtask', value: item.subtaskName || '—' },
    { label: 'Start', value: formatDate(item.startedAt) },
    { label: 'End', value: formatDate(item.endedAt) },
    { label: 'Duration', value: formatDuration(item.netDurationSeconds) },
    { label: 'Cycle Time', value: cycleTimeLabel() },
    { label: 'Volume', value: formatSessionVolume(item.processedVolume) },
    { label: 'Reference', value: item.reference || '—' },
    { label: 'Remarks', value: item.remarks || '—' },
  )
  return base
})

function snapshotFromToolkit(toolkit: SupervisorToolkit): Exercise['snapshot'] {
  return {
    toolkit: {
      id: toolkit.id,
      name: toolkit.name,
      center: toolkit.center,
      domain: toolkit.domain,
      pl1: toolkit.pl1,
      pl2: toolkit.pl2,
      pl3Code: toolkit.pl3Code,
      pl3Name: toolkit.pl3Name,
      combineSubtasksTime: toolkit.combineSubtasksTime,
      version: toolkit.version,
    },
    subtasks: toolkit.subtasks,
    sharedKpis: toolkit.sharedKpiSelections.map((selection, index) => {
      const match = toolkit.alignment?.lines.find(
        (line) =>
          line.carrier === selection.carrier &&
          line.site === selection.site &&
          line.customerCountry === selection.customerCountry,
      )
      return {
        id: `${selection.carrier}-${selection.site}-${selection.customerCountry}-${index}`,
        sourceSelectionId: null,
        carrier: selection.carrier,
        site: selection.site,
        customerCountry: selection.customerCountry,
        deliveryHc: Number(match?.currentDeliveryHc ?? 0),
        valid: !match?.missing,
      }
    }),
    timesheetSyncDate: toolkit.alignment?.currentMonthlySyncDate ?? '',
  }
}

async function openToolkitInfo() {
  const toolkitId = session.value?.toolkitId
  if (!toolkitId || toolkitInfoPending.value) return
  toolkitInfoPending.value = true
  try {
    const toolkit = await queryClient.fetchQuery({
      queryKey: toolkitQueryKeys.detail(toolkitId),
      queryFn: () => toolkitApi.get(toolkitId),
    })
    toolkitSnapshot.value = snapshotFromToolkit(toolkit)
    toolkitAlignment.value = toolkit.alignment ?? null
    toolkitInfoOpen.value = true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkit info.')
  } finally {
    toolkitInfoPending.value = false
  }
}

function goBack() {
  void router.push({
    name: isSupervisor.value ? 'supervisor-sessions' : 'agent-sessions',
  })
}
</script>

<template>
  <div class="grid gap-4">
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="goBack"
        >
          ← Back to TMS List
        </Button>
      </template>
    </PageActions>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">TMS Session Detail</CardTitle>
      </CardHeader>
      <CardContent>
        <ListLoading v-if="detailQuery.isPending.value" />
        <p
          v-else-if="detailQuery.isError.value"
          class="py-6 text-center text-sm text-destructive"
        >
          {{
            detailQuery.error.value instanceof Error
              ? detailQuery.error.value.message
              : 'Could not load the session.'
          }}
        </p>
        <DetailTable v-else :rows="rows">
          <template #toolkit="{ row }">
            <span class="inline-flex items-center gap-1.5">
              <span>{{ row.value || '—' }}</span>
              <button
                type="button"
                :class="infoHintButtonClass"
                title="Toolkit info"
                :disabled="toolkitInfoPending || !session?.toolkitId"
                @click="openToolkitInfo"
              >
                <Info :class="infoHintIconClass" />
                <span class="sr-only">Toolkit info</span>
              </button>
            </span>
          </template>
        </DetailTable>
      </CardContent>
    </Card>

    <ToolkitInfoDialog
      v-model:open="toolkitInfoOpen"
      :snapshot="toolkitSnapshot"
      :alignment="toolkitAlignment"
    />
  </div>
</template>
