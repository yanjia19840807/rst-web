<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import DetailTable from '@/components/DetailTable.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useTmsSessionDetailQuery } from '../api/queries'
import { formatDuration } from '../composables/useTmsTimer'
import type { TmsListMode } from '../types'
import { formatDate } from '@/lib/datetime'

const props = withDefaults(
  defineProps<{
    sessionId: string
    mode?: TmsListMode
  }>(),
  { mode: 'agent' },
)

const router = useRouter()
const detailQuery = useTmsSessionDetailQuery(
  () => props.sessionId,
  () => props.mode,
)

const session = computed(() => detailQuery.data.value ?? null)
const isSupervisor = computed(() => props.mode === 'supervisor')

function cycleTimeLabel() {
  const item = session.value
  if (!item?.processedVolume) return '—'
  return `${Math.round(item.netDurationSeconds / item.processedVolume)}s`
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
    { label: 'Toolkit', value: item.toolkitName },
    { label: 'Subtask', value: item.subtaskName || '—' },
    { label: 'Start', value: formatDate(item.startedAt) },
    { label: 'End', value: formatDate(item.endedAt) },
    { label: 'Duration', value: formatDuration(item.netDurationSeconds) },
    { label: 'Cycle Time', value: cycleTimeLabel() },
    { label: 'Volume', value: item.processedVolume == null ? '—' : Number(item.processedVolume).toFixed(2) },
    { label: 'Reference', value: item.reference || '—' },
    { label: 'Remarks', value: item.remarks || '—' },
  )
  return base
})

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
        <p v-if="detailQuery.isPending.value" class="py-6 text-center text-sm text-muted-foreground">
          Loading…
        </p>
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
        <DetailTable v-else :rows="rows" />
      </CardContent>
    </Card>
  </div>
</template>
