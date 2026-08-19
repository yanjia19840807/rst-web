<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

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
import {
  HOLIDAY_TYPE_OPTIONS,
  type HolidayTypeValue,
  holidayTypeLabel,
  normalizeHolidayType,
} from '../../weekendCodes'

type DraftHoliday = {
  key: string
  holidayDate: string
  holidayName: string
  holidayType: HolidayTypeValue
}

const props = defineProps<{
  modelValue: CalendarView | null
  readOnly?: boolean
}>()

const rows = ref<DraftHoliday[]>([])
const editKey = ref<string | null>(null)
const draft = reactive({
  holidayDate: '',
  holidayName: '',
  holidayType: 'HOLIDAY' as HolidayTypeValue,
})

watch(
  () => props.modelValue,
  (cal) => {
    if (!cal) return
    rows.value = cal.holidays.map((h) => toDraft(h))
    editKey.value = null
  },
  { immediate: true },
)

function toDraft(h: Holiday): DraftHoliday {
  return {
    key: h.id,
    holidayDate: h.holidayDate,
    holidayName: h.holidayName,
    holidayType: normalizeHolidayType(h.holidayType),
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
        }
      : row,
  )
  editKey.value = null
}

function addDay() {
  if (editKey.value) return
  const key = `new-${Date.now()}`
  rows.value = [
    ...rows.value,
    {
      key,
      holidayDate: '',
      holidayName: '',
      holidayType: 'HOLIDAY',
    },
  ]
  editKey.value = key
  draft.holidayDate = ''
  draft.holidayName = ''
  draft.holidayType = 'HOLIDAY'
}

function removeRow(key: string) {
  rows.value = rows.value.filter((row) => row.key !== key)
  if (editKey.value === key) editKey.value = null
}

function toRequest(): CalendarRequest {
  return {
    holidays: rows.value
      .filter((row) => row.holidayDate)
      .map((row) => ({
        holidayDate: row.holidayDate,
        holidayName: row.holidayName,
        holidayType: row.holidayType,
      })),
  }
}

defineExpose({ toRequest })
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-lg border bg-card p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-bold">Public holidays</h3>
          <p class="text-xs text-muted-foreground">
            Holiday and Weekend are rest days. Normal is a makeup working day.
          </p>
        </div>
        <Button v-if="!readOnly" size="sm" variant="outline" @click="addDay">
          Add day
        </Button>
      </div>

      <div class="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
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
                <select
                  v-if="editKey === row.key"
                  v-model="draft.holidayType"
                  class="flex h-9 w-full min-w-[140px] rounded-md border border-input bg-card px-3 text-sm"
                  aria-label="Day type"
                >
                  <option
                    v-for="option in HOLIDAY_TYPE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <span v-else>{{ holidayTypeLabel(row.holidayType) }}</span>
              </TableCell>
              <TableCell>
                <Input
                  v-if="editKey === row.key"
                  v-model="draft.holidayName"
                  placeholder="Description"
                />
                <span v-else>{{ row.holidayName }}</span>
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
                No holiday dates configured.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </div>
</template>
