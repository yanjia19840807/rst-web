<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { governanceApi } from '../api'
import type { DashboardResponse } from '../types'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'

const loading = ref(true)
const data = ref<DashboardResponse | null>(null)
const selectedGbs = ref('GBS China')
const comparisonView = ref('Completion by domain')

const centerOptions = computed(() => Object.keys(data.value?.domainsByCenter ?? {}))
const domainRows = computed(() => data.value?.domainsByCenter[selectedGbs.value] ?? [])
const chartBars = computed(() =>
  (data.value?.centers ?? []).map((c) => ({
    label: c.center.replace('GBS ', ''),
    height: Math.max(28, Math.round((Number.parseFloat(c.completionPct) / 100) * 100)),
    onTrack: c.onTrack,
  })),
)

async function load() {
  loading.value = true
  try {
    data.value = await governanceApi.dashboard()
    const centers = Object.keys(data.value.domainsByCenter)
    if (centers.length && !centers.includes(selectedGbs.value)) {
      selectedGbs.value = centers[0]!
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load dashboard.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-sm text-muted-foreground">Loading dashboard…</div>

    <template v-else-if="data">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          v-for="metric in data.metrics"
          :key="metric.label"
          :label="metric.label"
          :value="metric.value"
          :hint="metric.hint"
          :tone="metric.tone"
        />
      </div>

      <div class="grid gap-4 lg:grid-cols-[1.45fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">RST Completion And Aging By GBS Center</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              class="relative h-[200px] overflow-hidden rounded-lg border bg-card"
              aria-hidden="true"
            >
              <div
                class="absolute right-7 bottom-8 left-12 flex h-[140px] items-end justify-around gap-2"
              >
                <div
                  v-for="bar in chartBars"
                  :key="bar.label"
                  class="flex-1 rounded-t"
                  :class="bar.onTrack ? 'bg-emerald-500' : 'bg-destructive'"
                  :style="{ height: `${bar.height}%` }"
                />
              </div>
              <div class="absolute right-7 bottom-2 left-12 flex justify-around">
                <span
                  v-for="bar in chartBars"
                  :key="`${bar.label}-label`"
                  class="text-center text-[9px] text-muted-foreground"
                >
                  {{ bar.label }}
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-block h-2 w-4 rounded-sm bg-emerald-500" />
                Completion on track
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-block h-2 w-4 rounded-sm bg-destructive" />
                Completion behind
              </span>
            </div>

            <div class="overflow-x-auto rounded-lg border">
              <Table class="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>GBS Center</TableHead>
                    <TableHead>RST Applicable PL3</TableHead>
                    <TableHead>Completed this quarter</TableHead>
                    <TableHead>Completion %</TableHead>
                    <TableHead>Completed in 3-6 months</TableHead>
                    <TableHead>Never done</TableHead>
                    <TableHead>Completed in 6-12 months</TableHead>
                    <TableHead>Completed over 1 year ago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in data.centers" :key="row.center">
                    <TableCell>{{ row.center }}</TableCell>
                    <TableCell>{{ row.applicablePl3 }}</TableCell>
                    <TableCell>{{ row.completedThisQuarter }}</TableCell>
                    <TableCell>{{ row.completionPct }}</TableCell>
                    <TableCell>{{ row.completed3To6Months }}</TableCell>
                    <TableCell>{{ row.neverDone }}</TableCell>
                    <TableCell>{{ row.completed6To12Months }}</TableCell>
                    <TableCell>{{ row.completedOver1Year }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">Domain Drill-Down For Selected GBS</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <FilterField label="Selected GBS">
                <select
                  v-model="selectedGbs"
                  class="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
                >
                  <option v-for="center in centerOptions" :key="center" :value="center">
                    {{ center }}
                  </option>
                </select>
              </FilterField>
              <FilterField label="Comparison view">
                <select
                  v-model="comparisonView"
                  class="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground"
                >
                  <option>Completion by domain</option>
                  <option>Aging by domain</option>
                </select>
              </FilterField>
            </div>
            <div class="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>RST Applicable PL3</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Never done</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in domainRows" :key="row.domain">
                    <TableCell>{{ row.domain }}</TableCell>
                    <TableCell>{{ row.applicablePl3 }}</TableCell>
                    <TableCell>{{ row.completed }}</TableCell>
                    <TableCell>{{ row.pct }}</TableCell>
                    <TableCell>{{ row.neverDone }}</TableCell>
                  </TableRow>
                  <TableRow v-if="!domainRows.length">
                    <TableCell colspan="5" class="h-20 text-center text-muted-foreground">
                      No domain rows for {{ selectedGbs }}.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p class="text-xs text-muted-foreground">View: {{ comparisonView }}</p>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
