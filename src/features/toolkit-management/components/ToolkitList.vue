<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import CreateExerciseDialog from '@/features/exercise-management/components/CreateExerciseDialog.vue'
import type { Exercise } from '@/features/exercise-management/types'

import { toolkitApi } from '../api'
import { useManagedToolkitsQuery } from '../api/queries'
import type { SupervisorToolkit, ToolkitListQuery } from '../types'
import { createToolkitColumns } from './toolkitColumns'

const router = useRouter()
const nameFilter = ref('')
const appliedName = ref('')
const pl3Filter = ref('All PL3')
const page = ref(1)
const pageSize = ref(10)

const listQuery = computed<ToolkitListQuery>(() => ({
  name: appliedName.value.trim() || undefined,
  pl3Name: pl3Filter.value === 'All PL3' ? undefined : pl3Filter.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const toolkitsQuery = useManagedToolkitsQuery(listQuery)
const toolkits = computed(() => toolkitsQuery.data.value?.items ?? [])
const total = computed(() => toolkitsQuery.data.value?.total ?? 0)
const pl3Options = computed(() => [
  'All PL3',
  ...(toolkitsQuery.data.value?.pl3Names ?? []),
])
const loading = computed(() => toolkitsQuery.isPending.value && !toolkitsQuery.data.value)
const exportingId = ref<string | null>(null)
const createOpen = ref(false)
const createToolkit = ref<SupervisorToolkit | null>(null)
const createToolkits = computed(() => (createToolkit.value ? [createToolkit.value] : []))

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

watch(pl3Filter, () => {
  page.value = 1
})

watchDebounced(
  nameFilter,
  (value) => {
    appliedName.value = value
    page.value = 1
  },
  { debounce: 400 },
)

watch(
  () => ({
    totalPages: toolkitsQuery.data.value?.totalPages,
    fetching: toolkitsQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => toolkitsQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        toolkitsQuery.error.value instanceof Error
          ? toolkitsQuery.error.value.message
          : 'Could not load toolkits.',
      )
    }
  },
)

const columns = computed(() =>
  createToolkitColumns({
    exportingId: exportingId.value,
    onCreate: createExercise,
    onExport: exportToolkit,
    onEdit: (id) =>
      void router.push({
        name: 'supervisor-toolkit-edit',
        params: { id },
      }),
  }),
)

function createExercise(toolkit: SupervisorToolkit) {
  createToolkit.value = toolkit
  createOpen.value = true
}

function onCreated(exercise: Exercise) {
  createOpen.value = false
  void router.push({ name: 'supervisor-exercise-detail', params: { id: exercise.id } })
}

async function exportToolkit(toolkit: SupervisorToolkit) {
  if (exportingId.value) return
  exportingId.value = toolkit.id
  try {
    const result = await toolkitApi.exportWorkbook(toolkit.id)
    const url = URL.createObjectURL(result.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = result.filename
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Export failed.')
  } finally {
    exportingId.value = null
  }
}
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <PageActions>
      <Button @click="router.push({ name: 'supervisor-toolkit-new' })">Add Toolkit</Button>
    </PageActions>

    <Card>
      <CardHeader>
        <CardTitle>Toolkits</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap items-end gap-2.5">
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Toolkit name
            <Input
              v-model="nameFilter"
              class="w-[220px]"
              placeholder="Search toolkit name"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            PL3
            <select v-model="pl3Filter" :class="[selectClass, 'w-[210px]']">
              <option v-for="option in pl3Options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>
        </div>

        <DataTable
          :columns="columns"
          :data="toolkits"
          :pending="loading"
          empty-text="No Toolkit is currently available."
          table-class="min-w-[960px]"
          :get-row-id="(row) => row.id"
        />

        <TablePager
          :total="total"
          :page="page"
          :page-size="pageSize"
          label="toolkits"
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

    <CreateExerciseDialog
      v-model:open="createOpen"
      lock-toolkit
      :toolkits="createToolkits"
      :initial-toolkit-id="createToolkit?.id"
      @created="onCreated"
    />
  </div>
</template>

