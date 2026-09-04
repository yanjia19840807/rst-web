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
import { formatDateTime } from '@/lib/datetime'

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
  startNew: []
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
    { label: 'Paused', value: formatDateTime(item.pausedAt) },
  ]
})

function onResume(event: Event) {
  event.preventDefault()
  emit('resume')
}

function onStartNew(event: Event) {
  event.preventDefault()
  emit('startNew')
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Paused session found</AlertDialogTitle>
        <AlertDialogDescription>
          You already have a paused session for this Toolkit and reference. Resume it, or start a new
          session.
          <template v-if="extraCount > 0">
            {{ extraCount }} more paused session{{ extraCount === 1 ? '' : 's' }} share this
            reference.
          </template>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <DetailTable v-if="rows.length" :rows="rows" />

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="pending">Cancel</AlertDialogCancel>
        <AlertDialogAction variant="outline" :disabled="pending" @click="onStartNew">
          Start New
        </AlertDialogAction>
        <AlertDialogAction :disabled="pending" @click="onResume">Resume</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
