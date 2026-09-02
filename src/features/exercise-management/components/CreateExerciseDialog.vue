<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
import ReadOnlyField from '@/components/ReadOnlyField.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MonthPicker } from '@/components/ui/month-picker'
import TimesheetAlignmentAlert from '@/features/timesheet-alignment/components/TimesheetAlignmentAlert.vue'
import { formatHc } from '@/lib/hcFormat'
import type { SupervisorToolkit } from '@/features/toolkit-management/types'
import { showOperationNotices } from '@/composables/useOperationNotices'
import { formatDate } from '@/lib/datetime'

import { useExerciseMutations } from '../api/mutations'
import {
  SIZING_MONTH_HINT_DESCRIPTION,
  TMS_PERIOD_HINT_DESCRIPTION,
  sizingHintLines,
  tmsHintLines,
} from '../periodWindows'
import {
  createExercisePeriodsSchema,
  emptyCreateExercisePeriodsForm,
} from '../schemas/exercisePeriods'
import type { Exercise } from '../types'
import PeriodDerivedHints from './PeriodDerivedHints.vue'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    toolkits: SupervisorToolkit[]
    initialToolkitId?: string
    lockToolkit?: boolean
  }>(),
  {
    initialToolkitId: undefined,
    lockToolkit: false,
  },
)

const emit = defineEmits<{
  created: [exercise: Exercise]
}>()

const { create: createMutation } = useExerciseMutations()
const busy = computed(() => createMutation.isPending.value)

const { defineField, errors, handleSubmit, resetForm, values } = useForm({
  validationSchema: toTypedSchema(createExercisePeriodsSchema),
  initialValues: emptyCreateExercisePeriodsForm(),
  validateOnMount: false,
})

const [toolkitId] = defineField('toolkitId')
const [sizingMonth] = defineField('sizingMonth')
const [tmsFrom] = defineField('tmsFrom')
const [tmsTo] = defineField('tmsTo')

const lockedToolkit = computed(
  () => props.toolkits.find((toolkit) => toolkit.id === (toolkitId.value || props.initialToolkitId)),
)
const selectedToolkit = computed(
  () => props.toolkits.find((toolkit) => toolkit.id === toolkitId.value) ?? lockedToolkit.value,
)
const toolkitBlocked = computed(() => Boolean(selectedToolkit.value?.outOfSync))
const freezeHc = computed(() =>
  formatHc(selectedToolkit.value?.alignment?.currentDeliveryHc, 2),
)
const freezeSyncDate = computed(
  () => selectedToolkit.value?.alignment?.currentMonthlySyncDate || '',
)
const createdLabel = computed(() => formatDate(new Date()))
const sizingHints = computed(() => sizingHintLines(values.sizingMonth ?? ''))
const tmsHints = computed(() => tmsHintLines(values.tmsFrom ?? '', values.tmsTo ?? ''))

watch(open, (value) => {
  if (!value) return
  resetForm({
    values: emptyCreateExercisePeriodsForm(props.initialToolkitId ?? ''),
  })
})

