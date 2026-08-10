<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { HolidayTemplateSummary } from '../types'

const ALL_CENTERS = '__all__'

const router = useRouter()
const rows = ref<HolidayTemplateSummary[]>([])
const loading = ref(true)
const centerFilter = ref(ALL_CENTERS)
const yearFilter = ref<number | null>(null)
const statusFilter = ref('All')
const page = ref(1)
const pageSize = ref(10)

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const filtered = computed(() => {
  return rows.value.filter((row) => {
    const matchCenter =
      centerFilter.value === ALL_CENTERS || row.center === centerFilter.value
    const matchYear = yearFilter.value == null || row.year === yearFilter.value
    const matchStatus = statusFilter.value === 'All' || row.status === statusFilter.value
    return matchCenter && matchYear && matchStatus
  })
})

const safePage = computed(() =>
  Math.min(page.value, Math.max(1, Math.ceil(filtered.value.length / pageSize.value) || 1)),
)

const paged = computed(() => {
  const start = (safePage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

watch([centerFilter, yearFilter, statusFilter], () => {
  page.value = 1
})

async function load() {
  loading.value = true
  try {
    rows.value = await holidayTemplateApi.list()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load holiday templates.')
  } finally {
    loading.value = false
  }
}

async function downloadBlank() {
  try {
    await holidayTemplateApi.exportBlank()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Download failed.')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageActions>
      <Button variant="outline" @click="downloadBlank">Download Excel template</Button>
      <Button @click="router.push({ name: 'supervisor-holiday-template-new' })">Add Template</Button>
    </PageActions>

    <Card>
      <CardHeader>
        <CardTitle>Center Holiday Templates</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap items-end gap-2.5">
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Center
            <Select v-model="centerFilter">
              <SelectTrigger class="w-[200px]">
                <SelectValue placeholder="All centers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="ALL_CENTERS">All</SelectItem>
                <SelectItem v-for="center in GBS_CENTERS" :key="center" :value="center">
                  {{ center }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Year
            <div class="flex items-center gap-2">
              <YearPicker
                v-model="yearFilter"
                aria-label="Filter by year"
                placeholder="All years"
              />
              <Button
                v-if="yearFilter != null"
                type="button"
                size="sm"
                variant="ghost"
                @click="yearFilter = null"
              >
                Clear
              </Button>
            </div>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Status
            <select v-model="statusFilter" :class="selectClass">
              <option>All</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
            </select>
          </label>
        </div>

        <div class="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Center</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Holidays</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in paged" :key="row.id">
                <TableCell>{{ row.center }}</TableCell>
                <TableCell>{{ row.year }}</TableCell>
                <TableCell>{{ row.holidayCount }}</TableCell>
                <TableCell>{{ row.status }}</TableCell>
                <TableCell>{{ row.updatedAt?.slice?.(0, 10) || '—' }}</TableCell>
                <TableCell>
                  <div class="flex justify-end gap-3">
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
                      @click="
                        router.push({
                          name: 'supervisor-holiday-template-edit',
                          params: { id: row.id },
                        })
                      "
                    >
                      Open
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="!loading && !paged.length">
                <TableCell colspan="6" class="h-24 text-center text-muted-foreground">
                  No holiday templates yet.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell colspan="6" class="h-24 text-center text-muted-foreground">
                  Loading templates…
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <TablePager
          label="templates"
          :page="safePage"
          :page-size="pageSize"
          :total="filtered.length"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </CardContent>
    </Card>
  </div>
</template>
