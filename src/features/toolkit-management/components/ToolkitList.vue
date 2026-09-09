<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageActions from '@/components/PageActions.vue'
import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'

import CreateExerciseDialog from '@/features/exercise-management/components/CreateExerciseDialog.vue'
import type { Exercise } from '@/features/exercise-management/types'

import { toolkitApi } from '../api'
import { useManagedToolkitsQuery } from '../api/queries'
import type { SupervisorToolkit, ToolkitListQuery } from '../types'
import { createToolkitColumns } from './toolkitColumns'

const router = useRouter()

const emptyFilters = () => ({
  name: '',
  pl3: '',
  enabled: '',
})

const draft = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const page = ref(1)
const pageSize = ref(10)
const fieldClass = 'w-[220px]'

const listQuery = computed<ToolkitListQuery>(() => ({
  name: applied.name.trim() || undefined,
  pl3Name: applied.pl3 || undefined,
  enabled:
    applied.enabled === 'true' ? true : applied.enabled === 'false' ? false : undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const toolkitsQuery = useManagedToolkitsQuery(listQuery)
const toolkits = computed(() => toolkitsQuery.data.value?.items ?? [])
const total = computed(() => toolkitsQuery.data.value?.total ?? 0)
const pl3Options = computed(() => toolkitsQuery.data.value?.pl3Names ?? [])
const loading = computed(() => toolkitsQuery.isPending.value && !toolkitsQuery.data.value)
const exportingId = ref<string | null>(null)
const exportTarget = ref<SupervisorToolkit | null>(null)
const exportOpen = ref(false)
const createOpen = ref(false)
const createToolkit = ref<SupervisorToolkit | null>(null)
const createToolkits = computed(() => (createToolkit.value ? [createToolkit.value] : []))

function applySearch() {
  Object.assign(applied, { ...draft })
  page.value = 1
}

function clearFilters() {
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
}

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
    onExport: requestExport,
    onEdit: (id) =>
      void router.push({
        name: 'supervisor-toolkit-edit',
        params: { id },
      }),
  }),
)

function createExercise(toolkit: SupervisorToolkit) {
  if (toolkit.outOfSync || toolkit.enabled === false) return
  createToolkit.value = toolkit
  createOpen.value = true
}

function onCreated(exercise: Exercise) {
  createOpen.value = false
  void router.push({ name: 'supervisor-exercise-detail', params: { id: exercise.id } })
}

function requestExport(toolkit: SupervisorToolkit) {
  if (exportingId.value) return
  exportTarget.value = toolkit
  exportOpen.value = true
}

async function confirmExport() {
  const toolkit = exportTarget.value
  if (!toolkit || exportingId.value) return
  exportingId.value = toolkit.id
  try {
    const result = await toolkitApi.exportWorkbook(toolkit.id)
    const url = URL.createObjectURL(result.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = result.filename
    anchor.click()
    URL.revokeObjectURL(url)
    exportOpen.value = false
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
      <CardContent class="space-y-3">
        <QueryPanel @search="applySearch" @clear="clearFilters">
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Toolkit name
            <Input
              v-model="draft.name"
              :class="fieldClass"
              placeholder="Search toolkit name"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            PL3
            <NativeSelect
              :class="fieldClass"
              :model-value="draft.pl3"
              @update:model-value="draft.pl3 = String($event ?? '')"
            >
              <option value="">All PL3</option>
              <option v-for="option in pl3Options" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Status
            <NativeSelect
              :class="fieldClass"
              :model-value="draft.enabled"
              @update:model-value="draft.enabled = String($event ?? '')"
            >
              <option value="">All</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </NativeSelect>
          </label>
        </QueryPanel>

        <DataTable
          :columns="columns"
          :data="toolkits"
          :pending="loading"
          empty-text="No Toolkit is currently available."
          table-class="min-w-[1080px]"
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

    <ConfirmDialog
      v-model:open="exportOpen"
      title="Export Toolkit"
      :description="
        exportTarget
          ? `Download the Excel workbook for ${exportTarget.name}?`
          : 'Download the Excel workbook?'
      "
      confirm-label="Export"
      confirm-variant="default"
      :pending="Boolean(exportingId)"
      @confirm="confirmExport"
    />
  </div>
</template>

