<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
import { showOperationNotices } from '@/composables/useOperationNotices'

import { useExerciseMutations } from '../api/mutations'
import {
  SIZING_MONTH_HINT_DESCRIPTION,
  SLOT_PERIOD_HINT_DESCRIPTION,
  TMS_PERIOD_HINT_DESCRIPTION,
  sizingHintLines,
  slotHintLines,
  tmsHintLines,
} from '../periodWindows'
import {
  editExercisePeriodsSchema,
  emptyEditExercisePeriodsForm,
} from '../schemas/exercisePeriods'
import type { Exercise } from '../types'
import PeriodDerivedHints from './PeriodDerivedHints.vue'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  exercise: Exercise
}>()

const emit = defineEmits<{
  saved: [exercise: Exercise]
}>()

const { updatePeriods } = useExerciseMutations()
const busy = computed(() => updatePeriods.isPending.value)
const confirmOpen = ref(false)

const { defineField, errors, handleSubmit, resetForm, values } = useForm({
  validationSchema: toTypedSchema(editExercisePeriodsSchema),
  initialValues: emptyEditExercisePeriodsForm(),
  validateOnMount: false,
})

const [sizingMonth] = defineField('sizingMonth')
const [slotStartDate] = defineField('slotStartDate')
const [slotWeeks] = defineField('slotWeeks')
const [tmsFrom] = defineField('tmsFrom')
const [tmsTo] = defineField('tmsTo')

const sizingHints = computed(() => sizingHintLines(values.sizingMonth ?? ''))
const slotHints = computed(() =>
  slotHintLines(values.slotStartDate ?? '', Number(values.slotWeeks) || 0),
)
const tmsHints = computed(() => tmsHintLines(values.tmsFrom ?? '', values.tmsTo ?? ''))

const periodsChanged = computed(() => {
  const ex = props.exercise
  return (
    (values.sizingMonth ?? '') !== ex.sizingMonth ||
    (values.slotStartDate ?? '') !== ex.slotStartDate ||
    Number(values.slotWeeks) !== Number(ex.slotWeeks) ||
    (values.tmsFrom ?? '') !== ex.tmsFrom ||
    (values.tmsTo ?? '') !== ex.tmsTo
  )
})

watch(open, (value) => {
  if (!value) return
  confirmOpen.value = false
  resetForm({
    values: {
      sizingMonth: props.exercise.sizingMonth,
      slotStartDate: props.exercise.slotStartDate,
      slotWeeks: props.exercise.slotWeeks,
      tmsFrom: props.exercise.tmsFrom,
      tmsTo: props.exercise.tmsTo,
    },
  })
})

const requestSave = handleSubmit(() => {
  if (!periodsChanged.value) {
    open.value = false
    return
  }
  confirmOpen.value = true
})

async function confirmSave() {
  try {
    const result = await updatePeriods.mutateAsync({
      id: props.exercise.id,
      body: {
        sizingMonth: values.sizingMonth!,
        slotStartDate: values.slotStartDate!,
        slotWeeks: Number(values.slotWeeks),
        tmsFrom: values.tmsFrom!,
        tmsTo: values.tmsTo!,
      },
    })
    confirmOpen.value = false
    emit('saved', result.exercise)
    open.value = false
    const summary = 'Exercise periods updated.'
    const shown = showOperationNotices({
      summary,
      notices: result.notices ?? [],
    })
    if (!shown) toast.success(summary)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not update periods.')
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      :close-on-outside="!confirmOpen"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Edit Exercise Periods</DialogTitle>
        <DialogDescription>
          Update Sizing Month, Slot Period, and TMS period. Toolkit remains frozen from create.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div class="rounded-lg border bg-card p-4">
          <div
            class="grid grid-cols-[minmax(120px,0.35fr)_1fr] items-center gap-x-3 gap-y-3 text-sm"
          >
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
                    v-model.number="slotWeeks"
                    class="h-9 w-20 rounded-md border border-input bg-card px-2 text-sm text-foreground"
                  >
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

            <div class="inline-flex items-center gap-1.5">
              <Label class="text-muted-foreground">TMS period</Label>
              <PeriodDerivedHints
                title="TMS period"
                :description="TMS_PERIOD_HINT_DESCRIPTION"
                :lines="tmsHints"
              />
            </div>
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
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button variant="outline" :disabled="busy" @click="open = false">Cancel</Button>
        <Button :disabled="busy" @click="requestSave">
          {{ busy ? 'Saving…' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    v-model:open="confirmOpen"
    title="Update Exercise Periods"
    description="Volume and TMS windows will refresh for the new periods. Saved Forecast and Simulation results on all scenarios will be cleared. Re-run Preview / Save sizing afterwards."
    confirm-label="Save"
    confirm-variant="default"
    :pending="busy"
    @confirm="confirmSave"
  />
</template>
