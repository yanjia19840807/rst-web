<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
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
import { formatDate } from '@/lib/datetime'

import { useHolidayTemplateMutations } from '../api/mutations'
import { useHolidayTemplatesQuery } from '../api/queries'
import { GBS_CENTERS } from '../centers'
import type { HolidayTemplateListQuery, HolidayTemplateSummary } from '../types'

const ALL_CENTERS = '__all__'

const router = useRouter()
const centerFilter = ref(ALL_CENTERS)
const yearFilter = ref<number | null>(null)
const page = ref(1)
const pageSize = ref(10)

const listQuery = computed<HolidayTemplateListQuery>(() => ({
  center: centerFilter.value === ALL_CENTERS ? undefined : centerFilter.value,
  year: yearFilter.value ?? undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const templatesQuery = useHolidayTemplatesQuery(listQuery)
const { remove } = useHolidayTemplateMutations()
const rows = computed(() => templatesQuery.data.value?.items ?? [])
const total = computed(() => templatesQuery.data.value?.total ?? 0)
const loading = computed(() => templatesQuery.isPending.value && !templatesQuery.data.value)
const deleteOpen = ref(false)
const deleteTarget = ref<HolidayTemplateSummary | null>(null)

watch([centerFilter, yearFilter], () => {
  page.value = 1
})

watch(
  () => ({
    totalPages: templatesQuery.data.value?.totalPages,
    fetching: templatesQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => templatesQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        templatesQuery.error.value instanceof Error
          ? templatesQuery.error.value.message
          : 'Could not load holiday templates.',
      )
    }
  },
)

function openEdit(id: string) {
  void router.push({
    name: 'supervisor-holiday-template-edit',
    params: { id },
  })
}

function openDelete(row: HolidayTemplateSummary) {
  deleteTarget.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return
  try {
    await remove.mutateAsync(target.id)
    deleteOpen.value = false
    deleteTarget.value = null
    toast.success('Holiday template deleted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not delete the template.')
  }
}
</script>

<template>
  <div>
    <PageActions>
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
        </div>

        <div class="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Center</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Holidays</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in rows" :key="row.id">
                <TableCell>{{ row.center }}</TableCell>
                <TableCell>{{ row.year }}</TableCell>
                <TableCell>{{ row.holidayCount }}</TableCell>
                <TableCell>{{ formatDate(row.updatedAt) }}</TableCell>
                <TableCell>
                  <div class="flex justify-end gap-3">
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
                      @click="openEdit(row.id)"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="link-destructive"
                      class="h-auto px-0 font-semibold"
                      :disabled="remove.isPending.value && deleteTarget?.id === row.id"
                      @click="openDelete(row)"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="!loading && !rows.length">
                <TableCell colspan="5" class="h-24 text-center text-muted-foreground">
                  No holiday templates yet.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell colspan="5" class="p-0">
                  <ListLoading />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <TablePager
          label="templates"
          :page="page"
          :page-size="pageSize"
          :total="total"
          @update:page="page = $event"
          @update:page-size="
            (size) => {
              pageSize = size
              page = 1
            }
          "
        />
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete Holiday Template"
      warning="This action cannot be undone. Exercises that already applied this template keep their copied holidays."
      :rows="
        deleteTarget
          ? [
              { label: 'Center', value: deleteTarget.center, strong: true },
              { label: 'Year', value: String(deleteTarget.year) },
            ]
          : []
      "
      confirm-label="Delete"
      :pending="remove.isPending.value"
      @confirm="confirmDelete"
    />
  </div>
</template>
