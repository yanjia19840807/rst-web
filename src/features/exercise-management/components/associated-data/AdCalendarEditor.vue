<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { computed, ref } from 'vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import { Info } from '@lucide/vue'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePager from '@/components/TablePager.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

import { exerciseApi } from '../../api'
import { useExerciseAssociatedDataMutations } from '../../api/mutations'
import { useBeforeAssociatedDataWrite } from '../../composables/useAssociatedDataSaveGuard'
import { triggerDownload } from '../../downloadBlob'
import {
  calendarDateTakenIssue,
  calendarHolidayRowSchema,
  emptyCalendarHolidayRow,
  toCalendarRequest,
  toHolidayRequest,
  type CalendarHolidayRowValues,
} from '../../schemas/calendar'
import type { CalendarView, Holiday, HolidayRequest } from '../../types'
import { FieldUnit, withUnit } from '../../fieldUnits'
import {
  HOLIDAY_TYPE_OPTIONS,
  countHolidayTypes,
  holidayTypeLabel,
  normalizeHolidayType,
} from '../../weekendCodes'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'

type BusyAction = 'template' | 'export' | 'import' | 'save' | 'delete'

const props = defineProps<{
  modelValue: CalendarView | null
  exerciseId: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:calendar': [value: CalendarView]
}>()

const { putCalendar, importCalendar } = useExerciseAssociatedDataMutations()
const beforeAssociatedDataWrite = useBeforeAssociatedDataWrite()

const adding = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<Holiday | null>(null)
const deleteOpen = ref(false)
const exportOpen = ref(false)
const page = ref(1)
const pageSize = ref(10)
const busyAction = ref<BusyAction | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const { defineField, errors, resetForm, setFieldError, validate, values } =
  useForm<CalendarHolidayRowValues>({
    validationSchema: toTypedSchema(calendarHolidayRowSchema),
    initialValues: emptyCalendarHolidayRow(),
    validateOnMount: false,
  })
const [holidayDate] = defineField('holidayDate')
const [holidayName] = defineField('holidayName')
const [holidayType] = defineField('holidayType')

const busy = computed(() => busyAction.value != null)
const formLocked = computed(() => adding.value || editingId.value != null)

const holidays = computed(() => props.modelValue?.holidays ?? [])
const holidayCounts = computed(() => countHolidayTypes(holidays.value))

const sortedRows = computed(() =>
  [...holidays.value].sort((a, b) => a.holidayDate.localeCompare(b.holidayDate)),
)

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedRows.value.slice(start, start + pageSize.value)
})

function resetDraft() {
  resetForm({ values: emptyCalendarHolidayRow() })
}

function fillDraft(row: Holiday) {
  resetForm({
    values: {
      holidayDate: row.holidayDate,
      holidayName: row.holidayName,
      holidayType: normalizeHolidayType(row.holidayType),
    },
  })
}

function firstFormError(bag: Record<string, unknown>): string | undefined {
  for (const value of Object.values(bag)) {
    if (typeof value === 'string' && value.trim()) return value
  }
}

function asRequest(row: Holiday): HolidayRequest {
  return {
    holidayDate: row.holidayDate,
    holidayName: row.holidayName,
    holidayType: normalizeHolidayType(row.holidayType),
  }
}

function clampPage() {
  const maxPage = Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value) || 1)
  if (page.value > maxPage) page.value = maxPage
}

function goToDate(date: string) {
  const index = sortedRows.value.findIndex((row) => row.holidayDate === date)
  if (index < 0) {
    clampPage()
    return
  }
  page.value = Math.floor(index / pageSize.value) + 1
}

async function buildRequest(otherDates: string[]) {
  const result = await validate()
  if (!result.valid) {
    toast.warning(firstFormError(errors.value) ?? 'Check the highlighted fields.')
    return null
  }
  const taken = calendarDateTakenIssue(values.holidayDate, otherDates)
  if (taken) {
    setFieldError(taken.path, taken.message)
    toast.warning(taken.message)
    return null
  }
  return toHolidayRequest(values)
}

async function persist(
  next: HolidayRequest[],
  successMessage: string,
  action: BusyAction = 'save',
) {
  const exerciseId = requireExerciseId()
  if (!exerciseId) return false
  if (!(await beforeAssociatedDataWrite())) return false
  try {
    const saved = await withBusy(action, async () => {
      const result = await putCalendar.mutateAsync({
        exerciseId,
        body: toCalendarRequest(next),
      })
      emit('update:calendar', result)
      toast.success(successMessage)
      return true
    })
    return saved === true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Save failed.')
    return false
  }
}

