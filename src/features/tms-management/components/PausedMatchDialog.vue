<script setup lang="ts">
import { computed } from 'vue'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import DetailTable from '@/components/DetailTable.vue'
import { Spinner } from '@/components/ui/spinner'
import { formatInstantForCenter } from '@/lib/datetime'

import { formatDuration } from '../composables/useTmsTimer'
import type { TmsSession } from '../types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  session: TmsSession | null
  matchCount?: number
  pending?: boolean
}>()

const emit = defineEmits<{
  resume: []
}>()

const extraCount = computed(() => Math.max(0, (props.matchCount ?? 0) - 1))

const rows = computed(() => {
  const item = props.session
  if (!item) return []
  return [
    { label: 'Session No', value: item.id, strong: true },
    { label: 'Toolkit', value: item.toolkitName || '—' },
    { label: 'Subtask', value: item.subtaskName || '—' },
    { label: 'Reference', value: item.reference || '—' },
    { label: 'Duration', value: formatDuration(item.netDurationSeconds) },
    { label: 'Paused', value: formatInstantForCenter(item.pausedAt, item.center) },
  ]
})

function onResume(event: Event) {
  event.preventDefault()
  emit('resume')
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Paused session found</AlertDialogTitle>
        <AlertDialogDescription>
          You already have a paused session for this Toolkit, TASK and Reference. Resume it, or
          cancel and discard it from Paused Sessions if it is no longer needed.
          <template v-if="extraCount > 0">
            {{ extraCount }} more paused session{{ extraCount === 1 ? '' : 's' }} share this key.
            Resume or discard the extras from Paused Sessions.
          </template>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <DetailTable v-if="rows.length" :rows="rows" />

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="pending">Cancel</AlertDialogCancel>
        <AlertDialogAction
          :disabled="pending"
          :aria-busy="pending || undefined"
          @click="onResume"
        >
          <Spinner v-if="pending" />
          Resume
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
