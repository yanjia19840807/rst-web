<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { MonthPicker } from '@/components/ui/month-picker'
import { NumberFieldControl } from '@/components/ui/number-field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { exerciseApi } from '../../api'
import { useExerciseAssociatedDataMutations } from '../../api/mutations'
import { useToolkitVolumePointsQuery } from '../../api/queries'
import { triggerDownload } from '../../downloadBlob'
import { addDaysIso, dailyTrainDates, deriveSlotPeriodLabel, shiftYearMonth } from '../../periodWindows'
import type {
  DailyVolume,
  DailyVolumeRequest,
  MonthlyVolume,
  MonthlyVolumeRequest,
  SlotVolume,
  SlotVolumeRequest,
} from '../../types'
import { formatNumber, numOrNull } from './adTypes'

type VolumeTab = 'monthly' | 'daily' | 'slot'
type BusyAction = 'template' | 'export' | 'import' | 'save' | 'delete'

type DraftMonthly = {
  key: string
  month: string
  actualVolume: number | null
  commercialRatio: number | null
}

type DraftDaily = {
  key: string
  volumeDate: string
  actualVolume: number | null
  dailyAdjustmentRatio: number | null
}

const props = defineProps<{
  exerciseId: string
  sizingMonth: string
  slotStartDate: string
  slotWeeks: number
  monthly: MonthlyVolume[]
  daily: DailyVolume[]
  slot: SlotVolume[]
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:monthly': [value: MonthlyVolume[]]
  'update:daily': [value: DailyVolume[]]
  'update:slot': [value: SlotVolume[]]
}>()

const {
  putMonthlyVolumes,
  putDailyVolumes,
  putSlotVolumes,
  importMonthlyVolumes,
  importDailyVolumes,
  importSlotVolumes,
} = useExerciseAssociatedDataMutations()

const tab = ref<VolumeTab>('monthly')
const page = ref(1)
const pageSize = ref(10)
const busyAction = ref<BusyAction | null>(null)
const busy = computed(() => busyAction.value != null)

const monthDrafts = ref<DraftMonthly[]>([])
const dayDrafts = ref<DraftDaily[]>([])
const slotDrafts = ref<SlotVolumeRequest[]>([])

const editKey = ref<string | null>(null)
const periodDraft = reactive({
  month: '',
  volumeDate: '',
  actualVolume: null as number | null,
  commercialRatio: null as number | null,
  dailyAdjustmentRatio: null as number | null,
})
const slotEditingIndex = ref<number | null>(null)
const slotEditValue = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const toolkitPointsQuery = useToolkitVolumePointsQuery(() => props.exerciseId)
const toolkitMonthMap = computed(() => {
  const map = new Map<string, number>()
  for (const row of toolkitPointsQuery.data.value?.monthly ?? []) {
    map.set(row.month, row.actualVolume)
  }
  return map
})
const toolkitDayMap = computed(() => {
  const map = new Map<string, number>()
  for (const row of toolkitPointsQuery.data.value?.daily ?? []) {
    map.set(row.volumeDate, row.actualVolume)
  }
  return map
})

const sizingMonthEnd = computed(() => {
  const dates = dailyTrainDates(props.sizingMonth)
  return dates[dates.length - 1] ?? `${props.sizingMonth}-28`
})

watch(
  () => [props.monthly, props.daily, props.slot] as const,
  ([m, d, s]) => {
    const keepEdit = editKey.value?.startsWith('new-') ? editKey.value : null
    const pendingMonths = keepEdit
      ? monthDrafts.value.filter((row) => row.key === keepEdit)
      : []
    const pendingDays = keepEdit
      ? dayDrafts.value.filter((row) => row.key === keepEdit)
      : []

    monthDrafts.value = m.map((row) => ({
      key: row.month,
      month: row.month,
      actualVolume: row.actualVolume,
      commercialRatio: row.commercialRatio ?? null,
    }))
    dayDrafts.value = d.map((row) => ({
      key: row.volumeDate,
      volumeDate: row.volumeDate,
      actualVolume: row.actualVolume,
      dailyAdjustmentRatio: row.dailyAdjustmentRatio ?? null,
    }))
    slotDrafts.value = s.map((row) => ({
      slotStartAt: row.slotStartAt,
      slotEndAt: row.slotEndAt,
      actualVolume: row.actualVolume,
    }))

    if (keepEdit && pendingMonths.length) {
      monthDrafts.value = [...monthDrafts.value, ...pendingMonths]
      editKey.value = keepEdit
    } else if (keepEdit && pendingDays.length) {
      dayDrafts.value = [...dayDrafts.value, ...pendingDays]
      editKey.value = keepEdit
    } else {
      editKey.value = null
    }
    slotEditingIndex.value = null
  },
  { immediate: true, deep: true },
)