function startAdd() {
  if (formLocked.value || busy.value) return
  resetDraft()
  adding.value = true
  page.value = 1
}

function cancelAdd() {
  adding.value = false
}

async function confirmAdd() {
  const body = await buildRequest(holidays.value.map((row) => row.holidayDate))
  if (!body) return
  const ok = await persist([...holidays.value.map(asRequest), body], 'Holiday added.')
  if (!ok) return
  adding.value = false
  goToDate(body.holidayDate)
}

function startEdit(row: Holiday) {
  if (formLocked.value || busy.value) return
  fillDraft(row)
  editingId.value = row.id
}

function cancelEdit() {
  editingId.value = null
}

async function confirmEdit() {
  if (!editingId.value) return
  const itemId = editingId.value
  const body = await buildRequest(
    holidays.value.filter((row) => row.id !== itemId).map((row) => row.holidayDate),
  )
  if (!body) return
  const next = holidays.value.map((row) => (row.id === itemId ? body : asRequest(row)))
  const ok = await persist(next, 'Holiday updated.')
  if (!ok) return
  editingId.value = null
  goToDate(body.holidayDate)
}

function requestDelete(row: Holiday) {
  if (formLocked.value || busy.value) return
  deleteTarget.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  const item = deleteTarget.value
  if (!item) return
  deleteOpen.value = false
  const next = holidays.value.filter((row) => row.id !== item.id).map(asRequest)
  const ok = await persist(next, 'Holiday deleted.', 'delete')
  if (!ok) return
  deleteOpen.value = false
  deleteTarget.value = null
  clampPage()
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

function requireExerciseId() {
  const id = props.exerciseId?.trim()
  if (!id || id === 'undefined') {
    toast.error('Exercise is not ready. Close and open Calendar again.')
    return null
  }
  return id
}

async function downloadTemplate() {
  const exerciseId = requireExerciseId()
  if (!exerciseId) return
  try {
    await withBusy('template', async () => {
      const result = await exerciseApi.exportCalendarTemplate(exerciseId)
      triggerDownload(result.blob, result.filename)
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Download failed.')
  }
}

async function downloadCurrent() {
  const exerciseId = requireExerciseId()
  if (!exerciseId) return
  try {
    await withBusy('export', async () => {
      const result = await exerciseApi.exportCalendar(exerciseId)
      triggerDownload(result.blob, result.filename)
      exportOpen.value = false
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Export failed.')
  }
}

function triggerImport() {
  if (busy.value || formLocked.value) return
  fileInput.value?.click()
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || props.readOnly) return
  const exerciseId = requireExerciseId()
  if (!exerciseId) return
  if (!(await beforeAssociatedDataWrite())) return
  try {
    await withBusy('import', async () => {
      const saved = await importCalendar.mutateAsync({
        exerciseId,
        file,
      })
      emit('update:calendar', saved)
      page.value = 1
      adding.value = false
      editingId.value = null
      toast.success('Excel imported.')
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Import failed.')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-3">
      <AdMetric
        :label="withUnit('Holiday / Weekend days', FieldUnit.days)"
        :value="formatNumber(holidayCounts.rest)"
        hint="Rest days for volume"
      />
      <AdMetric
        :label="withUnit('Makeup (Normal) days', FieldUnit.days)"
        :value="formatNumber(holidayCounts.makeup)"
        hint="Listed working days"
      />
      <AdMetric
        label="Listed dates"
        :value="formatNumber(holidayCounts.total)"
        hint="Rows in this calendar"
      />
    </div>

    <section class="space-y-4 rounded-lg border bg-card p-4">
    <Alert variant="info">
      <Info />
      <AlertDescription>
        Holiday and Weekend are rest days. Normal is a makeup working day.
      </AlertDescription>
    </Alert>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-bold">Holidays and Makeup Days</h3>
      <div v-if="!readOnly" class="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" :disabled="busy || formLocked" @click="startAdd">
          Add day
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
          @click="exportOpen = true"
        >
          {{ busyAction === 'export' ? 'Exporting…' : 'Export Current' }}
        </Button>
        <Button
          size="sm"
          :disabled="busy || formLocked"
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

    <div class="min-w-0 overflow-x-auto rounded-md border">
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
          <TableRow v-if="adding" class="bg-muted/30">
            <TableCell>
              <DatePicker
                v-model="holidayDate"
                aria-label="Holiday date"
                placeholder="Select date"
                class="w-[180px]"
                :invalid="Boolean(errors.holidayDate)"
              />
            </TableCell>
            <TableCell>
              <select
                v-model="holidayType"
                class="flex h-9 w-full min-w-[140px] rounded-md border border-input bg-card px-3 text-sm"
                aria-label="Day type"
                :aria-invalid="Boolean(errors.holidayType)"
              >
                <option
                  v-for="option in HOLIDAY_TYPE_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </TableCell>
            <TableCell>
              <Input
                v-model="holidayName"
                placeholder="Description"
                :aria-invalid="Boolean(errors.holidayName)"
              />
            </TableCell>
            <TableCell>
              <div class="flex gap-3">
                <Button
                  size="sm"
                  variant="link"
                  class="h-auto px-0 font-semibold"
                  :disabled="busy"
                  @click="confirmAdd"
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="link"
                  class="h-auto px-0 font-semibold"
                  :disabled="busy"
                  @click="cancelAdd"
                >
                  Cancel
                </Button>
              </div>
            </TableCell>
          </TableRow>

          <TableRow
            v-for="row in pagedRows"
            :key="row.id"
            :class="editingId === row.id ? 'bg-muted/30' : undefined"
          >
            <template v-if="editingId === row.id">
              <TableCell>
                <DatePicker
                  v-model="holidayDate"
                  aria-label="Holiday date"
                  placeholder="Select date"
                  class="w-[180px]"
                  :invalid="Boolean(errors.holidayDate)"
                />
              </TableCell>
              <TableCell>
                <select
                  v-model="holidayType"
                  class="flex h-9 w-full min-w-[140px] rounded-md border border-input bg-card px-3 text-sm"
                  aria-label="Day type"
                  :aria-invalid="Boolean(errors.holidayType)"
                >
                  <option
                    v-for="option in HOLIDAY_TYPE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </TableCell>
              <TableCell>
                <Input
                  v-model="holidayName"
                  placeholder="Description"
                  :aria-invalid="Boolean(errors.holidayName)"
                />
              </TableCell>
              <TableCell>
                <div class="flex gap-3">
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
                    :disabled="busy"
                    @click="cancelEdit"
                  >
                    Cancel
                  </Button>
                </div>
              </TableCell>
            </template>
            <template v-else>
              <TableCell>{{ row.holidayDate }}</TableCell>
              <TableCell>{{ holidayTypeLabel(row.holidayType) }}</TableCell>
              <TableCell>{{ row.holidayName }}</TableCell>
              <TableCell v-if="!readOnly">
                <div class="flex gap-3">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy || formLocked"
                    @click="startEdit(row)"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="link-destructive"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy || formLocked"
                    @click="requestDelete(row)"
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </template>
          </TableRow>

          <TableRow v-if="!holidays.length && !adding">
            <TableCell
              :colspan="readOnly ? 3 : 4"
              class="h-20 text-center text-sm text-muted-foreground italic"
            >
              No holiday dates{{ readOnly ? '.' : ' — click "Add day" to begin.' }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <TablePager
      :total="sortedRows.length"
      :page="page"
      :page-size="pageSize"
      label="days"
      @update:page="page = $event"
      @update:page-size="
        (size) => {
          pageSize = size
          page = 1
        }
      "
    />
    </section>

    <ConfirmDialog
      v-model:open="exportOpen"
      title="Export Calendar"
      description="Download the current holiday list as an Excel file?"
      confirm-label="Export"
      confirm-variant="default"
      :pending="busyAction === 'export'"
      @confirm="downloadCurrent"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete holiday"
      description="This date will be removed from Calendar. This cannot be undone."
      :rows="
        deleteTarget
          ? [
              { label: 'Date', value: deleteTarget.holidayDate, strong: true },
              { label: 'Type', value: holidayTypeLabel(deleteTarget.holidayType) },
            ]
          : []
      "
      confirm-label="Delete"
      :pending="busy"
      @confirm="confirmDelete"
    />
  </div>
</template>
