<script setup lang="ts">
import TableTextLink from '@/components/TableTextLink.vue'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { kpiKey } from '../kpiKey'
import type { SharedKpiKey } from '../types'

defineProps<{
  rows: SharedKpiKey[]
  canSelect: boolean
  hasCountries: boolean
  error?: string
}>()

const emit = defineEmits<{
  select: []
  remove: [item: SharedKpiKey]
}>()
</script>

<template>
  <section class="grid gap-4 border-t pt-4">
    <div>
      <h3 class="text-sm font-semibold">Shared KPI Scope Split</h3>
    </div>
    <div class="grid gap-4">
      <p v-if="error" class="text-xs text-destructive">{{ error }}</p>

      <div class="grid gap-2">
        <div class="flex justify-end">
          <Button variant="outline" :disabled="!canSelect" @click="emit('select')">
            Select KPI Lines
          </Button>
        </div>
        <div class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carrier</TableHead>
                <TableHead>GBS Site</TableHead>
                <TableHead>Customer Country</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in rows" :key="kpiKey(item)">
                <TableCell>{{ item.carrier }}</TableCell>
                <TableCell>{{ item.site }}</TableCell>
                <TableCell>{{ item.customerCountry }}</TableCell>
                <TableCell class="text-right">
                  <TableTextLink destructive @click="emit('remove', item)">Remove</TableTextLink>
                </TableCell>
              </TableRow>
              <TableRow v-if="!rows.length">
                <TableCell colspan="4" class="h-20 text-center text-muted-foreground italic">
                  <template v-if="!hasCountries">
                    Select Customer Country above to enable KPI line selection.
                  </template>
                  <template v-else>
                    No KPI lines selected — click "Select KPI Lines" to add.
                  </template>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  </section>
</template>
