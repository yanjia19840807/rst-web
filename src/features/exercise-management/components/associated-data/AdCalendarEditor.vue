<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { CalendarRequest, CalendarView, Holiday } from '../../types'
import AdMetric from './AdMetric.vue'

type DraftHoliday = {
  key: string
  holidayDate: string
  holidayName: string
  holidayType: string
  source: 'Auto' | 'Custom'
  workingDayOverride: boolean | null
}

const props = defineProps<{
  modelValue: CalendarView | null
  readOnly?: boolean
}>()

const header = reactive({
  countryCode: '',
  timezone: '',
  weekendCode: 'SAT_SUN',
})

const rows = ref<DraftHoliday[]>([])
const editKey = ref<string | null>(null)
const draft = reactive({
  holidayDate: '',
  holidayName: '',
  holidayType: 'PUBLIC',
})

watch(
  () => props.modelValue,
  (cal) => {
    if (!cal) return
    header.countryCode = cal.countryCode ?? ''
    header.timezone = cal.timezone ?? ''
    header.weekendCode = cal.weekendCode ?? 'SAT_SUN'
    rows.value = cal.holidays.map((h) => toDraft(h, cal.baselineSource))
    editKey.value = null
  },
  { immediate: true },
)

const countryBaseline = computed(() => {
  const country = header.countryCode || props.modelValue?.countryCode || '—'
  const source = props.modelValue?.baselineSource
  if (!source) return country
  return `${country} (${source})`
})

function toDraft(h: Holiday, baselineSource: string | null | undefined): DraftHoliday {
  const isAuto =
    baselineSource?.toUpperCase().includes('AUTO') ||
    h.holidayType.toUpperCase() === 'PUBLIC' ||
    h.holidayType.toUpperCase() === 'AUTO'
  return {
    key: h.id,
    holidayDate: h.holidayDate,
    holidayName: h.holidayName,
    holidayType: h.holidayType,
    source: isAuto ? 'Auto' : 'Custom',
    workingDayOverride: h.workingDayOverride,
  }
}

function startEdit(row: DraftHoliday) {
  editKey.value = row.key
  draft.holidayDate = row.holidayDate
  draft.holidayName = row.holidayName
  draft.holidayType = row.holidayType
}

function cancelEdit() {
  if (editKey.value?.startsWith('new-')) {
    rows.value = rows.value.filter((r) => r.key !== editKey.value)
  }
  editKey.value = null
}

function commitEdit() {
  if (!editKey.value) return
  rows.value = rows.value.map((row) =>
    row.key === editKey.value
      ? {
          ...row,
          holidayDate: draft.holidayDate,
          holidayName: draft.holidayName,
          holidayType: draft.holidayType,
          source: 'Custom',
        }
      : row,
  )
  editKey.value = null
}

function addCustom() {
  if (editKey.value) return
  const key = `new-${Date.now()}`
  rows.value = [
    ...rows.value,
    {
      key,
      holidayDate: '',
      holidayName: '',
      holidayType: 'CUSTOM',
      source: 'Custom',
      workingDayOverride: null,
    },
  ]
  editKey.value = key
  draft.holidayDate = ''
  draft.holidayName = ''
  draft.holidayType = 'CUSTOM'
}

function removeRow(key: string) {
  rows.value = rows.value.filter((row) => row.key !== key)
  if (editKey.value === key) editKey.value = null
}

function toRequest(): CalendarRequest {
  return {
    countryCode: header.countryCode || null,
    timezone: header.timezone || null,
    weekendCode: header.weekendCode || null,
    baselineSource: props.modelValue?.baselineSource ?? null,
    baselineVersion: props.modelValue?.baselineVersion ?? null,
    holidays: rows.value
      .filter((row) => row.holidayDate && row.holidayName)
      .map((row) => ({
        holidayDate: row.holidayDate,
        holidayName: row.holidayName,
        holidayType: row.holidayType || 'CUSTOM',
        workingDayOverride: row.workingDayOverride,
      })),
  }
}

defineExpose({ toRequest })
</script>

<template>
  <div class="space-y-4">
    <div class="max-w-xs">
      <AdMetric
        label="Country Baseline"
        :value="countryBaseline"
        hint="Auto-generated from country calendar"
      />
    </div>

    <section class="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
      <label class="grid gap-1 text-sm"
        >Country code
        <Input v-model="header.countryCode" :disabled="readOnly" />
      </label>
      <label class="grid gap-1 text-sm"
        >Timezone
        <Input v-model="header.timezone" :disabled="readOnly" />
      </label>
      <label class="grid gap-1 text-sm"
        >Weekend code
        <Input v-model="header.weekendCode" :disabled="readOnly" />
      </label>
    </section>

    <section class="rounded-lg border p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h3 class="text-base font-bold">Holiday List</h3>
        <Button v-if="!readOnly" size="sm" variant="outline" @click="addCustom">
          Add Custom Holiday
        </Button>
      </div>

      <div class="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Simulation treatment</TableHead>
              <TableHead v-if="!readOnly">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in rows"
              :key="row.key"
              :class="editKey === row.key ? 'bg-muted/30' : undefined"
            >
              <TableCell>
                <Input
                  v-if="editKey === row.key"
                  v-model="draft.holidayDate"
                  type="date"
                />
                <span v-else>{{ row.holidayDate }}</span>
              </TableCell>
              <TableCell>
                <Input
                  v-if="editKey === row.key"
                  v-model="draft.holidayName"
                  placeholder="Description"
                />
                <span v-else>{{ row.holidayName }}</span>
              </TableCell>
              <TableCell>{{ header.countryCode || '—' }}</TableCell>
              <TableCell>
                <span
                  class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                  :class="
                    row.source === 'Auto'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  "
                >
                  {{ row.source }}
                </span>
              </TableCell>
              <TableCell>
                <Input
                  v-if="editKey === row.key"
                  v-model="draft.holidayType"
                  placeholder="Type"
                />
                <span v-else>
                  {{
                    row.workingDayOverride ? 'Working day override' : 'Non-working day'
                  }}
                  · {{ row.holidayType }}
                </span>
              </TableCell>
              <TableCell v-if="!readOnly">
                <div class="flex gap-1.5">
                  <template v-if="editKey === row.key">
                    <Button size="sm" @click="commitEdit">Confirm</Button>
                    <Button size="sm" variant="outline" @click="cancelEdit">Cancel</Button>
                  </template>
                  <template v-else>
                    <Button size="sm" variant="outline" @click="startEdit(row)">Edit</Button>
                    <Button
                      v-if="row.source === 'Custom'"
                      size="sm"
                      variant="outline"
                      @click="removeRow(row.key)"
                    >
                      Delete
                    </Button>
                  </template>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="!rows.length">
              <TableCell
                :colspan="readOnly ? 5 : 6"
                class="h-20 text-center text-sm text-muted-foreground italic"
              >
                No holidays configured.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </div>
</template>