watch(tab, () => {
  cancelEdit()
  page.value = 1
  slotEditingIndex.value = null
})

watch(
  () => [periodDraft.month, periodDraft.volumeDate] as const,
  ([month, date]) => {
    if (!editKey.value || periodDraft.actualVolume != null) return
    if (tab.value === 'monthly') {
      const seeded = toolkitMonthMap.value.get(month)
      if (seeded != null) periodDraft.actualVolume = seeded
    } else if (tab.value === 'daily') {
      const seeded = toolkitDayMap.value.get(date)
      if (seeded != null) periodDraft.actualVolume = seeded
    }
  },
)

const sortedMonths = computed(() =>
  [...monthDrafts.value].sort((a, b) => compareDraft(a.key, a.month, b.key, b.month)),
)
const sortedDays = computed(() =>
  [...dayDrafts.value].sort((a, b) => compareDraft(a.key, a.volumeDate, b.key, b.volumeDate)),
)
const indexedSlots = computed(() => slotDrafts.value.map((row, index) => ({ row, index })))

const pagedMonths = computed(() => slicePage(sortedMonths.value, page.value, pageSize.value))
const pagedDays = computed(() => slicePage(sortedDays.value, page.value, pageSize.value))
const pagedSlot = computed(() => slicePage(indexedSlots.value, page.value, pageSize.value))

const currentTotal = computed(() => {
  if (tab.value === 'monthly') return sortedMonths.value.length
  if (tab.value === 'daily') return sortedDays.value.length
  return slotDrafts.value.length
})

const windowHint = computed(() => {
  if (tab.value === 'monthly') {
    return 'Months must be consecutive, unique, and on or before Sizing Month. Actual Volume is required and must be non-negative. Commercial Ratio is optional (Excel 1 + Commercial). Charts show Sizing Month and the prior 2 months as history.'
  }
  if (tab.value === 'daily') {
    return 'Dates must be consecutive, unique, and on or before Sizing Month. Actual Volume is required and must be non-negative. Daily Volume Adjustment Ratio is optional. Charts show all days in Sizing Month as history.'
  }
  return `Slot window: ${deriveSlotPeriodLabel(props.slotStartDate, props.slotWeeks)} · 09:00–22:00 / 30 min`
})

const seededHint = computed(() => {
  if (tab.value === 'slot' && props.slot.some((row) => row.sourceType === 'ARCHIVE')) {
    return 'Slot volumes were seeded from the latest Approved archive where slots overlap.'
  }
  return ''
})

function comparePeriod(a: string, b: string) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

function compareDraft(aKey: string, aPeriod: string, bKey: string, bPeriod: string) {
  const aNew = aKey.startsWith('new-')
  const bNew = bKey.startsWith('new-')
  if (aNew !== bNew) return aNew ? -1 : 1
  return comparePeriod(aPeriod, bPeriod)
}

