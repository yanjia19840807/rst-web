<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/month-picker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { exerciseApi } from '../../api'
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

const tab = ref<VolumeTab>('monthly')
const page = ref(1)
const pageSize = ref(10)
const busy = ref(false)

const monthDrafts = ref<MonthlyVolumeRequest[]>([])
const dayDrafts = ref<DailyVolumeRequest[]>([])
const slotDrafts = ref<SlotVolumeRequest[]>([])

const editingIndex = ref<number | null>(null)
const editValue = ref('')

watch(
  () => [props.monthly, props.daily, props.slot] as const,
  ([m, d, s]) => {
    monthDrafts.value = m.map((row) => ({
      month: row.month,
      actualVolume: row.actualVolume,
      commercialRatio: row.commercialRatio,
      manualForecastVolume: row.manualForecastVolume,
    }))
    dayDrafts.value = d.map((row) => ({
      volumeDate: row.volumeDate,
      actualVolume: row.actualVolume,
      dailyAdjustmentRatio: row.dailyAdjustmentRatio,
      manualForecastVolume: row.manualForecastVolume,
    }))
    slotDrafts.value = s.map((row) => ({
      slotStartAt: row.slotStartAt,
      slotEndAt: row.slotEndAt,
      rawVolume: row.rawVolume,
      timezone: row.timezone,
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

const totalPages = computed(() => Math.max(1, Math.ceil(currentTotal.value / pageSize.value)))

const pagedMonthly = computed(() => slicePage(monthDrafts.value))
const pagedDaily = computed(() => slicePage(dayDrafts.value))
const pagedSlot = computed(() => slicePage(slotDrafts.value))

function slicePage<T>(rows: T[]) {
  const start = (page.value - 1) * pageSize.value
  return rows.slice(start, start + pageSize.value).map((row, i) => ({
    row,
    index: start + i,
  }))
}

function volumeOfMonth(row: MonthlyVolumeRequest) {
  return row.manualForecastVolume ?? row.actualVolume
}

function volumeOfDay(row: DailyVolumeRequest) {
  return row.manualForecastVolume ?? row.actualVolume
}

function nextMonth(last?: string) {
  if (!last) {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  const [y, m] = last.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextDate(last?: string) {
  if (!last) return new Date().toISOString().slice(0, 10)
  const d = new Date(`${last}T00:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function dayName(date: string) {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })
  } catch {
    return '—'
  }
}

async function persistMonthly() {
  const saved = await exerciseApi.putMonthlyVolumes(props.exerciseId, monthDrafts.value)
  emit('update:monthly', saved)
}

async function persistDaily() {
  const saved = await exerciseApi.putDailyVolumes(props.exerciseId, dayDrafts.value)
  emit('update:daily', saved)
}

async function persistSlot() {
  const saved = await exerciseApi.putSlotVolumes(props.exerciseId, slotDrafts.value)
  emit('update:slot', saved)
}

async function addRow() {
  if (props.readOnly) return
  busy.value = true
  try {
    if (tab.value === 'monthly') {
      const last = monthDrafts.value[monthDrafts.value.length - 1]?.month
      monthDrafts.value = [
        ...monthDrafts.value,
        { month: nextMonth(last), actualVolume: null, commercialRatio: null, manualForecastVolume: null },
      ]
      await persistMonthly()
      editingIndex.value = monthDrafts.value.length - 1
      editValue.value = ''
    } else if (tab.value === 'daily') {
      const last = dayDrafts.value[dayDrafts.value.length - 1]?.volumeDate
      dayDrafts.value = [
        ...dayDrafts.value,
        {
          volumeDate: nextDate(last),
          actualVolume: null,
          dailyAdjustmentRatio: null,
          manualForecastVolume: null,
        },
      ]
      await persistDaily()
      editingIndex.value = dayDrafts.value.length - 1
      editValue.value = ''
    } else {
      const last = slotDrafts.value[slotDrafts.value.length - 1]
      const start = last
        ? new Date(new Date(last.slotEndAt).getTime())
        : new Date()
      const end = new Date(start.getTime() + 30 * 60 * 1000)
      slotDrafts.value = [
        ...slotDrafts.value,
        {
          slotStartAt: start.toISOString(),
          slotEndAt: end.toISOString(),
          rawVolume: 0,
          timezone: last?.timezone || 'Asia/Shanghai',
        },
      ]
      await persistSlot()
      editingIndex.value = slotDrafts.value.length - 1
      editValue.value = '0'
    }
    page.value = totalPages.value
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Add row failed.')
  } finally {
    busy.value = false
  }
}

async function removeLast() {
  if (props.readOnly) return
  if (!currentTotal.value) return
  busy.value = true
  try {
    if (tab.value === 'monthly') {
      monthDrafts.value = monthDrafts.value.slice(0, -1)
      await persistMonthly()
    } else if (tab.value === 'daily') {
      dayDrafts.value = dayDrafts.value.slice(0, -1)
      await persistDaily()
    } else {
      slotDrafts.value = slotDrafts.value.slice(0, -1)
      await persistSlot()
    }
    editingIndex.value = null
    toast.success('Row removed.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Remove failed.')
  } finally {
    busy.value = false
  }
}

function startEdit(index: number, current: string | number | null | undefined) {
  if (props.readOnly) return
  editingIndex.value = index
  editValue.value = current == null ? '' : String(current)
}

async function confirmEdit() {
  if (editingIndex.value == null) return
  const idx = editingIndex.value
  const n = numOrNull(editValue.value)
  busy.value = true
  try {
    if (tab.value === 'monthly') {
      const row = monthDrafts.value[idx]
      if (row) row.manualForecastVolume = n
      await persistMonthly()
    } else if (tab.value === 'daily') {
      const row = dayDrafts.value[idx]
      if (row) row.manualForecastVolume = n
      await persistDaily()
    } else {
      const row = slotDrafts.value[idx]
      if (row) row.rawVolume = Number(n ?? 0)
      await persistSlot()
    }
    editingIndex.value = null
    toast.success('Volume updated.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Update failed.')
  } finally {
    busy.value = false
  }
}

function formatSlot(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${s.toISOString().slice(0, 10)} · ${fmt(s)}–${fmt(e)}`
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
        <Button size="sm" variant="outline" disabled>Download Excel Template</Button>
        <Button size="sm" disabled>Import Excel</Button>
        <Button size="sm" variant="outline" :disabled="busy" @click="addRow">Add Row</Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="busy || !currentTotal"
          @click="removeLast"
        >
          Remove Row
        </Button>
      </div>
    </div>

    <div class="overflow-x-auto rounded-md border">
      <Table v-if="tab === 'monthly'">
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Actual</TableHead>
            <TableHead>Manual forecast</TableHead>
            <TableHead v-if="!readOnly">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="{ row, index } in pagedMonthly" :key="`${row.month}-${index}`">
            <TableCell>
              <MonthPicker
                v-if="!readOnly"
                v-model="row.month"
                aria-label="Volume month"
                placeholder="Select month"
                class="w-[160px]"
                @update:model-value="persistMonthly"
              />
              <span v-else>{{ row.month }}</span>
            </TableCell>
            <TableCell>{{ formatNumber(row.actualVolume) }}</TableCell>
            <TableCell>
              <Input
                v-if="editingIndex === index"
                v-model="editValue"
                class="max-w-36"
              />
              <span v-else>{{ formatNumber(volumeOfMonth(row)) }}</span>
            </TableCell>
            <TableCell v-if="!readOnly">
              <div class="flex gap-3">
                <template v-if="editingIndex === index">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    @click="confirmEdit"
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
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
                  @click="startEdit(index, volumeOfMonth(row))"
                >
                  Edit
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!monthDrafts.length">
            <TableCell :colspan="readOnly ? 3 : 4" class="h-20 text-center text-muted-foreground">
              No monthly volumes.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table v-else-if="tab === 'daily'">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Day</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead v-if="!readOnly">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="{ row, index } in pagedDaily" :key="`${row.volumeDate}-${index}`">
            <TableCell>
              <DatePicker
                v-if="!readOnly"
                v-model="row.volumeDate"
                aria-label="Volume date"
                placeholder="Select date"
                class="w-[180px]"
                @update:model-value="persistDaily"
              />
              <span v-else>{{ row.volumeDate }}</span>
            </TableCell>
            <TableCell>{{ dayName(row.volumeDate) }}</TableCell>
            <TableCell>
              <Input
                v-if="editingIndex === index"
                v-model="editValue"
                class="max-w-36"
              />
              <span v-else>{{ formatNumber(volumeOfDay(row)) }}</span>
            </TableCell>
            <TableCell v-if="!readOnly">
              <div class="flex gap-3">
                <template v-if="editingIndex === index">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    @click="confirmEdit"
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
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
                  @click="startEdit(index, volumeOfDay(row))"
                >
                  Edit
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!dayDrafts.length">
            <TableCell :colspan="readOnly ? 3 : 4" class="h-20 text-center text-muted-foreground">
              No daily volumes.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Slot</TableHead>
            <TableHead>Timezone</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead v-if="!readOnly">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="{ row, index } in pagedSlot"
            :key="`${row.slotStartAt}-${index}`"
          >
            <TableCell>{{ formatSlot(row.slotStartAt, row.slotEndAt) }}</TableCell>
            <TableCell>{{ row.timezone }}</TableCell>
            <TableCell>
              <Input
                v-if="editingIndex === index"
                v-model="editValue"
                class="max-w-36"
              />
              <span v-else>{{ formatNumber(row.rawVolume) }}</span>
            </TableCell>
            <TableCell v-if="!readOnly">
              <div class="flex gap-3">
                <template v-if="editingIndex === index">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    @click="confirmEdit"
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
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
                  @click="startEdit(index, row.rawVolume)"
                >
                  Edit
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="!slotDrafts.length">
            <TableCell :colspan="readOnly ? 3 : 4" class="h-20 text-center text-muted-foreground">
              No slot volumes.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div
      class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span
          >{{
            tab === 'monthly' ? 'Monthly' : tab === 'daily' ? 'Daily' : 'Slot'
          }}
          · {{ currentTotal }} rows</span
        >
        <span>Rows per page:</span>
        <select
          v-model.number="pageSize"
          class="rounded border border-input bg-card px-2 py-1"
          @change="page = 1"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
        <span>Page {{ page }} / {{ totalPages }}</span>
      </div>
      <div class="flex gap-2">
        <Button size="sm" variant="outline" :disabled="page <= 1" @click="page--">
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="page >= totalPages"
          @click="page++"
        >
          Next
        </Button>
      </div>
    </div>
  </div>
</template>
