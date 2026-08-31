<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  rows: Array<SharedKpiKey & { deliveryHc: number | null }>
  totalHc: string
  syncDate: string
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
  <Card class="mt-4">
    <CardHeader>
      <div>
        <CardTitle>Shared KPI Scope Split</CardTitle>
        <p class="mt-1 text-xs text-muted-foreground">
          Delivery HC is read-only from ACTIVE Timesheet (sync {{ syncDate || '—' }}).
        </p>
      </div>
    </CardHeader>
    <CardContent class="grid gap-4">
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
                <TableHead>Delivery HC</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in rows" :key="kpiKey(item)">
                <TableCell>{{ item.carrier }}</TableCell>
                <TableCell>{{ item.site }}</TableCell>
                <TableCell>{{ item.customerCountry }}</TableCell>
                <TableCell>{{ item.deliveryHc ?? '—' }}</TableCell>
                <TableCell class="text-right">
                  <Button
                    size="sm"
                    variant="link-destructive"
                    class="h-auto px-0 font-semibold"
                    @click="emit('remove', item)"
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!rows.length">
                <TableCell colspan="5" class="h-20 text-center text-muted-foreground italic">
                  <template v-if="!hasCountries">
                    Select Customer Country above to enable KPI line selection.
                  </template>
                  <template v-else>
                    No KPI lines selected — click "Select KPI Lines" to add.
                  </template>
                </TableCell>
              </TableRow>
              <TableRow v-else class="bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell>{{ totalHc }}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
