<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import { Info } from '@lucide/vue'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePager from '@/components/TablePager.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
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

import { showOperationNotices } from '@/composables/useOperationNotices'

import { exerciseApi } from '../../api'
import { useExerciseAssociatedDataMutations } from '../../api/mutations'
import { useToolkitVolumePointsQuery } from '../../api/queries'
import { triggerDownload } from '../../downloadBlob'
import { useBeforeAssociatedDataWrite } from '../../composables/useAssociatedDataSaveGuard'
import { addDaysIso, dailyTrainDates, deriveSlotPeriodLabel, shiftYearMonth } from '../../periodWindows'
import {
  dailyVolumeContextIssue,
  dailyVolumeRowSchema,
  emptyDailyVolumeRow,
  emptyMonthlyVolumeRow,
  emptySlotVolumeRow,
  monthlyVolumeContextIssue,
  monthlyVolumeRowSchema,
  slotVolumeRowSchema,
  type DailyVolumeRowValues,
  type MonthlyVolumeRowValues,
  type SlotVolumeRowValues,
} from '../../schemas/volume'
import { slotPeriodSchema } from '../../schemas/exercisePeriods'
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
type BusyAction = 'template' | 'export' | 'import' | 'save' | 'delete' | 'period'

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
  slotStartDate: string | null
  slotWeeks: number | null
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
  updateSlotPeriod,
  importMonthlyVolumes,
  importDailyVolumes,
  importSlotVolumes,
} = useExerciseAssociatedDataMutations()
const beforeAssociatedDataWrite = useBeforeAssociatedDataWrite()

const tab = ref<VolumeTab>('monthly')
const page = ref(1)
const pageSize = ref(10)
const busyAction = ref<BusyAction | null>(null)
const busy = computed(() => busyAction.value != null)

const monthDrafts = ref<DraftMonthly[]>([])
const dayDrafts = ref<DraftDaily[]>([])
const slotDrafts = ref<SlotVolumeRequest[]>([])

const editKey = ref<string | null>(null)
const slotEditingIndex = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const draftSlotStartDate = ref('')
const draftSlotWeeks = ref<number | ''>('')
const confirmPeriodOpen = ref(false)

const periodSet = computed(() => Boolean(props.slotStartDate && props.slotWeeks))
const periodReady = computed(() => Boolean(draftSlotStartDate.value && draftSlotWeeks.value))

watch(
  () => [props.slotStartDate, props.slotWeeks] as const,
  ([start, weeks]) => {
    draftSlotStartDate.value = start ?? ''
    draftSlotWeeks.value = weeks ?? ''
  },
  { immediate: true },
)

const monthlyForm = useForm<MonthlyVolumeRowValues>({
  validationSchema: toTypedSchema(monthlyVolumeRowSchema),
  initialValues: emptyMonthlyVolumeRow(),
  validateOnMount: false,
})
const [month] = monthlyForm.defineField('month')
const [monthlyActualVolume] = monthlyForm.defineField('actualVolume')
const [commercialRatio] = monthlyForm.defineField('commercialRatio')
const monthlyErrors = monthlyForm.errors

const dailyForm = useForm<DailyVolumeRowValues>({
  validationSchema: toTypedSchema(dailyVolumeRowSchema),
  initialValues: emptyDailyVolumeRow(),
  validateOnMount: false,
})
const [volumeDate] = dailyForm.defineField('volumeDate')
const [dailyActualVolume] = dailyForm.defineField('actualVolume')
const [dailyAdjustmentRatio] = dailyForm.defineField('dailyAdjustmentRatio')
const dailyErrors = dailyForm.errors

