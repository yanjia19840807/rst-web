<script setup lang="ts">
import { useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { Scenario } from '../types'

const props = defineProps<{
  exerciseId: string
  scenarios: Scenario[]
  selectedId: string | null
  officialScenarioId?: string | null
  locked: boolean
  snapshotMode: boolean
  actualSize: number
  slaTargetLabel: string
  medianLabel: string
  assumptionHc: (scenario: Scenario) => number | null
  capacityCreation: (scenario: Scenario) => number | null
  formatSigned: (value: number | null) => string
}>()

const emit = defineEmits<{
  'update:selectedId': [value: string | null]
  openOfficial: []
  newScenario: []
}>()

const router = useRouter()

function toggleSelect(scenarioId: string) {
  if (props.locked) return
  emit('update:selectedId', props.selectedId === scenarioId ? null : scenarioId)
}

/** Official is only the Exercise pointer — switching it does not create a row. */
function isOfficial(scenario: Scenario) {
  return scenario.id === props.officialScenarioId
}

function shiftSetupLabel(scenario: Scenario) {
  const n = scenario.shifts?.length ?? 0
  return n > 0 ? String(n) : '—'
}
</script>

<template>
  <Card>
    <CardHeader class="items-center">
      <CardTitle class="text-base">Scenario Matrix</CardTitle>
      <CardAction v-if="!locked" class="flex gap-2">
        <Button variant="outline" @click="emit('openOfficial')">Save Official Scenario</Button>
        <Button variant="outline" @click="emit('newScenario')">New Scenario</Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      <div class="overflow-x-auto rounded-lg border">
        <Table class="min-w-[960px]">
          <TableHeader>
            <TableRow>
              <TableHead class="w-24 text-center">Is Official</TableHead>
              <TableHead>Scenario</TableHead>
              <TableHead>Actual size (HC)</TableHead>
              <TableHead>SLA Target (%)</TableHead>
              <TableHead>Shift Setup (shifts)</TableHead>
              <TableHead>Median Cycle Time (s)</TableHead>
              <TableHead>Right size (HC)</TableHead>
              <TableHead>Capacity Creation (HC)</TableHead>
              <TableHead class="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="scenario in scenarios"
              :key="scenario.id"
              class="cursor-pointer"
              :class="
                selectedId === scenario.id
                  ? 'bg-primary/15 hover:bg-primary/20'
                  : undefined
              "
              @click="toggleSelect(scenario.id)"
            >
              <TableCell class="text-center">
                <span v-if="isOfficial(scenario)" class="text-amber-500">★</span>
              </TableCell>
              <TableCell>{{ scenario.scenarioCode }}</TableCell>
              <TableCell>{{ actualSize.toFixed(2) }}</TableCell>
              <TableCell>{{ slaTargetLabel }}</TableCell>
              <TableCell>{{ shiftSetupLabel(scenario) }}</TableCell>
              <TableCell>{{ medianLabel }}</TableCell>
              <TableCell>
                {{
                  assumptionHc(scenario) != null ? assumptionHc(scenario)!.toFixed(2) : '—'
                }}
              </TableCell>
              <TableCell
                :class="{
                  'font-semibold text-emerald-600':
                    (capacityCreation(scenario) ?? 0) >= 0 && capacityCreation(scenario) != null,
                  'font-semibold text-destructive': (capacityCreation(scenario) ?? 0) < 0,
                }"
              >
                {{ formatSigned(capacityCreation(scenario)) }}
              </TableCell>
              <TableCell class="text-right" @click.stop>
                <Button
                  size="sm"
                  variant="link"
                  class="h-auto px-0 font-semibold"
                  @click="
                    router.push({
                      name: snapshotMode
                        ? 'supervisor-scenario-snapshot'
                        : 'supervisor-scenario-form',
                      params: { id: exerciseId, scenarioId: scenario.id },
                    })
                  "
                >
                  Open
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="!scenarios.length">
              <TableCell colspan="9" class="h-24 text-center text-muted-foreground">
                No scenarios yet. Create one to start simulation.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <p v-if="!locked && !selectedId" class="mt-3 text-xs text-muted-foreground">
        Click a row to select a scenario before saving as official.
      </p>
    </CardContent>
  </Card>
</template>
