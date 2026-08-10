<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

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

import { exerciseApi } from '../api'
import { sizingHintLines, slotHintLines } from '../periodWindows'
import type { Exercise, UpdateExercisePeriodsInput } from '../types'
import PeriodDerivedHints from './PeriodDerivedHints.vue'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  exercise: Exercise
}>()

const emit = defineEmits<{
  saved: [exercise: Exercise]
}>()

const busy = ref(false)
const form = reactive<UpdateExercisePeriodsInput>({
  sizingMonth: '',
  slotStartDate: '',
  slotWeeks: 4,
  tmsFrom: '',
  tmsTo: '',
})

const sizingHints = computed(() => sizingHintLines(form.sizingMonth))
const slotHints = computed(() => slotHintLines(form.slotStartDate, form.slotWeeks))

watch(open, (value) => {
  if (!value) return
  form.sizingMonth = props.exercise.sizingMonth
  form.slotStartDate = props.exercise.slotStartDate
  form.slotWeeks = props.exercise.slotWeeks
  form.tmsFrom = props.exercise.tmsFrom
  form.tmsTo = props.exercise.tmsTo
})

async function save() {
  if (form.tmsFrom > form.tmsTo) {
    toast.warning('TMS period end must be on or after the start date.')
    return
  }
  busy.value = true
  try {
    const result = await exerciseApi.updatePeriods(props.exercise.id, { ...form })
    emit('saved', result.exercise)
    open.value = false
    toast.success('Exercise periods updated.')
    for (const notice of result.notices ?? []) {
      toast.message(notice)
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not update periods.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
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
            <Label class="text-muted-foreground self-start pt-2">Sizing Month</Label>
            <div>
              <MonthPicker
                v-model="form.sizingMonth"
                aria-label="Choose sizing month"
                placeholder="Select sizing month"
                class="w-[200px]"
              />
              <PeriodDerivedHints :lines="sizingHints" />
            </div>

            <Label class="text-muted-foreground self-start pt-2">Slot Period</Label>
            <div>
              <div class="flex flex-wrap items-center gap-3">
                <div class="grid gap-1.5">
                  <span class="text-xs text-muted-foreground">Start date</span>
                  <DatePicker
                    v-model="form.slotStartDate"
                    aria-label="Choose slot start date"
                    placeholder="Select start date"
                    class="w-[180px]"
                  />
                </div>
                <label class="grid gap-1.5 text-xs text-muted-foreground">
                  Weeks
                  <select
                    v-model.number="form.slotWeeks"
                    class="h-9 w-20 rounded-md border border-input bg-card px-2 text-sm text-foreground"
                  >
                    <option v-for="week in 12" :key="week" :value="week">{{ week }}</option>
                  </select>
                </label>
              </div>
              <PeriodDerivedHints :lines="slotHints" />
            </div>

            <Label class="text-muted-foreground">TMS period</Label>
            <div class="flex flex-wrap items-center gap-2">
              <DatePicker
                v-model="form.tmsFrom"
                aria-label="Choose TMS period start"
                placeholder="From"
                class="w-[180px]"
              />
              <span class="text-muted-foreground">to</span>
              <DatePicker
                v-model="form.tmsTo"
                aria-label="Choose TMS period end"
                placeholder="To"
                class="w-[180px]"
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button variant="outline" :disabled="busy" @click="open = false">Cancel</Button>
        <Button :disabled="busy" @click="save">
          {{ busy ? 'Saving…' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
