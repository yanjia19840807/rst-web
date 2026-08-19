<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useExerciseAssociatedDataMutations } from '../../api/mutations'
import type {
  CalendarView,
  CycleTimeBaseline,
  DailyVolume,
  MonthlyVolume,
  SlotVolume,
  SupportItem,
  TeamSetup,
} from '../../types'
import type { AdTab, MedianSourceMode } from './adTypes'
import { AD_EDITOR_TITLES } from './adTypes'
import AdCalendarEditor from './AdCalendarEditor.vue'
import AdManualMedianEditor from './AdManualMedianEditor.vue'
import AdSupportEditor from './AdSupportEditor.vue'
import AdTeamSetupEditor from './AdTeamSetupEditor.vue'
import AdTmsEditor from './AdTmsEditor.vue'
import AdVolumeEditor from './AdVolumeEditor.vue'

const props = defineProps<{
  open: boolean
  editor: AdTab | null
  exerciseId: string
  sizingMonth: string
  slotStartDate: string
  slotWeeks: number
  teamSetup: TeamSetup | null
  support: SupportItem[]
  calendar: CalendarView | null
  monthly: MonthlyVolume[]
  daily: DailyVolume[]
  slot: SlotVolume[]
  cycleTime: CycleTimeBaseline | null
  medianSource: MedianSourceMode
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:teamSetup': [value: TeamSetup]
  'update:support': [value: SupportItem[]]
  'update:calendar': [value: CalendarView]
  'update:monthly': [value: MonthlyVolume[]]
  'update:daily': [value: DailyVolume[]]
  'update:slot': [value: SlotVolume[]]
  'update:cycleTime': [value: CycleTimeBaseline]
  close: []
}>()

const { putTeamSetup, putCalendar, createManualCycleTime } = useExerciseAssociatedDataMutations()
const busy = ref(false)
const teamEditor = ref<InstanceType<typeof AdTeamSetupEditor> | null>(null)
const calendarEditor = ref<InstanceType<typeof AdCalendarEditor> | null>(null)
const manualEditor = ref<InstanceType<typeof AdManualMedianEditor> | null>(null)

const isManualTms = computed(
  () => props.editor === 'tms' && props.medianSource === 'manual',
)

const title = computed(() => {
  if (isManualTms.value) return 'Manual median input'
  return props.editor ? AD_EDITOR_TITLES[props.editor] : ''
})

const supportFte = computed(() =>
  props.support.reduce((sum, item) => sum + (Number(item.supportFte) || 0), 0),
)

const manualSeedMedian = computed(() =>
  props.cycleTime?.baselineType?.toUpperCase() === 'MANUAL'
    ? String(props.cycleTime.medianSeconds)
    : '',
)

const manualSeedReason = computed(() =>
  props.cycleTime?.baselineType?.toUpperCase() === 'MANUAL'
    ? (props.cycleTime.manualReason ?? '')
    : '',
)

const manualSeedFiles = computed(() =>
  props.cycleTime?.baselineType?.toUpperCase() === 'MANUAL'
    ? (props.cycleTime.files ?? [])
    : [],
)

function onOpenChange(next: boolean) {
  emit('update:open', next)
  if (!next) emit('close')
}

/** Editors that only need Close (no dialog-level Save). */
const closeOnly = computed(
  () =>
    props.editor === 'volume' ||
    props.editor === 'support' ||
    (props.editor === 'tms' && props.medianSource === 'system'),
)

async function save() {
  if (!props.editor || props.readOnly || busy.value || closeOnly.value) return

  busy.value = true
  try {
    if (props.editor === 'team') {
      const body = teamEditor.value?.toRequest()
      if (!body) {
        toast.error('Team Setup form is not ready. Close and open Edit again.')
        return
      }
      const saved = await putTeamSetup.mutateAsync({ exerciseId: props.exerciseId, body })
      emit('update:teamSetup', saved)
    } else if (props.editor === 'calendar') {
      const body = calendarEditor.value?.toRequest()
      if (!body) {
        toast.error('Calendar form is not ready. Close and open Edit again.')
        return
      }
      const saved = await putCalendar.mutateAsync({ exerciseId: props.exerciseId, body })
      emit('update:calendar', saved)
    } else if (isManualTms.value) {
      const body = manualEditor.value?.toRequest()
      if (!body) return
      const saved = await createManualCycleTime.mutateAsync({
        exerciseId: props.exerciseId,
        body,
      })
      emit('update:cycleTime', saved)
    }
    toast.success(`${title.value} saved.`)
    onOpenChange(false)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Save failed.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent
      class="flex h-[96vh] w-[min(1440px,98vw)] max-w-[98vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[98vw]"
      :close-on-outside="false"
    >
      <DialogHeader
        class="mx-0 mt-0 shrink-0 rounded-none px-5 py-4"
      >
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>
          {{
            readOnly
              ? 'Read-only data snapshot for this exercise.'
              : editor === 'volume'
                ? 'View and maintain the associated volume input data.'
                : editor === 'support'
                  ? 'Add, edit, or delete workload rows — changes are saved immediately.'
                  : isManualTms
                    ? 'Enter the manual median override and reason, then save. Support files are optional.'
                    : editor === 'tms'
                      ? 'Review TMS sessions linked to this exercise Cycle Time population.'
                      : 'Edit the exercise Associated Data, then save your changes.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
        <AdTeamSetupEditor
          v-if="editor === 'team'"
          ref="teamEditor"
          :model-value="teamSetup"
          :cycle-time-seconds="cycleTime?.medianSeconds"
          :support-fte="supportFte"
          :sizing-month="sizingMonth"
          :read-only="readOnly"
        />
        <AdManualMedianEditor
          v-else-if="isManualTms"
          ref="manualEditor"
          :exercise-id="exerciseId"
          :median-seconds="manualSeedMedian"
          :reason="manualSeedReason"
          :files="manualSeedFiles"
          :read-only="readOnly"
        />
        <AdTmsEditor
          v-else-if="editor === 'tms'"
          :exercise-id="exerciseId"
          :cycle-time="cycleTime"
          :read-only="readOnly"
          @update:cycle-time="emit('update:cycleTime', $event)"
          @update:team-setup="emit('update:teamSetup', $event)"
        />
        <AdSupportEditor
          v-else-if="editor === 'support'"
          :exercise-id="exerciseId"
          :items="support"
          :team-setup="teamSetup"
          :read-only="readOnly"
          @update:items="emit('update:support', $event)"
        />
        <AdCalendarEditor
          v-else-if="editor === 'calendar'"
          ref="calendarEditor"
          :model-value="calendar"
          :read-only="readOnly"
        />
        <AdVolumeEditor
          v-else-if="editor === 'volume'"
          :exercise-id="exerciseId"
          :sizing-month="sizingMonth"
          :slot-start-date="slotStartDate"
          :slot-weeks="slotWeeks"
          :monthly="monthly"
          :daily="daily"
          :slot="slot"
          :read-only="readOnly"
          @update:monthly="emit('update:monthly', $event)"
          @update:daily="emit('update:daily', $event)"
          @update:slot="emit('update:slot', $event)"
        />
      </div>

      <DialogFooter
        class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3 sm:justify-end"
      >
        <Button type="button" variant="outline" :disabled="busy" @click="onOpenChange(false)">
          {{ readOnly || closeOnly ? 'Close' : 'Cancel' }}
        </Button>
        <Button
          v-if="!closeOnly && !readOnly"
          type="button"
          :disabled="busy"
          @click="save"
        >
          {{ busy ? 'Saving…' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
