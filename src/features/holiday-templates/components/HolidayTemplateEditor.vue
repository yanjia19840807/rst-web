<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import PageActions from '@/components/PageActions.vue'
import ReadOnlyField from '@/components/ReadOnlyField.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { YearPicker } from '@/components/ui/year-picker'
import AdMetric from '@/features/exercise-management/components/associated-data/AdMetric.vue'

import { holidayTemplateApi } from '../api'
import { useHolidayTemplateMutations } from '../api/mutations'
import { useHolidayTemplateQuery } from '../api/queries'
import { GBS_CENTERS } from '../centers'
import type { HolidayTemplateDetail, HolidayTemplateLine } from '../types'
import { computeNetworkDays } from '../workingDays'

const route = useRoute()
const router = useRouter()
const { create, update, parseExcel } = useHolidayTemplateMutations()
const isNew = computed(() => route.name === 'supervisor-holiday-template-new')
const templateId = computed(() => (isNew.value ? undefined : String(route.params.id)))

const templateQuery = useHolidayTemplateQuery(templateId)
const hydratedId = ref<string | null>(null)
const saving = ref(false)
const form = reactive({
  center: GBS_CENTERS[0] as string,
  year: new Date().getFullYear() as number | null,
  defaultWeekendCode: 'SAT_SUN',
  sourceNote: '',
})
const holidays = ref<HolidayTemplateLine[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

const loading = computed(
  () => !isNew.value && templateQuery.isPending.value && !templateQuery.data.value,
)

const controlClass =
  'flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm'

const filledHolidays = computed(() =>
  holidays.value.filter((h) => h.holidayDate && h.holidayName?.trim()),
)

/** Live NETWORKDAYS from weekend + holiday lines (same rules as backend). */
const liveWorkingDays = computed(() => {
  if (form.year == null) return null
  return computeNetworkDays(
    form.year,
    form.defaultWeekendCode,
    filledHolidays.value.map((h) => h.holidayDate),
  )
})

const workingDaysLabel = computed(() =>
  liveWorkingDays.value == null ? '—' : String(liveWorkingDays.value),
)

function applyDetail(detail: HolidayTemplateDetail) {
  form.center = detail.center
  form.year = detail.year
  form.defaultWeekendCode = detail.defaultWeekendCode
  form.sourceNote = detail.sourceNote ?? ''
  holidays.value = detail.holidays.map((h) => ({
    id: h.id,
    holidayDate: h.holidayDate,
    holidayName: h.holidayName,
  }))
}

watch(templateId, (id) => {
  if (hydratedId.value && hydratedId.value !== id) {
    hydratedId.value = null
  }
})

watch(
  () => templateQuery.data.value,
  (detail) => {
    if (!detail || hydratedId.value === detail.id) return
    applyDetail(detail)
    hydratedId.value = detail.id
  },
  { immediate: true },
)

watch(
  () => templateQuery.isError.value,
  (isError) => {
    if (!isError || isNew.value) return
    toast.error(
      templateQuery.error.value instanceof Error
        ? templateQuery.error.value.message
        : 'Could not load template.',
    )
    void router.push({ name: 'supervisor-holiday-templates' })
  },
)

function addRow() {
  const year = form.year ?? new Date().getFullYear()
  holidays.value = [
    ...holidays.value,
    {
      holidayDate: `${year}-01-01`,
      holidayName: '',
    },
  ]
}

function removeRow(index: number) {
  holidays.value = holidays.value.filter((_, i) => i !== index)
}

async function save() {
  if (!form.center) {
    toast.warning('Please select a Center.')
    return
  }
  if (form.year == null) {
    toast.warning('Please select a Year.')
    return
  }
  saving.value = true
  try {
    const payloadHolidays = holidays.value
      .filter((h) => h.holidayDate && h.holidayName.trim())
      .map((h) => ({
        holidayDate: h.holidayDate,
        holidayName: h.holidayName.trim(),
      }))
    let detail: HolidayTemplateDetail
    if (isNew.value) {
      detail = await create.mutateAsync({
        center: form.center,
        year: form.year,
        defaultWeekendCode: form.defaultWeekendCode || null,
        sourceNote: form.sourceNote || null,
        holidays: payloadHolidays,
      })
      toast.success('Template created.')
      applyDetail(detail)
      hydratedId.value = detail.id
      await router.replace({
        name: 'supervisor-holiday-template-edit',
        params: { id: detail.id },
      })
    } else {
      detail = await update.mutateAsync({
        id: templateId.value!,
        body: {
          defaultWeekendCode: form.defaultWeekendCode || null,
          sourceNote: form.sourceNote || null,
          holidays: payloadHolidays,
        },
      })
      applyDetail(detail)
      toast.success('Template saved.')
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Save failed.')
  } finally {
    saving.value = false
  }
}

async function exportExcel() {
  if (!templateId.value) return
  try {
    await holidayTemplateApi.export(templateId.value)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Export failed.')
  }
}

async function downloadBlank() {
  try {
    await holidayTemplateApi.exportBlank()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Download failed.')
  }
}

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (form.year == null) {
    toast.warning('Please select a Year.')
    input.value = ''
    return
  }
  try {
    const lines = await parseExcel.mutateAsync({ year: form.year, file })
    holidays.value = lines.map((h) => ({
      holidayDate: h.holidayDate,
      holidayName: h.holidayName,
    }))
    toast.success('Excel imported.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Import failed.')
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div>
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="router.push({ name: 'supervisor-holiday-templates' })"
        >
          ← Back to Holiday Templates
        </Button>
      </template>
      <Button :disabled="saving || loading" @click="save">
        {{ saving ? 'Saving…' : 'Save' }}
      </Button>
    </PageActions>

    <Card v-if="loading">
      <CardContent class="py-8 text-sm text-muted-foreground">Loading…</CardContent>
    </Card>

    <div v-else class="grid gap-4">
      <div class="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Template header</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="grid gap-1.5">
              <Label>Center</Label>
              <Select v-if="isNew" v-model="form.center">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select center" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="center in GBS_CENTERS" :key="center" :value="center">
                    {{ center }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <ReadOnlyField v-else :value="form.center" />
            </div>
            <div class="grid gap-1.5">
              <Label>Year</Label>
              <YearPicker
                v-if="isNew"
                v-model="form.year"
                aria-label="Template year"
                placeholder="Select year"
              />
              <ReadOnlyField v-else :value="form.year" />
            </div>
            <div class="grid gap-1.5">
              <Label>Weekend code</Label>
              <select v-model="form.defaultWeekendCode" :class="controlClass">
                <option value="SAT_SUN">SAT_SUN</option>
                <option value="SUN_ONLY">SUN_ONLY</option>
                <option value="FRI_SAT">FRI_SAT</option>
                <option value="NONE">NONE</option>
              </select>
            </div>
            <div class="grid gap-1.5">
              <Label>Source note</Label>
              <Input v-model="form.sourceNote" />
            </div>
          </CardContent>
        </Card>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <AdMetric
            label="Working days / year"
            :value="workingDaysLabel"
            hint="NETWORKDAYS from weekend + holidays"
          />
          <AdMetric
            label="Holidays"
            :value="String(filledHolidays.length)"
            hint="Named holiday lines in this template"
          />
        </div>
      </div>

      <Card>
        <CardHeader class="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Holiday lines</CardTitle>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              :disabled="saving"
              @click="downloadBlank"
            >
              Download Excel template
            </Button>
            <Button
              v-if="!isNew"
              size="sm"
              variant="outline"
              :disabled="saving"
              @click="exportExcel"
            >
              Export Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="saving"
              @click="fileInput?.click()"
            >
              Import Excel
            </Button>
            <input ref="fileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="onImport" />
            <Button size="sm" variant="outline" :disabled="saving" @click="addRow">
              Add row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead class="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(row, index) in holidays" :key="row.id || index">
                  <TableCell>
                    <DatePicker
                      v-model="row.holidayDate"
                      aria-label="Holiday date"
                      placeholder="Select date"
                      class="w-[180px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input v-model="row.holidayName" />
                  </TableCell>
                  <TableCell>
                    <div class="flex justify-end">
                      <Button
                        size="sm"
                        variant="link-destructive"
                        class="h-auto px-0 font-semibold"
                        @click="removeRow(index)"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow v-if="holidays.length === 0">
                  <TableCell colspan="3" class="h-24 text-center text-muted-foreground">
                    No holidays. Add rows or import Excel.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
