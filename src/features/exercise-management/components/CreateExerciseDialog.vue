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

import { exerciseApi } from '../api'
import type { CreateExerciseInput, Exercise } from '../types'

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

const createdLabel = computed(() =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(),
  ),
)

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
    const exercise = await exerciseApi.create({ ...form })
    emit('created', exercise)
    open.value = false
    toast.success(`${exercise.exerciseCode} created with a frozen snapshot.`)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Exercise could not be created.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Create New Exercise</DialogTitle>
        <DialogDescription>
          Multiple In Progress exercises are allowed for the same Toolkit.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4">
        <div class="grid grid-cols-[minmax(120px,0.35fr)_1fr] items-center gap-x-3 gap-y-3 text-sm">
          <span class="text-muted-foreground">Exercise No</span>
          <ReadOnlyField value="Assigned on create" strong />

          <span class="text-muted-foreground">Created</span>
          <ReadOnlyField :value="createdLabel" />

          <Label class="text-muted-foreground">Toolkit</Label>
          <select
            v-model="form.toolkitId"
            class="h-9 max-w-xs rounded-md border border-input bg-background px-2.5 text-sm"
          >
            <option v-for="toolkit in toolkits" :key="toolkit.id" :value="toolkit.id">
              {{ toolkit.name }}
            </option>
          </select>

          <Label class="text-muted-foreground">Sizing Month</Label>
          <MonthPicker
            v-model="form.sizingMonth"
            aria-label="Choose sizing month"
            placeholder="Select sizing month"
            class="w-[200px]"
          />

          <Label class="text-muted-foreground">Slot Period</Label>
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
                class="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              >
                <option v-for="week in 12" :key="week" :value="week">{{ week }}</option>
              </select>
            </label>
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

        <div class="rounded-md bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-foreground">
          Associated Data will be initialized from the latest Approved archive for this Toolkit.
          Creating the Exercise freezes the current Toolkit, Subtasks, Shared KPI selections and
          Delivery HC from the ACTIVE Timesheet.
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="busy" @click="open = false">Cancel</Button>
        <Button :disabled="busy || !form.toolkitId" @click="create">
          {{ busy ? 'Creating…' : 'Confirm' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
