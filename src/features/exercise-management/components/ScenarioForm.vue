<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

import { exerciseApi } from '../api'
import type { Exercise, Scenario, ShiftRequest } from '../types'

const props = defineProps<{
  exerciseId: string
  scenarioId: string
}>()

const router = useRouter()
const loading = ref(true)
const busy = ref(false)
const deleteOpen = ref(false)
const deletePending = ref(false)
const exercise = ref<Exercise | null>(null)
const scenario = ref<Scenario | null>(null)
const simTab = ref<'sizing' | 'slot'>('sizing')
const lastForecast = ref('')
const lastMonthly = ref('')
const lastSlot = ref('')

const form = reactive({
  name: '',
  description: '',
  rightSizingHc: '8.6',
  slaTargetRatio: '0.9',
  slaTurnaroundMinutes: '480',
})

const shiftRows = ref<ShiftRequest[]>([])

const readOnly = computed(
  () => !exercise.value?.canEdit || scenario.value?.status === 'OFFICIAL',
)

async function load() {
  loading.value = true
  try {
    ;[exercise.value, scenario.value] = await Promise.all([
      exerciseApi.detail(props.exerciseId),
      exerciseApi.getScenario(props.exerciseId, props.scenarioId),
    ])
    form.name = scenario.value.name
    form.description = scenario.value.description ?? ''
    const rs = scenario.value.assumptions.find((a) => a.parameterCode === 'RIGHT_SIZING_HC')
    const sla = scenario.value.assumptions.find((a) => a.parameterCode === 'SLA_TARGET_RATIO')
    const tat = scenario.value.assumptions.find((a) => a.parameterCode === 'SLA_TURNAROUND_MINUTES')
    if (rs?.numericValue != null) form.rightSizingHc = String(rs.numericValue)
    if (sla?.numericValue != null) form.slaTargetRatio = String(sla.numericValue)
    if (tat?.numericValue != null) form.slaTurnaroundMinutes = String(tat.numericValue)
    const shifts = await exerciseApi.getShifts(props.exerciseId)
    shiftRows.value = shifts.map((s) => ({
      shiftNo: s.shiftNo,
      startTime: s.startTime.length === 5 ? `${s.startTime}:00` : s.startTime,
      durationMinutes: s.durationMinutes,
      headcount: Number(s.headcount),
      worksOnWeekend: s.worksOnWeekend,
    }))
    if (!shiftRows.value.length) {
      shiftRows.value = [
        {
          shiftNo: 1,
          startTime: '09:00:00',
          durationMinutes: 540,
          headcount: 1,
          worksOnWeekend: false,
        },
      ]
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load scenario.')
    void router.push({ name: 'supervisor-exercise-detail', params: { id: props.exerciseId } })
  } finally {
    loading.value = false
  }
}

function addShift() {
  shiftRows.value.push({
    shiftNo: shiftRows.value.length + 1,
    startTime: '09:00:00',
    durationMinutes: 540,
    headcount: 1,
    worksOnWeekend: false,
  })
}

function removeShift() {
  if (shiftRows.value.length <= 1) return
  shiftRows.value.pop()
  shiftRows.value.forEach((row, index) => {
    row.shiftNo = index + 1
  })
}

async function save() {
  if (!scenario.value || readOnly.value) return
  busy.value = true
  try {
    await exerciseApi.putShifts(
      props.exerciseId,
      shiftRows.value.map((row, index) => ({
        ...row,
        shiftNo: index + 1,
        startTime: row.startTime.length === 5 ? `${row.startTime}:00` : row.startTime,
      })),
    )
    scenario.value = await exerciseApi.updateScenario(props.exerciseId, props.scenarioId, {
      name: form.name.trim(),
      description: form.description.trim() || null,
      assumptions: [
        {
          parameterCode: 'RIGHT_SIZING_HC',
          numericValue: Number(form.rightSizingHc),
          unit: 'HC',
        },
        {
          parameterCode: 'SLA_TARGET_RATIO',
          numericValue: Number(form.slaTargetRatio),
          unit: 'RATIO',
        },
        {
          parameterCode: 'SLA_TURNAROUND_MINUTES',
          numericValue: Number(form.slaTurnaroundMinutes),
          unit: 'MIN',
        },
      ],
    })
    toast.success('Scenario saved.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Save failed.')
  } finally {
    busy.value = false
  }
}

async function runForecast() {
  busy.value = true
  try {
    const run = await exerciseApi.runForecast(props.exerciseId, props.scenarioId)
    lastForecast.value = `${run.runType} #${run.runNo} · ${run.status}`
    toast.success('Forecast stub completed.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Forecast failed.')
  } finally {
    busy.value = false
  }
}

async function runMonthly() {
  busy.value = true
  try {
    const run = await exerciseApi.runMonthlySimulation(props.exerciseId, props.scenarioId)
    lastMonthly.value = `${run.runType} #${run.runNo} · ${run.status}`
    toast.success('Sizing simulation stub completed.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Monthly simulation failed.')
  } finally {
    busy.value = false
  }
}

async function runSlot() {
  busy.value = true
  try {
    const run = await exerciseApi.runSlotSimulation(props.exerciseId, props.scenarioId)
    lastSlot.value = `${run.runType} #${run.runNo} · ${run.status}`
    toast.success('Slot simulation stub completed.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Slot simulation failed.')
  } finally {
    busy.value = false
  }
}

async function confirmDelete() {
  deletePending.value = true
  try {
    await exerciseApi.deleteScenario(props.exerciseId, props.scenarioId)
    toast.success('Scenario deleted.')
    void router.push({ name: 'supervisor-exercise-detail', params: { id: props.exerciseId } })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Delete failed.')
  } finally {
    deletePending.value = false
    deleteOpen.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">
    Loading scenario…
  </div>
  <div v-else-if="exercise && scenario" class="grid gap-4">
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="px-0"
          @click="router.push({ name: 'supervisor-exercise-detail', params: { id: exerciseId } })"
        >
          ← Back to Exercise
        </Button>
      </template>
      <Button
        v-if="!readOnly"
        variant="destructive"
        @click="deleteOpen = true"
      >
        Delete Scenario
      </Button>
      <Button v-if="!readOnly" :disabled="busy" @click="save">
        {{ busy ? 'Saving…' : 'Save Scenario' }}
      </Button>
    </PageActions>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Scenario Info</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-3">
        <DetailTable
          :rows="[
            { label: 'Toolkit', value: exercise.snapshot.toolkit.name, strong: true },
            { label: 'Exercise No', value: exercise.exerciseCode },
            { label: 'Scenario No.', value: scenario.scenarioCode, strong: true },
            { label: 'Status', value: scenario.status },
          ]"
        />
        <div class="rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          Sizing Month, Slot Period, TMS period, and Associated Data are maintained on the Exercise
          ({{ exercise.sizingMonth }} · {{ exercise.slotStartDate }}). This scenario only adjusts
          assumptions and runs simulation.
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Assumptions</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1 text-sm sm:col-span-2">
          Name
          <Input v-model="form.name" :disabled="readOnly" />
        </label>
        <label class="grid gap-1 text-sm sm:col-span-2">
          Description
          <Textarea v-model="form.description" rows="2" :disabled="readOnly" />
        </label>
        <label class="grid gap-1 text-sm">
          Right Sizing HC
          <Input v-model="form.rightSizingHc" :disabled="readOnly" />
        </label>
        <label class="grid gap-1 text-sm">
          SLA Target ratio
          <Input v-model="form.slaTargetRatio" :disabled="readOnly" />
        </label>
        <label class="grid gap-1 text-sm">
          SLA Turnaround (min)
          <Input v-model="form.slaTurnaroundMinutes" :disabled="readOnly" />
        </label>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="gap-3">
        <CardTitle class="text-base">Forecast &amp; Simulation</CardTitle>
        <div class="flex gap-1 border-b">
          <button
            type="button"
            class="border-b-2 px-3.5 py-2 text-sm"
            :class="
              simTab === 'sizing'
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent text-muted-foreground'
            "
            @click="simTab = 'sizing'"
          >
            1. Sizing Simulation
          </button>
          <button
            type="button"
            class="border-b-2 px-3.5 py-2 text-sm"
            :class="
              simTab === 'slot'
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent text-muted-foreground'
            "
            @click="simTab = 'slot'"
          >
            2. Slot Simulation
          </button>
        </div>
      </CardHeader>
      <CardContent class="grid gap-4">
        <template v-if="simTab === 'sizing'">
          <Card size="sm" class="ring-0">
            <CardHeader class="items-center px-0">
              <CardTitle class="text-sm">Sizing Inputs</CardTitle>
              <CardAction v-if="!readOnly" class="flex gap-2">
                <Button variant="outline" size="sm" :disabled="busy" @click="runForecast">
                  Run Forecast
                </Button>
                <Button size="sm" :disabled="busy" @click="runMonthly">Run Simulation</Button>
              </CardAction>
            </CardHeader>
            <CardContent class="grid gap-3 px-0">
              <DetailTable
                :rows="[
                  { label: 'Right Sizing HC', value: form.rightSizingHc },
                  { label: 'Last forecast', value: lastForecast || '—' },
                  { label: 'Last monthly run', value: lastMonthly || '—' },
                ]"
              />
              <p
                v-if="!lastMonthly"
                class="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground"
              >
                Run Forecast then Sizing Simulation to generate stub results.
              </p>
            </CardContent>
          </Card>
        </template>

        <template v-else>
          <Card size="sm" class="ring-0">
            <CardHeader class="items-center px-0">
              <CardTitle class="text-sm">Shift Inputs</CardTitle>
              <CardAction v-if="!readOnly">
                <Button size="sm" :disabled="busy" @click="runSlot">Run Simulation</Button>
              </CardAction>
            </CardHeader>
            <CardContent class="grid gap-3 px-0">
          <div v-if="!readOnly" class="flex gap-2">
            <Button variant="outline" size="sm" @click="addShift">Add</Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="shiftRows.length <= 1"
              @click="removeShift"
            >
              Remove
            </Button>
          </div>
          <div class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead v-for="row in shiftRows" :key="row.shiftNo">
                    Shift {{ row.shiftNo }}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell class="text-muted-foreground">Start</TableCell>
                  <TableCell v-for="row in shiftRows" :key="`start-${row.shiftNo}`">
                    <Input v-model="row.startTime" class="h-8" :disabled="readOnly" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell class="text-muted-foreground">Duration</TableCell>
                  <TableCell v-for="row in shiftRows" :key="`dur-${row.shiftNo}`">
                    <Input
                      v-model.number="row.durationMinutes"
                      type="number"
                      class="h-8"
                      :disabled="readOnly"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell class="text-muted-foreground">Capacity FTE</TableCell>
                  <TableCell v-for="row in shiftRows" :key="`hc-${row.shiftNo}`">
                    <Input
                      v-model.number="row.headcount"
                      type="number"
                      class="h-8"
                      :disabled="readOnly"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell class="text-muted-foreground">Weekend</TableCell>
                  <TableCell v-for="row in shiftRows" :key="`wk-${row.shiftNo}`">
                    <Label class="flex items-center gap-2 text-sm">
                      <input v-model="row.worksOnWeekend" type="checkbox" :disabled="readOnly" />
                      Yes
                    </Label>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <DetailTable :rows="[{ label: 'Last slot run', value: lastSlot || '—' }]" />
            </CardContent>
          </Card>
        </template>
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete Scenario"
      description="Only DRAFT scenarios can be deleted. This cannot be undone."
      confirm-label="Delete Scenario"
      :pending="deletePending"
      @confirm="confirmDelete"
    />
  </div>
</template>
