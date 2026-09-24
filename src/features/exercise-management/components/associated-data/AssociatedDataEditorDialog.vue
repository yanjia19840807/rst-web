<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { TMS_PERIOD_HINT_DESCRIPTION } from '../../periodWindows'
import { useExerciseAssociatedDataMutations } from '../../api/mutations'
import { provideAssociatedDataSaveGuard } from '../../composables/useAssociatedDataSaveGuard'
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
import { sumSupportFte } from './supportOptions'
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
  slotStartDate: string | null
  slotWeeks: number | null
  teamSetup: TeamSetup | null
  support: SupportItem[]
  calendar: CalendarView | null
  monthly: MonthlyVolume[]
  daily: DailyVolume[]
  slot: SlotVolume[]
  cycleTime: CycleTimeBaseline | null
  tmsFrom: string | null
  tmsTo: string | null
  medianSource: MedianSourceMode
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:medianSource': [value: MedianSourceMode]
  'update:teamSetup': [value: TeamSetup]
  'update:support': [value: SupportItem[]]
  'update:calendar': [value: CalendarView]
  'update:monthly': [value: MonthlyVolume[]]
  'update:daily': [value: DailyVolume[]]
  'update:slot': [value: SlotVolume[]]
  'update:cycleTime': [value: CycleTimeBaseline]
  written: []
  close: []
}>()

const TMS_SOURCE_OPTIONS = [
  {
    value: 'system' as const,
    label: 'System-calculated median',
    hint: 'Apply a TMS period to link COMPLETED sessions and refresh the SYSTEM median.',
  },
  {
    value: 'manual' as const,
    label: 'Manual median input',
    hint: 'Enter a median override; optionally upload support files as approval evidence.',
  },
]

const { putTeamSetup, createManualCycleTime } = useExerciseAssociatedDataMutations()
const {
  confirmOpen,
  scenarioCount,
  pending: clearingResults,
  cancel: cancelClearResults,
  confirm: confirmClearResults,
  beforeAssociatedDataWrite,
} = provideAssociatedDataSaveGuard(() => props.exerciseId)
const busy = ref(false)

function onImpactOpenChange(open: boolean) {
  if (!open && !clearingResults.value) cancelClearResults()
}
const teamEditor = ref<InstanceType<typeof AdTeamSetupEditor> | null>(null)
const manualEditor = ref<InstanceType<typeof AdManualMedianEditor> | null>(null)

const isManualTms = computed(
  () => props.editor === 'tms' && props.medianSource === 'manual',
)

const title = computed(() => (props.editor ? AD_EDITOR_TITLES[props.editor] : ''))

const medianSourceLabel = computed(() =>
  TMS_SOURCE_OPTIONS.find((option) => option.value === props.medianSource)?.label ?? '—',
)

const tmsAlert = computed(() =>
  props.medianSource === 'manual'
    ? 'Enter a median override. Optionally upload support files as approval evidence.'
    : TMS_PERIOD_HINT_DESCRIPTION,
)

const description = computed(() => {
  if (props.readOnly) return 'Read-only data snapshot for this exercise.'
  switch (props.editor) {
    case 'volume':
      return 'View and maintain the associated volume input data.'
    case 'calendar':
      return 'Add, edit, or delete holiday dates — changes are saved immediately. Import Excel updates or adds dates; other dates are kept.'
    case 'support':
      return 'Add, edit, or delete workload rows — changes are saved immediately.'
    case 'tms':
      return 'Set the median cycle time from a TMS period, or enter a manual override.'
    default:
      return 'Edit the exercise Associated Data, then save your changes.'
  }
})

const supportFte = computed(() => sumSupportFte(props.support))

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

const isSystemTms = computed(
  () => props.editor === 'tms' && props.medianSource === 'system',
)

const closeOnly = computed(
  () =>
    props.editor === 'volume' ||
    props.editor === 'support' ||
    props.editor === 'calendar' ||
    isSystemTms.value,
)

function onImmediateWrite<K extends 'support' | 'calendar' | 'monthly' | 'daily' | 'slot'>(
  key: K,
  value: K extends 'support'
    ? SupportItem[]
    : K extends 'calendar'
      ? CalendarView
      : K extends 'monthly'
        ? MonthlyVolume[]
        : K extends 'daily'
          ? DailyVolume[]
          : SlotVolume[],
) {
  emit(`update:${key}`, value)
  emit('written')
}

