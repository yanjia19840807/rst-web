<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useSupervisorToolkitsQuery } from '../api/queries'
import type { SupervisorToolkit, ToolkitListQuery } from '../types'

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

const toolkitsQuery = useSupervisorToolkitsQuery(listQuery)
const toolkits = computed(() => toolkitsQuery.data.value?.items ?? [])
const total = computed(() => toolkitsQuery.data.value?.total ?? 0)
const pl3Options = computed(() => [
  'All PL3',
  ...(toolkitsQuery.data.value?.pl3Names ?? []),
])
const loading = computed(() => toolkitsQuery.isPending.value && !toolkitsQuery.data.value)

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

function createExercise(toolkit: SupervisorToolkit) {
  void router.push({
    name: 'supervisor-exercises',
    query: { create: '1', toolkitId: toolkit.id },
  })
}
</script>

<template>
  <div>
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

        <div class="overflow-x-auto rounded-lg border">
          <Table class="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead>Toolkit Name</TableHead>
                <TableHead>GBS Center</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Process Level 1</TableHead>
                <TableHead>Process Level 2</TableHead>
                <TableHead>Process Level 3</TableHead>
                <TableHead>Subtasks</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="toolkit in toolkits" :key="toolkit.id">
                <TableCell>{{ toolkit.name }}</TableCell>
                <TableCell>{{ toolkit.center }}</TableCell>
                <TableCell>{{ toolkit.domain }}</TableCell>
                <TableCell>{{ toolkit.pl1 }}</TableCell>
                <TableCell>{{ toolkit.pl2 }}</TableCell>
                <TableCell>{{ toolkit.pl3Name }}</TableCell>
                <TableCell>
                  {{
                    toolkit.subtasks
                      .filter((item) => !item.deletedAt)
                      .map((item) => item.name)
                      .join('; ') || '—'
                  }}
                </TableCell>
                <TableCell>
                  <div class="flex justify-end gap-3">
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
                      @click="createExercise(toolkit)"
                    >
                      Create Exercise
                    </Button>
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
                      @click="
                        router.push({
                          name: 'supervisor-toolkit-edit',
                          params: { id: toolkit.id },
                        })
                      "
                    >
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="!loading && !toolkits.length">
                <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                  No Toolkit is currently available.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell colspan="8" class="p-0">
                  <ListLoading />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

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
  </div>
</template>

