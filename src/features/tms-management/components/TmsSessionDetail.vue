<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import DetailTable from '@/components/DetailTable.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useTmsSessionDetailQuery } from '../api/queries'
import { formatDuration } from '../composables/useTmsTimer'

const props = defineProps<{
  sessionId: string
}>()

const router = useRouter()
const detailQuery = useTmsSessionDetailQuery(() => props.sessionId)

const session = computed(() => detailQuery.data.value ?? null)

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function cycleTimeLabel() {
  const item = session.value
  if (!item?.processedVolume) return '—'
  return `${Math.round(item.netDurationSeconds / item.processedVolume)}s`
}

const rows = computed(() => {
  const item = session.value
  if (!item) return []
  return [
    { label: 'Session No', value: item.id, strong: true },
    { label: 'Status', value: item.status },
    { label: 'Toolkit', value: item.toolkitName },
    { label: 'Subtask', value: item.subtaskName || '—' },
    { label: 'Start', value: formatDate(item.startedAt) },
    { label: 'End', value: formatDate(item.endedAt) },
    { label: 'Duration', value: formatDuration(item.netDurationSeconds) },
    { label: 'Cycle Time', value: cycleTimeLabel() },
    { label: 'Volume', value: item.processedVolume ?? '—' },
    { label: 'Reference', value: item.reference || '—' },
    { label: 'Remarks', value: item.remarks || '—' },
  ]
})
</script>

<template>
  <div class="grid gap-4">
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="router.push({ name: 'agent-sessions' })"
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