function confirmedMonths() {
  return [...monthDrafts.value]
    .filter((row) => !row.key.startsWith('new-') && /^\d{4}-\d{2}$/.test(row.month))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function confirmedDays() {
  return [...dayDrafts.value]
    .filter((row) => !row.key.startsWith('new-') && /^\d{4}-\d{2}-\d{2}$/.test(row.volumeDate))
    .sort((a, b) => a.volumeDate.localeCompare(b.volumeDate))
}

function monthsAreContinuous(months: string[]) {
  const keys = [...months].filter((month) => /^\d{4}-\d{2}$/.test(month)).sort()
  for (let i = 1; i < keys.length; i++) {
    if (shiftYearMonth(keys[i - 1], 1) !== keys[i]) return false
  }
  return true
}

function datesAreContinuous(dates: string[]) {
  const keys = [...dates].filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()
  for (let i = 1; i < keys.length; i++) {
    if (addDaysIso(keys[i - 1], 1) !== keys[i]) return false
  }
  return true
}

function canDeleteMonth(row: DraftMonthly) {
  if (row.key.startsWith('new-')) return true
  const rows = confirmedMonths()
  if (rows.length <= 1) return true
  return row.key === rows[0].key || row.key === rows[rows.length - 1].key
}

function canDeleteDay(row: DraftDaily) {
  if (row.key.startsWith('new-')) return true
  const rows = confirmedDays()
  if (rows.length <= 1) return true
  return row.key === rows[0].key || row.key === rows[rows.length - 1].key
}

function suggestedAddMonth() {
  const months = confirmedMonths().map((row) => row.month)
  if (!months.length) return props.sizingMonth
  const after = shiftYearMonth(months[months.length - 1], 1)
  if (after <= props.sizingMonth) return after
  return shiftYearMonth(months[0], -1)
}

function suggestedAddDate() {
  const dates = confirmedDays().map((row) => row.volumeDate)
  if (!dates.length) return sizingMonthEnd.value
  const after = addDaysIso(dates[dates.length - 1], 1)
  if (after <= sizingMonthEnd.value) return after
  return addDaysIso(dates[0], -1)
}

function slicePage<T>(rows: T[], currentPage: number, size: number) {
  const start = (currentPage - 1) * size
  return rows.slice(start, start + size)
}

function dayName(date: string) {
  if (!date) return '—'
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
  } catch {
    return '—'
  }
}

