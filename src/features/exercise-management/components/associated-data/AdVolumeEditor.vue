<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
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
import { triggerDownload } from '../../downloadBlob'
import {
  dailyTrainDates,
  deriveSizingWindows,
  deriveSlotPeriodLabel,
  monthlyTrainMonths,
} from '../../periodWindows'
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
type BusyAction = 'template' | 'export' | 'import' | 'save'

const tab = ref<VolumeTab>('monthly')
const page = ref(1)
const pageSize = ref(10)
const busyAction = ref<BusyAction | null>(null)
const busy = computed(() => busyAction.value != null)

const monthDrafts = ref<MonthlyVolumeRequest[]>([])
const dayDrafts = ref<DailyVolumeRequest[]>([])
const slotDrafts = ref<SlotVolumeRequest[]>([])

const editingIndex = ref<number | null>(null)
const editValue = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => [props.monthly, props.daily, props.slot] as const,
  ([m, d, s]) => {
    monthDrafts.value = m.map((row) => ({
      month: row.month,
      actualVolume: row.actualVolume,
    }))
    dayDrafts.value = d.map((row) => ({
      volumeDate: row.volumeDate,
      actualVolume: row.actualVolume,
    }))
    slotDrafts.value = s.map((row) => ({
      slotStartAt: row.slotStartAt,
      slotEndAt: row.slotEndAt,
      actualVolume: row.actualVolume,
    }))
    editingIndex.value = null
  },
  { immediate: true, deep: true },
)

watch(tab, () => {
  page.value = 1
  editingIndex.value = null
})

const currentTotal = computed(() => {
  if (tab.value === 'monthly') return monthDrafts.value.length
  if (tab.value === 'daily') return dayDrafts.value.length
  return slotDrafts.value.length
})

const pagedMonthly = computed(() => slicePage(monthDrafts.value))
const pagedDaily = computed(() => slicePage(dayDrafts.value))
const pagedSlot = computed(() => slicePage(slotDrafts.value))

const windowHint = computed(() => {
  const sizing = deriveSizingWindows(props.sizingMonth)
  if (tab.value === 'monthly') {
    return `Training window: ${sizing.monthTrain} (${monthlyTrainMonths(props.sizingMonth).length} months)`
  }
  if (tab.value === 'daily') {
    return `Training window: ${sizing.dailyTrain} (${dailyTrainDates(props.sizingMonth).length} days)`
  }
  return `Training window: ${deriveSlotPeriodLabel(props.slotStartDate, props.slotWeeks)} · 09:00–22:00 / 30 min`
})

const seededHint = computed(() => {
  const hasArchive =
    props.monthly.some((r) => r.sourceType === 'ARCHIVE') ||
    props.daily.some((r) => r.sourceType === 'ARCHIVE') ||
    props.slot.some((r) => r.sourceType === 'ARCHIVE')
  if (!hasArchive) return ''
  return 'Overlapping training periods were seeded from the latest Approved archive. Forecast periods are not part of Volume Input.'
})

function slicePage<T>(rows: T[]) {
  const start = (page.value - 1) * pageSize.value
  return rows.slice(start, start + pageSize.value).map((row, i) => ({
    row,
    index: start + i,
  }))
}

function dayName(date: string) {
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

async function persistMonthly() {
  const saved = await putMonthlyVolumes.mutateAsync({
    exerciseId: props.exerciseId,
    body: monthDrafts.value,
  })
  emit('update:monthly', saved)
}

async function persistDaily() {
  const saved = await putDailyVolumes.mutateAsync({
    exerciseId: props.exerciseId,
    body: dayDrafts.value,
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

function startEdit(index: number, current: string | number | null | undefined) {
  if (props.readOnly || busy.value) return
  editingIndex.value = index
  editValue.value = numOrNull(current)
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
  if (editingIndex.value == null) return
  const idx = editingIndex.value
  const n = editValue.value
  if (n != null && n < 0) {
    toast.error('Volume must be non-negative.')
    return
  }
  try {
    await withBusy('save', async () => {
      if (tab.value === 'monthly') {
        const row = monthDrafts.value[idx]
        if (row) row.actualVolume = n
        await persistMonthly()
      } else if (tab.value === 'daily') {
        const row = dayDrafts.value[idx]
        if (row) row.actualVolume = n
        await persistDaily()
      } else {
        const row = slotDrafts.value[idx]
        if (row) row.actualVolume = Number(n ?? 0)
        await persistSlot()
      }
      editingIndex.value = null
      toast.success('Volume updated.')
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Update failed.')
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
      Rows are fixed from Exercise training periods — edit Actual Volume only.
    </p>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-bold">
        {{
          tab === 'monthly'
            ? 'Monthly Volume View'
            : tab === 'daily'
              ? 'Daily Volume View'
              : 'Per-slot Volume View'
        }}
      </h3>
      <div v-if="!readOnly" class="flex flex-wrap gap-2">
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
            <TableHead v-if="!readOnly">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="{ row, index } in pagedMonthly" :key="`${row.month}-${index}`">
            <TableCell>{{ row.month }}</TableCell>
            <TableCell>
              <NumberFieldControl v-if="editingIndex === index" v-model="editValue" class="max-w-36" />
              <span v-else>{{ formatNumber(row.actualVolume, 2) }}</span>
            </TableCell>
            <TableCell v-if="!readOnly">
              <div class="flex gap-3">
                <template v-if="editingIndex === index">
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
                    @click="editingIndex = null"
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
                  @click="startEdit(index, row.actualVolume)"
                >
                  Edit
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!monthDrafts.length">
            <TableCell :colspan="readOnly ? 2 : 3" class="h-20 text-center text-muted-foreground">
              No monthly training volumes yet.
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
            <TableHead v-if="!readOnly">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="{ row, index } in pagedDaily" :key="`${row.volumeDate}-${index}`">
            <TableCell>{{ row.volumeDate }}</TableCell>
            <TableCell>{{ dayName(row.volumeDate) }}</TableCell>
            <TableCell>
              <NumberFieldControl v-if="editingIndex === index" v-model="editValue" class="max-w-36" />
              <span v-else>{{ formatNumber(row.actualVolume, 2) }}</span>
            </TableCell>
            <TableCell v-if="!readOnly">
              <div class="flex gap-3">
                <template v-if="editingIndex === index">
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
                    @click="editingIndex = null"
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
                  @click="startEdit(index, row.actualVolume)"
                >
                  Edit
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!dayDrafts.length">
            <TableCell :colspan="readOnly ? 3 : 4" class="h-20 text-center text-muted-foreground">
              No daily training volumes yet.
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
              <NumberFieldControl v-if="editingIndex === index" v-model="editValue" class="max-w-36" />
              <span v-else>{{ formatNumber(row.actualVolume, 2) }}</span>
            </TableCell>
            <TableCell v-if="!readOnly">
              <div class="flex gap-3">
                <template v-if="editingIndex === index">
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
                    @click="editingIndex = null"
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
                  @click="startEdit(index, row.actualVolume)"
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
