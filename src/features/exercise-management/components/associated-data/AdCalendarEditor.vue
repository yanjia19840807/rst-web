<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import ReadOnlyField from '@/components/ReadOnlyField.vue'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
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
}

const props = defineProps<{
  modelValue: CalendarView | null
  readOnly?: boolean
}>()

const weekendCode = ref('SAT_SUN')
const rows = ref<DraftHoliday[]>([])
const editKey = ref<string | null>(null)
const draft = reactive({
  holidayDate: '',
  holidayName: '',
})

watch(
  () => props.modelValue,
  (cal) => {
    if (!cal) return
    weekendCode.value = cal.weekendCode ?? 'SAT_SUN'
    rows.value = cal.holidays.map((h) => toDraft(h))
    editKey.value = null
  },
  { immediate: true },
)

const templateSource = computed(() => {
  const source = props.modelValue?.baselineSource
  const version = props.modelValue?.sourceTemplateVersion
  if (!source) return '—'
  if (version != null) return `${source} v${version}`
  return source
})

const workingDaysLabel = computed(() => {
  const days = props.modelValue?.workingDaysPerYear
  const year = props.modelValue?.baselineYear
  if (days == null) return '—'
  return year != null ? `${days} (${year})` : String(days)
})

function toDraft(h: Holiday): DraftHoliday {
  const type = h.holidayType.toUpperCase()
  const isAuto = type === 'BASELINE' || type === 'PUBLIC' || type === 'AUTO'
  return {
    key: h.id,
    holidayDate: h.holidayDate,
    holidayName: h.holidayName,
    holidayType: isAuto ? 'BASELINE' : 'CUSTOM',
    source: isAuto ? 'Auto' : 'Custom',
  }
}

function startEdit(row: DraftHoliday) {
  editKey.value = row.key
  draft.holidayDate = row.holidayDate
  draft.holidayName = row.holidayName
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
          holidayType: 'CUSTOM',
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
    },
  ]
  editKey.value = key
  draft.holidayDate = ''
  draft.holidayName = ''
}

function removeRow(key: string) {
  rows.value = rows.value.filter((row) => row.key !== key)
  if (editKey.value === key) editKey.value = null
}

function toRequest(): CalendarRequest {
  return {
    weekendCode: weekendCode.value || null,
    baselineSource: props.modelValue?.baselineSource ?? null,
    baselineVersion: props.modelValue?.baselineVersion ?? null,
    holidays: rows.value
      .filter((row) => row.holidayDate && row.holidayName)
      .map((row) => ({
        holidayDate: row.holidayDate,
        holidayName: row.holidayName,
        holidayType: row.source === 'Auto' ? 'BASELINE' : 'CUSTOM',
      })),
  }
}

defineExpose({ toRequest })
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <AdMetric
        label="Template source"
        :value="templateSource"
        hint="From Center holiday template"
      />
      <AdMetric
        label="Working days / year"
        :value="workingDaysLabel"
        hint="NETWORKDAYS from weekend + holidays (sizing year)"
      />
      <label class="grid gap-1 rounded-lg border bg-card p-4 text-sm">
        Weekend code
        <select
          v-if="!readOnly"
          v-model="weekendCode"
          class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="SAT_SUN">SAT_SUN</option>
          <option value="SUN_ONLY">SUN_ONLY</option>
          <option value="FRI_SAT">FRI_SAT</option>
          <option value="NONE">NONE</option>
        </select>
        <ReadOnlyField v-else :value="weekendCode" />
      </label>
    </div>

    <section class="rounded-lg border bg-card p-4">
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
              <TableHead>Source</TableHead>
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
                <DatePicker
                  v-if="editKey === row.key"
                  v-model="draft.holidayDate"
                  aria-label="Holiday date"
                  placeholder="Select date"
                  class="w-[180px]"
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
              <TableCell v-if="!readOnly">
                <div class="flex gap-3">
                  <template v-if="editKey === row.key">
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
                      @click="commitEdit"
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
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
                      @click="startEdit(row)"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="link-destructive"
                      class="h-auto px-0 font-semibold"
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
                :colspan="readOnly ? 3 : 4"
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
