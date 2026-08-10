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

import { exerciseApi } from '../../api'
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
import AdSupportEditor from './AdSupportEditor.vue'
import AdTeamSetupEditor from './AdTeamSetupEditor.vue'
import AdTmsEditor from './AdTmsEditor.vue'
import AdVolumeEditor from './AdVolumeEditor.vue'

const props = defineProps<{
  open: boolean
  editor: AdTab | null
  exerciseId: string
  teamSetup: TeamSetup | null
  support: SupportItem[]
  calendar: CalendarView | null
  monthly: MonthlyVolume[]
  daily: DailyVolume[]
  slot: SlotVolume[]
  cycleTime: CycleTimeBaseline | null
  medianSource: MedianSourceMode
  manualMedian: string
  manualReason: string
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

const busy = ref(false)
const teamEditor = ref<InstanceType<typeof AdTeamSetupEditor> | null>(null)
const calendarEditor = ref<InstanceType<typeof AdCalendarEditor> | null>(null)

const title = computed(() => (props.editor ? AD_EDITOR_TITLES[props.editor] : ''))
const supportFte = computed(() =>
  props.support.reduce((sum, item) => sum + (Number(item.supportFte) || 0), 0),
)

function onOpenChange(next: boolean) {
  emit('update:open', next)
  if (!next) emit('close')
}

async function save() {
  if (!props.editor || props.readOnly || busy.value) return
  if (props.editor === 'volume') {
    onOpenChange(false)
    return
  }
  if (props.editor === 'support') {
    toast.success(`${title.value} saved.`)
    onOpenChange(false)
    return
  }

  busy.value = true
  try {
    if (props.editor === 'team') {
      const body = teamEditor.value?.toRequest()
      if (!body) {
        toast.error('Team Setup form is not ready. Close and open Edit again.')
        return
      }
      const saved = await exerciseApi.putTeamSetup(props.exerciseId, body)
      emit('update:teamSetup', saved)
    } else if (props.editor === 'calendar') {
      const body = calendarEditor.value?.toRequest()
      if (!body) {
        toast.error('Calendar form is not ready. Close and open Edit again.')
        return
      }
      const saved = await exerciseApi.putCalendar(props.exerciseId, body)
      emit('update:calendar', saved)
    } else if (props.editor === 'tms') {
      if (props.medianSource === 'manual') {
        const seconds = Number(props.manualMedian)
        if (!seconds || !props.manualReason.trim()) {
          toast.warning('Median seconds and reason are required for manual baseline.')
          return
        }
        const saved = await exerciseApi.createManualCycleTime(props.exerciseId, {
          medianSeconds: seconds,
          manualReason: props.manualReason.trim(),
        })
        emit('update:cycleTime', saved)
      }
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
      class="flex h-[92vh] w-[min(1180px,94vw)] max-w-[94vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[94vw]"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-5 py-4">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>
          {{
            readOnly
              ? 'Read-only data snapshot for this exercise.'
              : editor === 'volume'
                ? 'View and maintain the associated volume input data.'
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
          :read-only="readOnly"
        />
        <AdTmsEditor
          v-else-if="editor === 'tms'"
          :cycle-time="cycleTime"
          :read-only="readOnly"
        />
        <AdSupportEditor
          v-else-if="editor === 'support'"
          :exercise-id="exerciseId"
          :items="support"
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
          :monthly="monthly"
          :daily="daily"
          :slot="slot"
          :read-only="readOnly"
          @update:monthly="emit('update:monthly', $event)"
          @update:daily="emit('update:daily', $event)"
          @update:slot="emit('update:slot', $event)"
        />
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3 sm:justify-end">
        <Button type="button" variant="outline" :disabled="busy" @click="onOpenChange(false)">
          {{ readOnly || editor === 'volume' ? 'Close' : 'Cancel' }}
        </Button>
        <Button
          v-if="editor !== 'volume' && !readOnly"
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
