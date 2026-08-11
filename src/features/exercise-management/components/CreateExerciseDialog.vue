<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
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

import { formatDate } from '@/lib/datetime'

import { exerciseApi } from '../api'
import { sizingHintLines, slotHintLines } from '../periodWindows'
import type { CreateExerciseInput, Exercise } from '../types'
import PeriodDerivedHints from './PeriodDerivedHints.vue'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  toolkits: SupervisorToolkit[]
  initialToolkitId?: string
}>()

const emit = defineEmits<{
  created: [exercise: Exercise]
}>()

const today = new Date().toISOString().slice(0, 10)
const month = today.slice(0, 7)
const busy = ref(false)

const form = reactive<CreateExerciseInput>({
  toolkitId: '',
  sizingMonth: month,
  slotStartDate: today,
  slotWeeks: 4,
  tmsFrom: today,
  tmsTo: today,
})

const createdLabel = computed(() => formatDate(new Date()))
const sizingHints = computed(() => sizingHintLines(form.sizingMonth))
const slotHints = computed(() => slotHintLines(form.slotStartDate, form.slotWeeks))

watch(open, (value) => {
  if (!value) return
  form.toolkitId =
    props.initialToolkitId && props.toolkits.some((item) => item.id === props.initialToolkitId)
      ? props.initialToolkitId
      : (props.toolkits[0]?.id ?? '')
  form.sizingMonth = month
  form.slotStartDate = today
  form.slotWeeks = 4
  form.tmsFrom = today
  form.tmsTo = today
})

async function create() {
  if (!form.toolkitId) {
    toast.warning('Please select a Toolkit.')
    return
  }
  if (form.tmsFrom > form.tmsTo) {
    toast.warning('TMS period end must be on or after the start date.')
    return
  }
  busy.value = true
  try {
    const result = await exerciseApi.create({ ...form })
    emit('created', result.exercise)
    open.value = false
    toast.success(`${result.exercise.exerciseCode} created with a frozen snapshot.`)
    for (const notice of result.notices ?? []) {
      toast.message(notice)
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Exercise could not be created.')
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
            <select
              v-model="form.toolkitId"
              class="h-9 max-w-xs rounded-md border border-input bg-card px-2.5 text-sm"
            >
              <option v-for="toolkit in toolkits" :key="toolkit.id" :value="toolkit.id">
                {{ toolkit.name }}
              </option>
            </select>

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

          <div
            class="mt-4 rounded-md bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-foreground"
          >
            Associated Data (Team Setup, Support, Calendar, Volume) will be initialized from the
            latest Approved archive for this Toolkit when training periods overlap. Volume Input
            rows are auto-generated for training windows only (not forecast). Creating the Exercise
            freezes the current Toolkit, Subtasks, Shared KPI selections and Delivery HC from the
            ACTIVE Timesheet.
          </div>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button variant="outline" :disabled="busy" @click="open = false">Cancel</Button>
        <Button :disabled="busy || !form.toolkitId" @click="create">
          {{ busy ? 'Creating…' : 'Confirm' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
