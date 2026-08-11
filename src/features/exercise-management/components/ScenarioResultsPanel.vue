<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type ScenarioResultRow = {
  label: string
  value: string
  emphasize?: 'good' | 'bad' | null
}

defineProps<{
  sizingCompleted: boolean
  rows: ScenarioResultRow[]
}>()
</script>

<template>
  <section class="rounded-lg border bg-card p-4">
    <h3 class="mb-3 text-base font-bold">Results</h3>
    <div
      v-if="!sizingCompleted"
      class="px-3 py-10 text-center text-sm text-muted-foreground"
    >
      Run Sizing Simulation to populate outcome results.
    </div>
    <div v-else class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Result</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in rows" :key="row.label">
            <TableCell class="text-muted-foreground">{{ row.label }}</TableCell>
            <TableCell
              :class="{
                'font-semibold text-emerald-600': row.emphasize === 'good',
                'font-semibold text-destructive': row.emphasize === 'bad',
              }"
            >
              {{ row.value }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
