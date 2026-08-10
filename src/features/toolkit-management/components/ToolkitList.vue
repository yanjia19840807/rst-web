<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

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

import { toolkitApi } from '../api'
import type { SupervisorToolkit } from '../types'

const router = useRouter()
const toolkits = ref<SupervisorToolkit[]>([])
const loading = ref(true)
const nameFilter = ref('')
const pl3Filter = ref('All PL3')
const page = ref(1)
const pageSize = ref(10)

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const pl3Options = computed(() => {
  const names = new Set(toolkits.value.map((item) => item.pl3Name).filter(Boolean))
  return ['All PL3', ...Array.from(names).sort()]
})

const filteredRows = computed(() => {
  const query = nameFilter.value.trim().toLowerCase()
  return toolkits.value.filter((toolkit) => {
    const matchesName = !query || toolkit.name.toLowerCase().includes(query)
    const matchesPl3 =
      pl3Filter.value === 'All PL3' || toolkit.pl3Name === pl3Filter.value
    return matchesName && matchesPl3
  })
})

const safePage = computed(() =>
  Math.min(page.value, Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value) || 1)),
)

const pagedRows = computed(() => {
  const start = (safePage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

watch([nameFilter, pl3Filter], () => {
  page.value = 1
})

async function load() {
  loading.value = true
  try {
    toolkits.value = await toolkitApi.list()
    page.value = 1
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkits.')
  } finally {
    loading.value = false
  }
}

function createExercise(toolkit: SupervisorToolkit) {
  void router.push({
    name: 'supervisor-exercises',
    query: { create: '1', toolkitId: toolkit.id },
  })
}

onMounted(load)
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
              <TableRow v-for="toolkit in pagedRows" :key="toolkit.id">
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
              <TableRow v-if="!loading && !pagedRows.length">
                <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                  No Toolkit is currently available.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                  Loading toolkits…
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <TablePager
          :total="filteredRows.length"
          :page="safePage"
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
