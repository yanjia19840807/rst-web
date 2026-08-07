<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useTmsSessionMutations } from '../api/mutations'
import { useCurrentSessionQuery, useTmsSummaryQuery, useToolkitsQuery } from '../api/queries'
import { useTmsTimer } from '../composables/useTmsTimer'
import { sessionSchema, type SessionFormValues } from '../schemas/session'
import { useTmsSessionStore } from '../stores/session'
import CurrentSessionForm from './CurrentSessionForm.vue'
import PausedSessionsDialog from './PausedSessionsDialog.vue'
import SessionTimer from './SessionTimer.vue'

const toolkitsQuery = useToolkitsQuery()
const summaryQuery = useTmsSummaryQuery()
const currentQuery = useCurrentSessionQuery()
const mutations = useTmsSessionMutations()
const sessionStore = useTmsSessionStore()
const { currentSession } = storeToRefs(sessionStore)
const { formattedElapsed } = useTmsTimer(currentSession)

const { defineField, errors, handleSubmit, setFieldValue, resetField } = useForm<SessionFormValues>(
  {
    validationSchema: toTypedSchema(sessionSchema),
    initialValues: {
      toolkitId: '',
      subtaskId: '',
      processedVolume: 25,
      reference: '',
      remarks: '',
    },
  },
)

const [toolkitId] = defineField('toolkitId')
const [subtaskId] = defineField('subtaskId')
const [processedVolume] = defineField('processedVolume')
const [reference] = defineField('reference')
const [remarks] = defineField('remarks')
const pausedDialogOpen = ref(false)

const selectedToolkit = computed(() =>
  toolkitsQuery.data.value?.find((toolkit) => toolkit.id === toolkitId.value),
)

const toolkitDetailRows = computed(() => {
  if (!selectedToolkit.value) return []
  return [
    { label: 'Toolkit', value: selectedToolkit.value.name, strong: true },
    { label: 'GBS Center', value: selectedToolkit.value.center },
    { label: 'Domain', value: selectedToolkit.value.domain },
    { label: 'Process Level 1', value: selectedToolkit.value.pl1 },
    { label: 'Process Level 2', value: selectedToolkit.value.pl2 },
    { label: 'Process Level 3', value: selectedToolkit.value.pl3Name },
    {
      label: 'Timing mode',
      value: selectedToolkit.value.combineSubtasksTime
        ? 'Combined Subtasks Time'
        : 'Per Subtask',
    },
  ]
})

const sessionReadOnly = computed(() => Boolean(currentSession.value))

const busy = computed(
  () =>
    mutations.start.isPending.value ||
    mutations.pause.isPending.value ||
    mutations.resume.isPending.value ||
    mutations.discard.isPending.value ||
    mutations.end.isPending.value,
)

watch(
  currentQuery.data,
  (session) => {
    sessionStore.setCurrentSession(session ?? null)
    if (!session) return
    setFieldValue('toolkitId', session.toolkitId)
    setFieldValue('subtaskId', session.subtaskId)
    setFieldValue('processedVolume', session.processedVolume)
    setFieldValue('reference', session.reference)
    setFieldValue('remarks', session.remarks)
  },
  { immediate: true },
)

watch(
  () => toolkitsQuery.data.value,
  (toolkits) => {
    if (!toolkits?.length || toolkitId.value) return
    setFieldValue('toolkitId', toolkits[0]?.id ?? '')
  },
  { immediate: true },
)

watch(
  [toolkitId, () => toolkitsQuery.data.value],
  () => {
    const availableSubtasks =
      selectedToolkit.value?.subtasks.filter((item) => !item.deletedAt) ?? []
    if (!availableSubtasks.some((item) => item.id === subtaskId.value)) {
      setFieldValue('subtaskId', availableSubtasks[0]?.id ?? '')
    }
  },
  { immediate: true },
)