const slotForm = useForm<SlotVolumeRowValues>({
  validationSchema: toTypedSchema(slotVolumeRowSchema),
  initialValues: emptySlotVolumeRow(),
  validateOnMount: false,
})
const [slotActualVolume] = slotForm.defineField('actualVolume')
const slotErrors = slotForm.errors

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
      monthDrafts.value = [...pendingMonths, ...monthDrafts.value]
      editKey.value = keepEdit
    } else if (keepEdit && pendingDays.length) {
      dayDrafts.value = [...pendingDays, ...dayDrafts.value]
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

watch(month, (value) => {
  if (!editKey.value || tab.value !== 'monthly' || monthlyActualVolume.value != null) return
  const seeded = toolkitMonthMap.value.get(value ?? '')
  if (seeded != null) monthlyActualVolume.value = seeded
})

watch(volumeDate, (value) => {
  if (!editKey.value || tab.value !== 'daily' || dailyActualVolume.value != null) return
  const seeded = toolkitDayMap.value.get(value ?? '')
  if (seeded != null) dailyActualVolume.value = seeded
})

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
    return 'Months must be consecutive, unique, and on or before Sizing Month. Actual Volume is required and must be non-negative. Commercial Ratio is optional.'
  }
  if (tab.value === 'daily') {
    return 'Dates must be consecutive, unique, and on or before Sizing Month. Actual Volume is required and must be non-negative. Daily Volume Adjustment Ratio is optional.'
  }
  if (!periodSet.value) {
    return 'Set a Slot Period to generate the per-slot grid. Each day is 09:00–22:00 in 30-minute slots.'
  }
  return `Slot window: ${deriveSlotPeriodLabel(props.slotStartDate, props.slotWeeks)} · 09:00–22:00 / 30 min`
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

function canDeleteMonth(row: DraftMonthly) {
  if (row.key.startsWith('new-')) return true
  const rows = confirmedMonths()
  const first = rows[0]
  const last = rows[rows.length - 1]
  if (!first || !last || rows.length <= 1) return true
  return row.key === first.key || row.key === last.key
}

function canDeleteDay(row: DraftDaily) {
  if (row.key.startsWith('new-')) return true
  const rows = confirmedDays()
  const first = rows[0]
  const last = rows[rows.length - 1]
  if (!first || !last || rows.length <= 1) return true
  return row.key === first.key || row.key === last.key
}

function suggestedAddMonth() {
  const months = confirmedMonths().map((row) => row.month)
  const first = months[0]
  const last = months[months.length - 1]
  if (!first || !last) return props.sizingMonth
  const after = shiftYearMonth(last, 1)
  if (after <= props.sizingMonth) return after
  return shiftYearMonth(first, -1)
}

function suggestedAddDate() {
  const dates = confirmedDays().map((row) => row.volumeDate)
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (!first || !last) return sizingMonthEnd.value
  const after = addDaysIso(last, 1)
  if (after <= sizingMonthEnd.value) return after
  return addDaysIso(first, -1)
}

function slicePage<T>(rows: T[], currentPage: number, size: number) {
  const start = (currentPage - 1) * size
  return rows.slice(start, start + size)
}

