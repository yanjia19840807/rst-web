<script setup lang="ts">
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import ReadOnlyField from '@/components/ReadOnlyField.vue'
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
import type { SupervisorToolkit } from '@/features/toolkit-management/types'
import { showOperationNotices } from '@/composables/useOperationNotices'
import { formatDate } from '@/lib/datetime'

import { useExerciseMutations } from '../api/mutations'
import {
  SIZING_MONTH_HINT_DESCRIPTION,
  SLOT_PERIOD_HINT_DESCRIPTION,
  sizingHintLines,
  slotHintLines,
} from '../periodWindows'
import {
  createExercisePeriodsSchema,
  emptyCreateExercisePeriodsForm,
} from '../schemas/exercisePeriods'
import type { Exercise } from '../types'
import PeriodDerivedHints from './PeriodDerivedHints.vue'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  toolkits: SupervisorToolkit[]
  initialToolkitId?: string
}>()

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
const [slotStartDate] = defineField('slotStartDate')
const [slotWeeks] = defineField('slotWeeks')
const [tmsFrom] = defineField('tmsFrom')
const [tmsTo] = defineField('tmsTo')

const createdLabel = computed(() => formatDate(new Date()))
const sizingHints = computed(() => sizingHintLines(values.sizingMonth ?? ''))
const slotHints = computed(() =>
  slotHintLines(
    values.slotStartDate ?? '',
    typeof values.slotWeeks === 'number' ? values.slotWeeks : 0,
  ),
)
const formReady = computed(
  () =>
    Boolean(
      values.toolkitId &&
        values.sizingMonth &&
        values.slotStartDate &&
        values.slotWeeks &&
        values.tmsFrom &&
        values.tmsTo,
    ),
)

watch(open, (value) => {
  if (!value) return
  resetForm({
    values: emptyCreateExercisePeriodsForm(props.initialToolkitId ?? ''),
  })
})

const create = handleSubmit(async (formValues) => {
  try {
    const result = await createMutation.mutateAsync({
      toolkitId: formValues.toolkitId,
      sizingMonth: formValues.sizingMonth,
      slotStartDate: formValues.slotStartDate,
      slotWeeks: formValues.slotWeeks,
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
})
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
        <div class="rounded-lg border bg-card p-4">
          <div
            class="grid grid-cols-[minmax(120px,0.35fr)_1fr] items-center gap-x-3 gap-y-3 text-sm"
          >
            <span class="text-muted-foreground">Exercise No</span>
            <ReadOnlyField value="Assigned on create" />

            <span class="text-muted-foreground">Created</span>
            <ReadOnlyField :value="createdLabel" />

            <Label class="text-muted-foreground">Toolkit</Label>
            <div>
              <select
                v-model="toolkitId"
                class="h-9 max-w-xs rounded-md border border-input bg-card px-2.5 text-sm"
                :aria-invalid="Boolean(errors.toolkitId)"
              >
                <option value="">Select toolkit</option>
                <option v-for="toolkit in toolkits" :key="toolkit.id" :value="toolkit.id">
                  {{ toolkit.name }}
                </option>
              </select>
              <p v-if="errors.toolkitId" class="mt-1 text-xs text-destructive">
                {{ errors.toolkitId }}
              </p>
            </div>

            <div class="inline-flex items-center gap-1.5">
              <Label class="text-muted-foreground">Sizing Month</Label>
              <PeriodDerivedHints
                title="Sizing Month"
                :description="SIZING_MONTH_HINT_DESCRIPTION"
                :lines="sizingHints"
              />
            </div>
            <div>
              <MonthPicker
                v-model="sizingMonth"
                aria-label="Choose sizing month"
                placeholder="Select sizing month"
                class="w-[200px]"
              />
              <p v-if="errors.sizingMonth" class="mt-1 text-xs text-destructive">
                {{ errors.sizingMonth }}
              </p>
            </div>

            <div class="inline-flex items-center gap-1.5 self-start pt-2">
              <Label class="text-muted-foreground">Slot Period</Label>
              <PeriodDerivedHints
                title="Slot Period"
                :description="SLOT_PERIOD_HINT_DESCRIPTION"
                :lines="slotHints"
              />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-3">
                <div class="grid gap-1.5">
                  <span class="text-xs text-muted-foreground">Start date</span>
                  <DatePicker
                    v-model="slotStartDate"
                    aria-label="Choose slot start date"
                    placeholder="Select start date"
                    class="w-[180px]"
                  />
                </div>
                <label class="grid gap-1.5 text-xs text-muted-foreground">
                  Weeks
                  <select
                    v-model="slotWeeks"
                    class="h-9 w-20 rounded-md border border-input bg-card px-2 text-sm text-foreground"
                  >
                    <option value="">—</option>
                    <option v-for="week in 12" :key="week" :value="week">{{ week }}</option>
                  </select>
                </label>
              </div>
              <p
                v-if="errors.slotStartDate || errors.slotWeeks"
                class="mt-1 text-xs text-destructive"
              >
                {{ errors.slotStartDate || errors.slotWeeks }}
              </p>
            </div>

            <Label class="text-muted-foreground">TMS period</Label>
            <div>
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
              <p
                v-if="errors.tmsFrom || errors.tmsTo"
                class="mt-1 text-xs text-destructive"
              >
                {{ errors.tmsFrom || errors.tmsTo }}
              </p>
            </div>
          </div>

          <div
            class="mt-4 rounded-md bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-foreground"
          >
            Associated Data (Team Setup, Support, Calendar) will be initialized from the latest
            Approved archive for this Toolkit when available. Volume Input is pre-filled from
            Toolkit volume when available. Creating the Exercise freezes the current Toolkit,
            Subtasks, Shared KPI selections and Delivery HC from the ACTIVE Timesheet.
          </div>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button variant="outline" :disabled="busy" @click="open = false">Cancel</Button>
        <Button :disabled="busy || !formReady" @click="create">
          {{ busy ? 'Creating…' : 'Confirm' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
