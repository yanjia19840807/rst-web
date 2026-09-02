<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '@/components/ui/badge'
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

const props = withDefaults(
  defineProps<{
    rows: Array<SharedKpiKey & { deliveryHc: number | null; missing?: boolean }>
    totalHc: string
    syncDate: string
    canSelect: boolean
    hasCountries: boolean
    error?: string
    showDeliveryHc?: boolean
  }>(),
  {
    showDeliveryHc: true,
  },
)

const showAlignment = computed(() => props.rows.some((item) => item.missing))
const emptyColspan = computed(
  () => 4 + (props.showDeliveryHc ? 1 : 0) + (showAlignment.value ? 1 : 0),
)

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
        <p v-if="showDeliveryHc" class="mt-1 text-xs text-muted-foreground">
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
                <TableHead v-if="showDeliveryHc">Delivery HC</TableHead>
                <TableHead v-if="showAlignment">Alignment</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in rows" :key="kpiKey(item)">
                <TableCell>{{ item.carrier }}</TableCell>
                <TableCell>{{ item.site }}</TableCell>
                <TableCell>{{ item.customerCountry }}</TableCell>
                <TableCell v-if="showDeliveryHc">{{ item.deliveryHc ?? '—' }}</TableCell>
                <TableCell v-if="showAlignment">
                  <Badge v-if="item.missing" variant="destructive">Missing</Badge>
                </TableCell>
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
                <TableCell :colspan="emptyColspan" class="h-20 text-center text-muted-foreground italic">
                  <template v-if="!hasCountries">
                    Select Customer Country above to enable KPI line selection.
                  </template>
                  <template v-else>
                    No KPI lines selected — click "Select KPI Lines" to add.
                  </template>
                </TableCell>
              </TableRow>
              <TableRow v-else-if="showDeliveryHc" class="bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell>{{ totalHc }}</TableCell>
                <TableCell v-if="showAlignment" />
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
