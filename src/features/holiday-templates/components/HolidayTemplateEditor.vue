<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
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

import { holidayTemplateApi } from '../api'
import { GBS_CENTERS } from '../centers'
import type { HolidayTemplateLine } from '../types'
import { computeNetworkDays } from '../workingDays'

const route = useRoute()
const router = useRouter()
const isNew = computed(() => route.name === 'supervisor-holiday-template-new')
const templateId = computed(() => (isNew.value ? null : String(route.params.id)))

const loading = ref(!isNew.value)
const saving = ref(false)
const form = reactive({
  center: GBS_CENTERS[0] as string,
  year: new Date().getFullYear() as number | null,
  defaultWeekendCode: 'SAT_SUN',
  sourceNote: '',
  status: 'DRAFT',
})
const holidays = ref<HolidayTemplateLine[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

const controlClass =
  'flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm'

/** Live NETWORKDAYS from weekend + holiday lines (same rules as backend). */
const liveWorkingDays = computed(() => {
  if (form.year == null) return null
  const dates = holidays.value
    .filter((h) => h.holidayDate && h.holidayName?.trim())
    .map((h) => h.holidayDate)
  return computeNetworkDays(form.year, form.defaultWeekendCode, dates)
})

async function load() {
  if (!templateId.value) return
  loading.value = true
  try {
    const detail = await holidayTemplateApi.get(templateId.value)
    form.center = detail.center
    form.year = detail.year
    form.defaultWeekendCode = detail.defaultWeekendCode
    form.sourceNote = detail.sourceNote ?? ''
    form.status = detail.status
    holidays.value = detail.holidays.map((h) => ({
      id: h.id,
      holidayDate: h.holidayDate,
      holidayName: h.holidayName,
    }))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load template.')
    void router.push({ name: 'supervisor-holiday-templates' })
  } finally {
    loading.value = false
  }
}

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

async function save(publishAfter = false) {
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
    let detail
    if (isNew.value) {
      detail = await holidayTemplateApi.create({
        center: form.center,
        year: form.year,
        defaultWeekendCode: form.defaultWeekendCode || null,
        sourceNote: form.sourceNote || null,
        holidays: payloadHolidays,
      })
      toast.success('Template created.')
      await router.replace({
        name: 'supervisor-holiday-template-edit',
        params: { id: detail.id },
      })
    } else {
      detail = await holidayTemplateApi.update(templateId.value!, {
        defaultWeekendCode: form.defaultWeekendCode || null,
        sourceNote: form.sourceNote || null,
        holidays: payloadHolidays,
      })
      toast.success('Template saved.')
    }
    if (publishAfter) {
      detail = await holidayTemplateApi.publish(detail.id)
      toast.success('Template published.')
    }
    form.status = detail.status
    holidays.value = detail.holidays.map((h) => ({
      id: h.id,
      holidayDate: h.holidayDate,
      holidayName: h.holidayName,
    }))
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

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !templateId.value) return
  try {
    const detail = await holidayTemplateApi.importExcel(templateId.value, file)
    holidays.value = detail.holidays.map((h) => ({
      id: h.id,
      holidayDate: h.holidayDate,
      holidayName: h.holidayName,
    }))
    form.status = detail.status
    toast.success('Excel imported into draft.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Import failed.')
  } finally {
    input.value = ''
  }
}

onMounted(load)
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
      <Button
        v-if="!isNew"
        variant="outline"
        :disabled="saving"
        @click="exportExcel"
      >
        Export Excel
      </Button>
      <Button
        v-if="!isNew"
        variant="outline"
        :disabled="saving"
        @click="fileInput?.click()"
      >
        Import Excel
      </Button>
      <input ref="fileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="onImport" />
      <Button variant="outline" :disabled="saving || loading" @click="save(false)">
        {{ saving ? 'Saving…' : 'Save draft' }}
      </Button>
      <Button :disabled="saving || loading" @click="save(true)">Save &amp; Publish</Button>
    </PageActions>

    <Card v-if="loading">
      <CardContent class="py-8 text-sm text-muted-foreground">Loading…</CardContent>
    </Card>

    <div v-else class="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Template header</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <Label>Status</Label>
            <ReadOnlyField :value="form.status" />
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
          <div class="grid gap-1.5">
            <Label>Working days / year</Label>
            <ReadOnlyField :value="liveWorkingDays" />
            <p class="text-xs text-muted-foreground">
              Recalculates from Weekend code and Holiday lines.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between gap-2">
          <CardTitle>Holiday lines</CardTitle>
          <Button size="sm" variant="outline" @click="addRow">Add row</Button>
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