const create = handleSubmit(
  async (formValues) => {
    if (toolkitBlocked.value) {
      toast.error('Reconfigure this Toolkit before creating an Exercise.')
      return
    }
    try {
      const result = await createMutation.mutateAsync({
        toolkitId: formValues.toolkitId,
        sizingMonth: formValues.sizingMonth,
        tmsFrom: formValues.tmsFrom,
        tmsTo: formValues.tmsTo,
      })
      emit('created', result.exercise)
      open.value = false
      const summary = `${result.exercise.exerciseCode} created with a frozen snapshot.`
      const shown = showOperationNotices({
        summary,
        notices: result.notices ?? [],
      })
      if (!shown) toast.success(summary)
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Exercise could not be created.'
      toast.error(message)
    }
  },
  ({ errors: submitErrors }) => {
    const first = Object.values(submitErrors).find((message) => Boolean(message))
    toast.error(
      typeof first === 'string' ? first : 'Complete the toolkit and period fields.',
    )
  },
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Create New Exercise</DialogTitle>
        <DialogDescription>
          Multiple In Progress exercises are allowed for the same Toolkit.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div class="grid gap-4 rounded-lg border bg-card p-4">
          <Alert variant="info">
            <Info />
            <AlertDescription>
              Associated Data (Team Setup, Support, Calendar) will be initialized from Toolkit
              latest state when available. Volume Input is pre-filled from Toolkit volume when
              available. Creating the Exercise freezes the current Toolkit,
              Subtasks, Shared KPI selections and Delivery HC from the ACTIVE Timesheet.
              <template v-if="selectedToolkit && !toolkitBlocked">
                Delivery HC to freeze: {{ freezeHc }}
                <template v-if="freezeSyncDate">
                  (ACTIVE Monthly sync {{ freezeSyncDate }}).
                </template>
              </template>
            </AlertDescription>
          </Alert>

          <TimesheetAlignmentAlert audience="create" :alignment="selectedToolkit?.alignment" />

          <DetailTable
            :rows="[
              { label: 'Exercise No', value: 'Assigned on create' },
              { label: 'Created', value: createdLabel },
            ]"
          />

          <div class="grid gap-1.5">
            <Label :for="lockToolkit ? undefined : 'create-exercise-toolkit'">Toolkit</Label>
            <ReadOnlyField v-if="lockToolkit" :value="lockedToolkit?.name" strong />
            <template v-else>
              <select
                id="create-exercise-toolkit"
                v-model="toolkitId"
                class="h-9 max-w-xs rounded-md border border-input bg-card px-2.5 text-sm"
                :aria-invalid="Boolean(errors.toolkitId)"
              >
                <option value="">Select toolkit</option>
                <option
                  v-for="toolkit in toolkits"
                  :key="toolkit.id"
                  :value="toolkit.id"
                  :disabled="toolkit.outOfSync"
                >
                  {{ toolkit.name }}{{ toolkit.outOfSync ? ' (scope changed)' : '' }}
                </option>
              </select>
              <p v-if="errors.toolkitId" class="text-xs text-destructive">
                {{ errors.toolkitId }}
              </p>
            </template>
          </div>

          <div class="grid gap-1.5">
            <div class="inline-flex items-center gap-1.5">
              <Label>Sizing Month</Label>
              <PeriodDerivedHints
                title="Sizing Month"
                :description="SIZING_MONTH_HINT_DESCRIPTION"
                :lines="sizingHints"
              />
            </div>
            <MonthPicker
              v-model="sizingMonth"
              aria-label="Choose sizing month"
              placeholder="Select sizing month"
              class="w-[200px]"
            />
            <p v-if="errors.sizingMonth" class="text-xs text-destructive">
              {{ errors.sizingMonth }}
            </p>
          </div>

          <div class="grid gap-1.5">
            <div class="inline-flex items-center gap-1.5">
              <Label>TMS period</Label>
              <PeriodDerivedHints
                title="TMS period"
                :description="TMS_PERIOD_HINT_DESCRIPTION"
                :lines="tmsHints"
              />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <DatePicker
                v-model="tmsFrom"
                aria-label="Choose TMS period start"
                placeholder="From"
                class="w-[180px]"
              />
              <span class="text-muted-foreground">to</span>
              <DatePicker
                v-model="tmsTo"
                aria-label="Choose TMS period end"
                placeholder="To"
                class="w-[180px]"
              />
            </div>
            <p v-if="errors.tmsFrom || errors.tmsTo" class="text-xs text-destructive">
              {{ errors.tmsFrom || errors.tmsTo }}
            </p>
          </div>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button variant="outline" :disabled="busy" @click="open = false">Cancel</Button>
        <Button :disabled="busy || toolkitBlocked" @click="create">
          {{ busy ? 'Creating…' : 'Confirm' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