function dayName(date: string | null | undefined) {
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

function requestApplyPeriod() {
  if (props.readOnly || busy.value) return
  const parsed = slotPeriodSchema.safeParse({
    slotStartDate: draftSlotStartDate.value,
    slotWeeks: draftSlotWeeks.value,
  })
  if (!parsed.success) {
    toast.warning(parsed.error.issues[0]?.message ?? 'Please complete the Slot Period.')
    return
  }
  if (periodSet.value || slotDrafts.value.length) {
    confirmPeriodOpen.value = true
    return
  }
  void applyPeriod()
}

async function applyPeriod() {
  if (props.readOnly || busy.value) return
  if (!(await beforeAssociatedDataWrite())) return
  try {
    await withBusy('period', async () => {
      const result = await updateSlotPeriod.mutateAsync({
        exerciseId: props.exerciseId,
        body: {
          slotStartDate: draftSlotStartDate.value,
          slotWeeks: Number(draftSlotWeeks.value),
        },
      })
      emit('update:slot', result.volumes)
      confirmPeriodOpen.value = false
      const summary = 'Per-slot Volume grid generated.'
      const shown = showOperationNotices({
        summary,
        notices: result.notices ?? [],
      })
      if (!shown) toast.success(summary)
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not apply Slot Period.')
  }
}

function firstFormError(bag: Record<string, unknown>): string | undefined {
  for (const value of Object.values(bag)) {
    if (typeof value === 'string' && value.trim()) return value
  }
}

function startEditMonth(row: DraftMonthly) {
  if (props.readOnly || busy.value) return
  monthlyForm.resetForm({
    values: {
      month: row.month,
      actualVolume: row.actualVolume,
      commercialRatio: row.commercialRatio,
    },
  })
  editKey.value = row.key
}

function startEditDay(row: DraftDaily) {
  if (props.readOnly || busy.value) return
  dailyForm.resetForm({
    values: {
      volumeDate: row.volumeDate,
      actualVolume: row.actualVolume,
      dailyAdjustmentRatio: row.dailyAdjustmentRatio,
    },
  })
  editKey.value = row.key
}

function startEditSlot(index: number, current: string | number | null | undefined) {
  if (props.readOnly || busy.value || !periodSet.value) return
  slotForm.resetForm({
    values: { actualVolume: numOrNull(current) },
  })
  slotEditingIndex.value = index
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

  if (tab.value === 'monthly') {
    const result = await monthlyForm.validate()
    if (!result.valid) {
      toast.warning(firstFormError(monthlyForm.errors.value) ?? 'Check the highlighted fields.')
      return
    }
    const nextMonth = String(monthlyForm.values.month).trim()
    const context = monthlyVolumeContextIssue(nextMonth, {
      sizingMonth: props.sizingMonth,
      otherMonths: monthDrafts.value.filter((row) => row.key !== key).map((row) => row.month),
    })
    if (context) {
      monthlyForm.setFieldError(context.path, context.message)
      toast.warning(context.message)
      return
    }
    if (!(await beforeAssociatedDataWrite())) return
    try {
      await withBusy('save', async () => {
        monthDrafts.value = monthDrafts.value.map((row) =>
          row.key === key
            ? {
                key: nextMonth,
                month: nextMonth,
                actualVolume: Number(monthlyForm.values.actualVolume),
                commercialRatio: monthlyForm.values.commercialRatio,
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

  const result = await dailyForm.validate()
  if (!result.valid) {
    toast.warning(firstFormError(dailyForm.errors.value) ?? 'Check the highlighted fields.')
    return
  }
  const nextDate = String(dailyForm.values.volumeDate).trim()
  const context = dailyVolumeContextIssue(nextDate, {
    sizingMonthEnd: sizingMonthEnd.value,
    otherDates: dayDrafts.value.filter((row) => row.key !== key).map((row) => row.volumeDate),
  })
  if (context) {
    dailyForm.setFieldError(context.path, context.message)
    toast.warning(context.message)
    return
  }
  if (!(await beforeAssociatedDataWrite())) return
  try {
    await withBusy('save', async () => {
      dayDrafts.value = dayDrafts.value.map((row) =>
        row.key === key
          ? {
              key: nextDate,
              volumeDate: nextDate,
              actualVolume: Number(dailyForm.values.actualVolume),
              dailyAdjustmentRatio: dailyForm.values.dailyAdjustmentRatio,
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
  const result = await slotForm.validate()
  if (!result.valid) {
    toast.warning(firstFormError(slotForm.errors.value) ?? 'Check the highlighted fields.')
    return
  }
  if (!(await beforeAssociatedDataWrite())) return
  try {
    await withBusy('save', async () => {
      const row = slotDrafts.value[idx]
      if (row) row.actualVolume = Number(slotForm.values.actualVolume)
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
    const nextMonth = suggestedAddMonth()
    monthDrafts.value = [
      { key, month: nextMonth, actualVolume: null, commercialRatio: null },
      ...monthDrafts.value,
    ]
    monthlyForm.resetForm({
      values: {
        month: nextMonth,
        actualVolume: toolkitMonthMap.value.get(nextMonth) ?? null,
        commercialRatio: null,
      },
    })
  } else if (tab.value === 'daily') {
    const nextDate = suggestedAddDate()
    dayDrafts.value = [
      { key, volumeDate: nextDate, actualVolume: null, dailyAdjustmentRatio: null },
      ...dayDrafts.value,
    ]
    dailyForm.resetForm({
      values: {
        volumeDate: nextDate,
        actualVolume: toolkitDayMap.value.get(nextDate) ?? null,
        dailyAdjustmentRatio: null,
      },
    })
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
  if (!(await beforeAssociatedDataWrite())) return
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
  if (!(await beforeAssociatedDataWrite())) return
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
  if (tab.value === 'slot' && !periodSet.value) {
    toast.warning('Set a Slot Period to generate the per-slot grid.')
    return
  }
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
  if (tab.value === 'slot' && !periodSet.value) {
    toast.warning('Set a Slot Period to generate the per-slot grid.')
    return
  }
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
  if (tab.value === 'slot' && !periodSet.value) {
    toast.warning('Set a Slot Period to generate the per-slot grid.')
    return
  }
  fileInput.value?.click()
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || props.readOnly) return
  if (!(await beforeAssociatedDataWrite())) return
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

    <Alert v-if="tab !== 'slot'" variant="info">
      <Info />
      <AlertDescription>{{ windowHint }}</AlertDescription>
    </Alert>

    <div
      v-if="tab === 'slot'"
      class="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 px-3 py-3"
    >
      <div class="grid gap-1.5">
        <span class="text-xs text-muted-foreground">Start date</span>
        <DatePicker
          v-model="draftSlotStartDate"
          aria-label="Choose slot start date"
          placeholder="Select start date"
          size="sm"
          class="w-[180px]"
          :disabled="readOnly || busy"
        />
      </div>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Weeks
        <select
          v-model="draftSlotWeeks"
          class="h-8 w-20 rounded-[min(var(--radius-md),12px)] border border-input bg-card px-2 text-[0.8rem] text-foreground"
          :disabled="readOnly || busy"
        >
          <option value="">—</option>
          <option v-for="week in 12" :key="week" :value="week">{{ week }}</option>
        </select>
      </label>
      <Button
        v-if="!readOnly"
        size="sm"
        :disabled="busy || !periodReady"
        :loading="busyAction === 'period'"
        @click="requestApplyPeriod"
      >
        {{ busyAction === 'period' ? 'Applying…' : 'Apply Period' }}
      </Button>
    </div>

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
          :disabled="busy || (tab === 'slot' && !periodSet)"
          :loading="busyAction === 'template'"
          @click="downloadTemplate"
        >
          {{ busyAction === 'template' ? 'Downloading…' : 'Download Excel Template' }}
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="busy || (tab === 'slot' && !periodSet)"
          :loading="busyAction === 'export'"
          @click="downloadCurrent"
        >
          {{ busyAction === 'export' ? 'Exporting…' : 'Export Current' }}
        </Button>
        <Button
          size="sm"
          :disabled="busy || (tab === 'slot' && !periodSet)"
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

    <Alert v-if="tab === 'slot'" variant="info">
      <Info />
      <AlertDescription>{{ windowHint }}</AlertDescription>
    </Alert>

    <div class="min-w-0 overflow-x-auto rounded-md border">
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
                v-model="month"
                class="w-[180px]"
                :invalid="Boolean(monthlyErrors.month)"
              />
              <span v-else>{{ row.month }}</span>
            </TableCell>
            <TableCell>
              <NumberFieldControl
                v-if="editKey === row.key"
                v-model="monthlyActualVolume"
                class="max-w-36"
                :invalid="Boolean(monthlyErrors.actualVolume)"
              />
              <span v-else>{{ formatNumber(row.actualVolume, 2) }}</span>
            </TableCell>
            <TableCell>
              <NumberFieldControl
                v-if="editKey === row.key"
                v-model="commercialRatio"
                class="max-w-36"
                :invalid="Boolean(monthlyErrors.commercialRatio)"
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
                v-model="volumeDate"
                aria-label="Volume date"
                placeholder="Select date"
                class="w-[180px]"
                :invalid="Boolean(dailyErrors.volumeDate)"
              />
              <span v-else>{{ row.volumeDate }}</span>
            </TableCell>
            <TableCell>{{ dayName(editKey === row.key ? volumeDate : row.volumeDate) }}</TableCell>
            <TableCell>
              <NumberFieldControl
                v-if="editKey === row.key"
                v-model="dailyActualVolume"
                class="max-w-36"
                :invalid="Boolean(dailyErrors.actualVolume)"
              />
              <span v-else>{{ formatNumber(row.actualVolume, 2) }}</span>
            </TableCell>
            <TableCell>
              <NumberFieldControl
                v-if="editKey === row.key"
                v-model="dailyAdjustmentRatio"
                class="max-w-36"
                :invalid="Boolean(dailyErrors.dailyAdjustmentRatio)"
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
                v-model="slotActualVolume"
                class="max-w-36"
                :invalid="Boolean(slotErrors.actualVolume)"
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
              {{
                periodSet
                  ? 'No slot training volumes yet.'
                  : 'Set a Slot Period to generate the per-slot grid.'
              }}
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

    <ConfirmDialog
      v-model:open="confirmPeriodOpen"
      title="Change Slot Period"
      description="Changing the period rebuilds the grid. Existing slot values will be cleared."
      confirm-label="Apply Period"
      confirm-variant="default"
      :pending="busyAction === 'period'"
      @confirm="applyPeriod"
    />
  </div>
</template>