const startSession = handleSubmit(async (values) => {
  try {
    const session = await mutations.start.mutateAsync(values)
    sessionStore.setCurrentSession(session)
    toast.success('New session started.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not start the session.')
  }
})

async function pauseSession() {
  if (!currentSession.value) return
  try {
    const session = await mutations.pause.mutateAsync(currentSession.value.id)
    sessionStore.setCurrentSession(session)
    toast.success('Session paused. Resume it from Timer or manage paused sessions from the list.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not pause the session.')
  }
}

async function resumeSession() {
  if (!currentSession.value) return
  try {
    const session = await mutations.resume.mutateAsync(currentSession.value.id)
    sessionStore.setCurrentSession(session)
    toast.success('Session resumed.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not resume the session.')
  }
}

async function endSession() {
  if (!currentSession.value) return
  try {
    await mutations.end.mutateAsync(currentSession.value.id)
    sessionStore.setCurrentSession(null)
    resetField('reference')
    resetField('remarks')
    toast.success('Session ended and saved to the TMS list.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not end the session.')
  }
}

function onToolkitChange(event: Event) {
  if (sessionReadOnly.value) return
  setFieldValue('toolkitId', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="grid gap-4">
    <div class="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader class="items-center">
          <CardTitle>Current Toolkit</CardTitle>
          <CardAction>
            <select
              :value="toolkitId"
              :disabled="sessionReadOnly || !(toolkitsQuery.data.value?.length)"
              class="h-8 min-w-[190px] rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              @change="onToolkitChange"
            >
              <option v-for="toolkit in toolkitsQuery.data.value ?? []" :key="toolkit.id" :value="toolkit.id">
                {{ toolkit.name }}
              </option>
            </select>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DetailTable v-if="selectedToolkit" :rows="toolkitDetailRows" />
          <p v-else class="text-sm text-muted-foreground">
            {{
              toolkitsQuery.isLoading.value
                ? 'Loading toolkit details…'
                : 'No active Toolkit matches your current ACTIVE Timesheet assignment.'
            }}
          </p>
          <p v-if="errors.toolkitId" class="mt-2 text-xs text-destructive">{{ errors.toolkitId }}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Summary</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border p-4">
            <p class="text-xs text-muted-foreground">Sessions today</p>
            <p class="mt-2 text-3xl font-bold">
              {{ summaryQuery.data.value?.sessionsToday ?? '—' }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">Completed timing entries</p>
          </div>
          <div class="rounded-lg border p-4">
            <p class="text-xs text-muted-foreground">Total volume</p>
            <p class="mt-2 text-3xl font-bold">{{ summaryQuery.data.value?.totalVolume ?? '—' }}</p>
            <p class="mt-1 text-xs text-muted-foreground">Across all sessions</p>
          </div>
          <div class="rounded-lg border p-4">
            <p class="text-xs text-muted-foreground">Paused Sessions</p>
            <p class="mt-2 text-3xl font-bold">
              {{ summaryQuery.data.value?.pausedSessions ?? '—' }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">Currently paused by you</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
      <CurrentSessionForm
        v-model:subtask-id="subtaskId"
        v-model:processed-volume="processedVolume"
        v-model:reference="reference"
        v-model:remarks="remarks"
        :toolkit-id="toolkitId"
        :toolkits="toolkitsQuery.data.value ?? []"
        :errors="errors"
        :read-only="sessionReadOnly"
        :paused-count="summaryQuery.data.value?.pausedSessions ?? 0"
        @open-paused="pausedDialogOpen = true"
      />
      <SessionTimer
        :session="currentSession"
        :elapsed="formattedElapsed"
        :busy="busy"
        @start="startSession()"
        @pause="pauseSession"
        @resume="resumeSession"
        @end="endSession"
      />
    </div>

    <PausedSessionsDialog
      v-model:open="pausedDialogOpen"
      :has-running-session="Boolean(currentSession)"
    />
  </div>
</template>