async function save() {
  if (!props.editor || props.readOnly || busy.value || closeOnly.value || clearingResults.value) {
    return
  }

  let teamBody = null as Awaited<ReturnType<NonNullable<typeof teamEditor.value>['toRequest']>> | null
  let manualBody = null as Awaited<
    ReturnType<NonNullable<typeof manualEditor.value>['toRequest']>
  > | null

  if (props.editor === 'team') {
    teamBody = (await teamEditor.value?.toRequest()) ?? null
    if (!teamBody) {
      toast.warning(
        teamEditor.value
          ? 'Check the highlighted fields.'
          : 'Team Setup form is not ready. Close and open Edit again.',
      )
      return
    }
  } else if (isManualTms.value) {
    manualBody = (await manualEditor.value?.toRequest()) ?? null
    if (!manualBody) {
      toast.warning(
        manualEditor.value
          ? 'Check the highlighted fields.'
          : 'Manual median form is not ready. Close and open Edit again.',
      )
      return
    }
  } else {
    return
  }

  if (!(await beforeAssociatedDataWrite())) return

  busy.value = true
  try {
    if (props.editor === 'team' && teamBody) {
      emit(
        'update:teamSetup',
        await putTeamSetup.mutateAsync({ exerciseId: props.exerciseId, body: teamBody }),
      )
    } else if (isManualTms.value && manualBody) {
      emit(
        'update:cycleTime',
        await createManualCycleTime.mutateAsync({
          exerciseId: props.exerciseId,
          body: manualBody,
        }),
      )
    }
    toast.success(`${title.value} saved.`)
    emit('written')
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
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
        <Alert v-if="editor === 'tms'" variant="info" class="mb-4">
          <Info />
          <AlertDescription>{{ tmsAlert }}</AlertDescription>
        </Alert>
        <div v-if="editor === 'tms' && !readOnly" class="mb-4 grid grid-cols-2 gap-3">
          <label
            v-for="option in TMS_SOURCE_OPTIONS"
            :key="option.value"
            class="cursor-pointer"
          >
            <Card
              class="h-full"
              :class="
                medianSource === option.value
                  ? 'bg-primary/5 ring-primary'
                  : undefined
              "
            >
              <CardHeader class="px-4 pb-0">
                <CardTitle class="flex items-start gap-2.5 text-sm">
                  <input
                    type="radio"
                    class="mt-0.5"
                    name="exercise-median-source"
                    :checked="medianSource === option.value"
                    @change="emit('update:medianSource', option.value)"
                  />
                  {{ option.label }}
                </CardTitle>
              </CardHeader>
              <CardContent class="px-4 pt-2">
                <p class="text-xs leading-relaxed text-muted-foreground">{{ option.hint }}</p>
              </CardContent>
            </Card>
          </label>
        </div>
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
          :exercise-id="props.exerciseId"
          :median-source-label="medianSourceLabel"
          :median-seconds="manualSeedMedian"
          :reason="manualSeedReason"
          :files="manualSeedFiles"
          :read-only="readOnly"
        />
        <AdTmsEditor
          v-else-if="editor === 'tms'"
          :exercise-id="props.exerciseId"
          :median-source-label="medianSourceLabel"
          :tms-from="tmsFrom"
          :tms-to="tmsTo"
          :cycle-time="cycleTime"
          :read-only="readOnly"
          @written="emit('written')"
        />
        <AdSupportEditor
          v-else-if="editor === 'support'"
          :exercise-id="props.exerciseId"
          :items="support"
          :team-setup="teamSetup"
          :read-only="readOnly"
          @update:items="onImmediateWrite('support', $event)"
        />
        <AdCalendarEditor
          v-else-if="editor === 'calendar'"
          :model-value="calendar"
          :exercise-id="props.exerciseId"
          :read-only="readOnly"
          @update:calendar="onImmediateWrite('calendar', $event)"
        />
        <AdVolumeEditor
          v-else-if="editor === 'volume'"
          :exercise-id="props.exerciseId"
          :sizing-month="sizingMonth"
          :slot-start-date="slotStartDate"
          :slot-weeks="slotWeeks"
          :monthly="monthly"
          :daily="daily"
          :slot="slot"
          :read-only="readOnly"
          @update:monthly="onImmediateWrite('monthly', $event)"
          @update:daily="onImmediateWrite('daily', $event)"
          @update:slot="onImmediateWrite('slot', $event)"
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
          :loading="busy"
          @click="save"
        >
          {{ busy ? 'Saving…' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    :open="confirmOpen"
    elevated
    title="Clear saved simulation results?"
    @update:open="onImpactOpenChange"
    description="Saving Associated Data will clear saved Forecast and Simulation results on all scenarios, including the Official Scenario. Scenario inputs (name, Right Sizing HC, shifts) stay. Run simulation again afterwards."
    :rows="
      scenarioCount > 0
        ? [{ label: 'Scenarios with results', value: String(scenarioCount), strong: true }]
        : []
    "
    confirm-label="Clear results and continue"
    :pending="clearingResults"
    @cancel="cancelClearResults"
    @confirm="confirmClearResults"
  />
</template>
