<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { joinCommaTokens } from '@/lib/commaTokens'
import { formatInstantForCenter } from '@/lib/datetime'

import { useTmsSessionMutations } from '../api/mutations'
import { useTmsSessionDetailQuery } from '../api/queries'
import { formatDuration } from '../composables/useTmsTimer'
import { cycleTime, formatSessionVolume } from './tmsSessionColumns'
import type { TmsListMode } from '../types'

const props = withDefaults(
  defineProps<{
    sessionId: string
    mode?: TmsListMode
    embedded?: boolean
  }>(),
  { mode: 'agent', embedded: false },
)

const router = useRouter()
const detailQuery = useTmsSessionDetailQuery(
  () => props.sessionId,
  () => props.mode,
)

const session = computed(() => detailQuery.data.value ?? null)
const isSupervisor = computed(() => props.mode === 'supervisor')
const { setEnabled } = useTmsSessionMutations()
const canToggleEnabled = computed(
  () => isSupervisor.value && session.value?.status === 'completed',
)
const isEnabled = computed(() => session.value?.enabled !== false)
const toggleOpen = ref(false)

function cycleTimeLabel() {
  const item = session.value
  if (!item) return '—'
  return cycleTime(item)
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
    { label: 'GBS Center', value: item.center || '—' },
    { label: 'Domain', value: item.domain || '—' },
    { label: 'PL1', value: item.pl1 || '—' },
    { label: 'PL2', value: item.pl2 || '—' },
    { label: 'PL3', value: item.pl3 || '—' },
    { label: 'Carrier', value: item.carriers?.filter(Boolean).join(', ') || '—' },
    { label: 'GBS Site', value: item.sites?.filter(Boolean).join(', ') || '—' },
    { label: 'Customer Country', value: joinCommaTokens(item.customerCountries) || '—' },
    { label: 'Subtask', value: item.subtaskName || '—' },
    { label: 'Start', value: formatInstantForCenter(item.startedAt, item.center) },
    { label: 'End', value: formatInstantForCenter(item.endedAt, item.center) },
    { label: 'Duration', value: formatDuration(item.netDurationSeconds) },
    { label: 'Cycle Time', value: cycleTimeLabel() },
    { label: 'Volume', value: formatSessionVolume(item.processedVolume) },
    { label: 'Reference', value: item.reference || '—' },
    { label: 'Remarks', value: item.remarks || '—' },
  )
  return base
})

async function confirmToggle() {
  const item = session.value
  if (!item) return
  const nextEnabled = !isEnabled.value
  try {
    await setEnabled.mutateAsync({ id: item.id, enabled: nextEnabled })
    toggleOpen.value = false
    toast.success(nextEnabled ? 'TMS session enabled.' : 'TMS session disabled.')
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : 'Could not update the session status.',
    )
  }
}

function goBack() {
  void router.push({
    name: isSupervisor.value ? 'supervisor-sessions' : 'agent-session',
  })
}
</script>

<template>
  <div class="grid gap-4">
    <PageActions v-if="!embedded">
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="goBack"
        >
          {{ isSupervisor ? '← Back to Team TMS' : '← Back to TMS Session' }}
        </Button>
      </template>
      <template v-if="canToggleEnabled">
        <Button
          :variant="isEnabled ? 'destructive' : 'default'"
          :disabled="setEnabled.isPending.value"
          @click="toggleOpen = true"
        >
          {{ isEnabled ? 'Disable' : 'Enable' }}
        </Button>
      </template>
    </PageActions>

    <Card :class="embedded ? 'bg-transparent py-0 ring-0' : undefined">
      <CardContent :class="embedded ? 'px-0' : undefined">
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
        <DetailTable v-else :rows="rows" />
      </CardContent>
    </Card>

    <ConfirmDialog
      v-if="canToggleEnabled"
      v-model:open="toggleOpen"
      :title="isEnabled ? 'Disable Session' : 'Enable Session'"
      :warning="
        isEnabled
          ? 'This completed session will be excluded from cycle time and will not occupy the same Toolkit, TASK and Reference.'
          : undefined
      "
      :description="
        isEnabled
          ? undefined
          : 'This completed session will be included in cycle time again and will occupy the same Toolkit, TASK and Reference.'
      "
      :rows="[{ label: 'Session No', value: session?.id ?? '', strong: true }]"
      :confirm-label="isEnabled ? 'Disable' : 'Enable'"
      :confirm-variant="isEnabled ? 'destructive' : 'default'"
      :pending="setEnabled.isPending.value"
      @confirm="confirmToggle"
    />
  </div>
</template>