function formatSlotTime(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const fmt = (d: Date) =>
    `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  return `${fmt(s)}–${fmt(e)}`
}

function monthlyRequests(): MonthlyVolumeRequest[] {
  return monthDrafts.value
    .filter((row) => /^\d{4}-\d{2}$/.test(row.month))
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      month: row.month,
      actualVolume: row.actualVolume,
      commercialRatio: row.commercialRatio,
    }))
}

function dailyRequests(): DailyVolumeRequest[] {
  return dayDrafts.value
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.volumeDate))
    .sort((a, b) => a.volumeDate.localeCompare(b.volumeDate))
    .map((row) => ({
      volumeDate: row.volumeDate,
      actualVolume: row.actualVolume,
      dailyAdjustmentRatio: row.dailyAdjustmentRatio,
    }))
}

async function persistMonthly() {
  const saved = await putMonthlyVolumes.mutateAsync({
    exerciseId: props.exerciseId,
    body: monthlyRequests(),
  })
  emit('update:monthly', saved)
}

async function persistDaily() {
  const saved = await putDailyVolumes.mutateAsync({
    exerciseId: props.exerciseId,
    body: dailyRequests(),
  })
  emit('update:daily', saved)
}

async function persistSlot() {
  const saved = await putSlotVolumes.mutateAsync({
    exerciseId: props.exerciseId,
    body: slotDrafts.value,
  })
  emit('update:slot', saved)
}

function startEditMonth(row: DraftMonthly) {
  if (props.readOnly || busy.value) return
  editKey.value = row.key
  periodDraft.month = row.month
  periodDraft.actualVolume = row.actualVolume
  periodDraft.commercialRatio = row.commercialRatio
}

function startEditDay(row: DraftDaily) {
  if (props.readOnly || busy.value) return
  editKey.value = row.key
  periodDraft.volumeDate = row.volumeDate
  periodDraft.actualVolume = row.actualVolume
  periodDraft.dailyAdjustmentRatio = row.dailyAdjustmentRatio
}

function startEditSlot(index: number, current: string | number | null | undefined) {
  if (props.readOnly || busy.value) return
  slotEditingIndex.value = index
  slotEditValue.value = numOrNull(current)
}

function cancelEdit() {
  if (editKey.value?.startsWith('new-')) {
    const key = editKey.value
    monthDrafts.value = monthDrafts.value.filter((row) => row.key !== key)
    dayDrafts.value = dayDrafts.value.filter((row) => row.key !== key)
  }
  editKey.value = null
}

async function withBusy<T>(action: BusyAction, run: () => Promise<T>): Promise<T | undefined> {
  if (busyAction.value) return
  busyAction.value = action
  try {
    return await run()
  } finally {
    busyAction.value = null
  }
}

async function confirmEdit() {
  if (editKey.value == null) return
  const key = editKey.value
  const n = periodDraft.actualVolume
  if (n != null && n < 0) {
    toast.error('Volume must be non-negative.')
    return
  }

  if (tab.value === 'monthly') {
    const month = periodDraft.month.trim()
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast.error('Choose a month.')
      return
    }
    if (month > props.sizingMonth) {
      toast.error('Cannot add a month after Sizing Month.')
      return
    }
    if (monthDrafts.value.some((row) => row.key !== key && row.month === month)) {
      toast.error(`${month} is already on this exercise.`)
      return
    }
    const nextMonths = monthDrafts.value
      .filter((row) => row.key !== key)
      .map((row) => row.month)
      .concat(month)
    if (!monthsAreContinuous(nextMonths)) {
      toast.error('Months must be consecutive. Add the month before the first or after the last row.')
      return
    }
    const volume = n ?? toolkitMonthMap.value.get(month) ?? null
    if (volume == null) {
      toast.error('Actual Volume is required.')
      return
    }
    try {
      await withBusy('save', async () => {
        monthDrafts.value = monthDrafts.value.map((row) =>
          row.key === key
            ? {
                key: month,
                month,
                actualVolume: volume,
                commercialRatio: periodDraft.commercialRatio,
              }
            : row,
        )
        editKey.value = null
        await persistMonthly()
        toast.success('Volume updated.')
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed.')
    }
    return
  }

  const date = periodDraft.volumeDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    toast.error('Choose a date.')
    return
  }
  if (date > sizingMonthEnd.value) {
    toast.error('Cannot add a date after Sizing Month.')
    return
  }
  if (dayDrafts.value.some((row) => row.key !== key && row.volumeDate === date)) {
    toast.error(`${date} is already on this exercise.`)
    return
  }
  const nextDates = dayDrafts.value
    .filter((row) => row.key !== key)
    .map((row) => row.volumeDate)
    .concat(date)
  if (!datesAreContinuous(nextDates)) {
    toast.error('Dates must be consecutive. Add the date before the first or after the last row.')
    return
  }
  const volume = n ?? toolkitDayMap.value.get(date) ?? null
  if (volume == null) {
    toast.error('Actual Volume is required.')
    return
  }
  try {
    await withBusy('save', async () => {
      dayDrafts.value = dayDrafts.value.map((row) =>
        row.key === key
          ? {
              key: date,
              volumeDate: date,
              actualVolume: volume,
              dailyAdjustmentRatio: periodDraft.dailyAdjustmentRatio,
            }
          : row,
      )
      editKey.value = null
      await persistDaily()
      toast.success('Volume updated.')
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Update failed.')
  }
}

async function confirmSlotEdit() {
  if (slotEditingIndex.value == null) return
  const idx = slotEditingIndex.value
  const n = slotEditValue.value
  if (n == null) {
    toast.error('Actual Volume is required.')
    return
  }
  if (n < 0) {
    toast.error('Volume must be non-negative.')
    return
  }
  try {
    await withBusy('save', async () => {
      const row = slotDrafts.value[idx]
      if (row) row.actualVolume = Number(n ?? 0)
      await persistSlot()
      slotEditingIndex.value = null
      toast.success('Volume updated.')
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Update failed.')
  }
}

function addRow() {
  if (props.readOnly || busy.value || editKey.value) return
  const key = `new-${Date.now()}`
  if (tab.value === 'monthly') {
    const month = suggestedAddMonth()
    monthDrafts.value = [...monthDrafts.value, { key, month, actualVolume: null, commercialRatio: null }]
    periodDraft.month = month
    periodDraft.actualVolume = toolkitMonthMap.value.get(month) ?? null
    periodDraft.commercialRatio = null
  } else if (tab.value === 'daily') {
    const date = suggestedAddDate()
    dayDrafts.value = [...dayDrafts.value, { key, volumeDate: date, actualVolume: null, dailyAdjustmentRatio: null }]
    periodDraft.volumeDate = date
    periodDraft.actualVolume = toolkitDayMap.value.get(date) ?? null
    periodDraft.dailyAdjustmentRatio = null
  } else {
    return
  }
  editKey.value = key
  page.value = 1
}

async function removeMonth(row: DraftMonthly) {
  if (props.readOnly || busy.value) return
  if (!canDeleteMonth(row)) {
    toast.error('Delete the first or last month so the series stays consecutive.')
    return
  }
  if (row.key.startsWith('new-')) {
    monthDrafts.value = monthDrafts.value.filter((item) => item.key !== row.key)
    if (editKey.value === row.key) editKey.value = null
    return
  }
  const previous = monthDrafts.value
  try {
    await withBusy('delete', async () => {
      monthDrafts.value = previous.filter((item) => item.key !== row.key)
      if (editKey.value === row.key) editKey.value = null
      await persistMonthly()
      toast.success('Row deleted.')
    })
  } catch (error) {
    monthDrafts.value = previous
    toast.error(error instanceof Error ? error.message : 'Delete failed.')
  }
}

async function removeDay(row: DraftDaily) {
  if (props.readOnly || busy.value) return
  if (!canDeleteDay(row)) {
    toast.error('Delete the first or last date so the series stays consecutive.')
    return
  }
  if (row.key.startsWith('new-')) {
    dayDrafts.value = dayDrafts.value.filter((item) => item.key !== row.key)
    if (editKey.value === row.key) editKey.value = null
    return
  }
  const previous = dayDrafts.value
  try {
    await withBusy('delete', async () => {
      dayDrafts.value = previous.filter((item) => item.key !== row.key)
      if (editKey.value === row.key) editKey.value = null
      await persistDaily()
      toast.success('Row deleted.')
    })
  } catch (error) {
    dayDrafts.value = previous
    toast.error(error instanceof Error ? error.message : 'Delete failed.')
  }
}

async function downloadTemplate() {
  try {
    await withBusy('template', async () => {
      const result =
        tab.value === 'monthly'
          ? await exerciseApi.exportMonthlyVolumeTemplate(props.exerciseId)
          : tab.value === 'daily'
            ? await exerciseApi.exportDailyVolumeTemplate(props.exerciseId)
            : await exerciseApi.exportSlotVolumeTemplate(props.exerciseId)
      triggerDownload(result.blob, result.filename)
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Download failed.')
  }
}

async function downloadCurrent() {
  try {
    await withBusy('export', async () => {
      const result =
        tab.value === 'monthly'
          ? await exerciseApi.exportMonthlyVolumes(props.exerciseId)
          : tab.value === 'daily'
            ? await exerciseApi.exportDailyVolumes(props.exerciseId)
            : await exerciseApi.exportSlotVolumes(props.exerciseId)
      triggerDownload(result.blob, result.filename)
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Export failed.')
  }
}

function triggerImport() {
  if (busy.value) return
  fileInput.value?.click()
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || props.readOnly) return
  try {
    await withBusy('import', async () => {
      if (tab.value === 'monthly') {
        const saved = await importMonthlyVolumes.mutateAsync({
          exerciseId: props.exerciseId,
          file,
        })
        emit('update:monthly', saved)
      } else if (tab.value === 'daily') {
        const saved = await importDailyVolumes.mutateAsync({
          exerciseId: props.exerciseId,
          file,
        })
        emit('update:daily', saved)
      } else {
        const saved = await importSlotVolumes.mutateAsync({
          exerciseId: props.exerciseId,
          file,
        })
        emit('update:slot', saved)
      }
      toast.success('Excel imported.')
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Import failed.')
  }
}
</script>

<template>
  <div class="space-y-4 rounded-lg border bg-card p-4">
    <div class="flex gap-1 border-b">
      <button
        v-for="item in [
          { id: 'monthly' as const, label: 'Monthly' },
          { id: 'daily' as const, label: 'Daily' },
          { id: 'slot' as const, label: 'Per-slot' },
        ]"
        :key="item.id"
        type="button"
        class="border-b-2 px-3.5 py-2 text-sm"
        :disabled="busy"
        :class="
          tab === item.id
            ? 'border-primary font-semibold text-primary'
            : 'border-transparent text-muted-foreground'
        "
        @click="tab = item.id"
      >
        {{ item.label }}
      </button>
    </div>

    <p class="rounded-md bg-muted/60 px-3 py-2 text-xs leading-relaxed text-foreground">
      {{ windowHint }}
      <span v-if="seededHint"> {{ seededHint }}</span>
    </p>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-bold">
        {{
          tab === 'monthly'
            ? 'Monthly Volume'
            : tab === 'daily'
              ? 'Daily Volume'
              : 'Per-slot Volume'
        }}
      </h3>
      <div v-if="!readOnly" class="flex flex-wrap gap-2">
        <Button
          v-if="tab !== 'slot'"
          size="sm"
          variant="outline"
          :disabled="busy || Boolean(editKey)"
          @click="addRow"
        >
          Add row
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="busy"
          :loading="busyAction === 'template'"
          @click="downloadTemplate"
        >
          {{ busyAction === 'template' ? 'Downloading…' : 'Download Excel Template' }}
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="busy"
          :loading="busyAction === 'export'"
          @click="downloadCurrent"
        >
          {{ busyAction === 'export' ? 'Exporting…' : 'Export Current' }}
        </Button>
        <Button
          size="sm"
          :disabled="busy"
          :loading="busyAction === 'import'"
          @click="triggerImport"
        >
          {{ busyAction === 'import' ? 'Importing…' : 'Import Excel' }}
        </Button>
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          class="hidden"
          @change="onImportFile"
        />
      </div>
    </div>

    <div class="overflow-x-auto rounded-md border">
      <Table v-if="tab === 'monthly'">
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Actual Volume</TableHead>
            <TableHead>Commercial Ratio</TableHead>
            <TableHead v-if="!readOnly">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="row in pagedMonths"
            :key="row.key"
            :class="editKey === row.key ? 'bg-muted/30' : undefined"
          >
            <TableCell>
              <MonthPicker
                v-if="editKey === row.key"
                v-model="periodDraft.month"
                class="w-[180px]"
              />
              <span v-else>{{ row.month }}</span>
            </TableCell>
            <TableCell>
              <NumberFieldControl
                v-if="editKey === row.key"
                v-model="periodDraft.actualVolume"
                class="max-w-36"
              />
              <span v-else>{{ formatNumber(row.actualVolume, 2) }}</span>
            </TableCell>
            <TableCell>
              <NumberFieldControl
                v-if="editKey === row.key"
                v-model="periodDraft.commercialRatio"
                class="max-w-36"
              />
              <span v-else>{{ formatNumber(row.commercialRatio, 4) }}</span>
            </TableCell>
            <TableCell v-if="!readOnly">
              <div class="flex gap-3">
                <template v-if="editKey === row.key">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    :loading="busyAction === 'save'"
                    @click="confirmEdit"
                  >
                    {{ busyAction === 'save' ? 'Saving…' : 'Confirm' }}
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busyAction === 'save'"
                    @click="cancelEdit"
                  >
                    Cancel
                  </Button>
                </template>
                <template v-else>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    @click="startEditMonth(row)"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="link-destructive"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy || !canDeleteMonth(row)"
                    :loading="busyAction === 'delete'"
                    @click="removeMonth(row)"
                  >
                    Delete
                  </Button>
                </template>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!monthDrafts.length">
            <TableCell :colspan="readOnly ? 3 : 4" class="h-20 text-center text-muted-foreground">
              No monthly volumes yet.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table v-else-if="tab === 'daily'">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Day</TableHead>
            <TableHead>Actual Volume</TableHead>
            <TableHead>Daily Adj. Ratio</TableHead>
            <TableHead v-if="!readOnly">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="row in pagedDays"
            :key="row.key"
            :class="editKey === row.key ? 'bg-muted/30' : undefined"
          >
            <TableCell>
              <DatePicker
                v-if="editKey === row.key"
                v-model="periodDraft.volumeDate"
                aria-label="Volume date"
                placeholder="Select date"
                class="w-[180px]"
              />
              <span v-else>{{ row.volumeDate }}</span>
            </TableCell>
            <TableCell>{{ dayName(editKey === row.key ? periodDraft.volumeDate : row.volumeDate) }}</TableCell>
            <TableCell>
              <NumberFieldControl
                v-if="editKey === row.key"
                v-model="periodDraft.actualVolume"
                class="max-w-36"
              />
              <span v-else>{{ formatNumber(row.actualVolume, 2) }}</span>
            </TableCell>
            <TableCell>
              <NumberFieldControl
                v-if="editKey === row.key"
                v-model="periodDraft.dailyAdjustmentRatio"
                class="max-w-36"
              />
              <span v-else>{{ formatNumber(row.dailyAdjustmentRatio, 4) }}</span>
            </TableCell>
            <TableCell v-if="!readOnly">
              <div class="flex gap-3">
                <template v-if="editKey === row.key">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    :loading="busyAction === 'save'"
                    @click="confirmEdit"
                  >
                    {{ busyAction === 'save' ? 'Saving…' : 'Confirm' }}
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busyAction === 'save'"
                    @click="cancelEdit"
                  >
                    Cancel
                  </Button>
                </template>
                <template v-else>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    @click="startEditDay(row)"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="link-destructive"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy || !canDeleteDay(row)"
                    :loading="busyAction === 'delete'"
                    @click="removeDay(row)"
                  >
                    Delete
                  </Button>
                </template>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!dayDrafts.length">
            <TableCell :colspan="readOnly ? 4 : 5" class="h-20 text-center text-muted-foreground">
              No daily volumes yet.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Slot</TableHead>
            <TableHead>Actual Volume</TableHead>
            <TableHead v-if="!readOnly">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="{ row, index } in pagedSlot" :key="`${row.slotStartAt}-${index}`">
            <TableCell>{{ row.slotStartAt.slice(0, 10) }}</TableCell>
            <TableCell>{{ formatSlotTime(row.slotStartAt, row.slotEndAt) }}</TableCell>
            <TableCell>
              <NumberFieldControl
                v-if="slotEditingIndex === index"
                v-model="slotEditValue"
                class="max-w-36"
              />
              <span v-else>{{ formatNumber(row.actualVolume, 2) }}</span>
            </TableCell>
            <TableCell v-if="!readOnly">
              <div class="flex gap-3">
                <template v-if="slotEditingIndex === index">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    :loading="busyAction === 'save'"
                    @click="confirmSlotEdit"
                  >
                    {{ busyAction === 'save' ? 'Saving…' : 'Confirm' }}
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busyAction === 'save'"
                    @click="slotEditingIndex = null"
                  >
                    Cancel
                  </Button>
                </template>
                <Button
                  v-else
                  size="sm"
                  variant="link"
                  class="h-auto px-0 font-semibold"
                  :disabled="busy"
                  @click="startEditSlot(index, row.actualVolume)"
                >
                  Edit
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!slotDrafts.length">
            <TableCell :colspan="readOnly ? 3 : 4" class="h-20 text-center text-muted-foreground">
              No slot training volumes yet.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <TablePager
      :total="currentTotal"
      :page="page"
      :page-size="pageSize"
      :label="tab === 'monthly' ? 'months' : tab === 'daily' ? 'days' : 'slots'"
      @update:page="page = $event"
      @update:page-size="
        (size) => {
          pageSize = size
          page = 1
        }
      "
    />
  </div>
</template>
