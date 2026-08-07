<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { exerciseApi } from '../api'
import type { Exercise, Scenario } from '../types'
import AssociatedDataPanel from './AssociatedDataPanel.vue'
import SubmitDialog from './SubmitDialog.vue'

const props = defineProps<{
  exerciseId: string
}>()

const router = useRouter()
const loading = ref(true)
const exercise = ref<Exercise | null>(null)
const scenarios = ref<Scenario[]>([])
const selectedId = ref<string | null>(null)
const deleteOpen = ref(false)
const deletePending = ref(false)
const newScenarioOpen = ref(false)
const createPending = ref(false)
const officialOpen = ref(false)
const officialPending = ref(false)
const submitOpen = ref(false)

const locked = computed(() => !exercise.value?.canEdit)
const nextScenarioCode = computed(() => `S${scenarios.value.length + 1}`)
const selectedScenario = computed(
  () => scenarios.value.find((item) => item.id === selectedId.value) ?? null,
)
const deliveryHc = computed(() =>
  (exercise.value?.snapshot.sharedKpis ?? []).reduce((sum, item) => sum + Number(item.deliveryHc), 0),
)

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

async function load() {
  loading.value = true
  try {
    ;[exercise.value, scenarios.value] = await Promise.all([
      exerciseApi.detail(props.exerciseId),
      exerciseApi.listScenarios(props.exerciseId),
    ])
    if (exercise.value.officialScenarioId) {
      selectedId.value = exercise.value.officialScenarioId
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load exercise.')
    void router.push({ name: 'supervisor-exercises' })
  } finally {
    loading.value = false
  }
}

async function confirmDelete() {
  deletePending.value = true
  try {
    await exerciseApi.delete(props.exerciseId)
    toast.success('Exercise deleted.')
    void router.push({ name: 'supervisor-exercises' })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Delete failed.')
  } finally {
    deletePending.value = false
    deleteOpen.value = false
  }
}

async function createScenario() {
  if (!exercise.value) return
  createPending.value = true
  try {
    const created = await exerciseApi.createScenario(props.exerciseId, {
      scenarioCode: nextScenarioCode.value,
      name: `${exercise.value.snapshot.toolkit.name} ${nextScenarioCode.value}`,
      description: null,
      assumptions: [
        { parameterCode: 'RIGHT_SIZING_HC', numericValue: 8.6, unit: 'HC' },
        { parameterCode: 'SLA_TARGET_RATIO', numericValue: 0.9, unit: 'RATIO' },
      ],
    })
    newScenarioOpen.value = false
    toast.success(`${created.scenarioCode} created.`)
    void router.push({
      name: 'supervisor-scenario-form',
      params: { id: props.exerciseId, scenarioId: created.id },
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not create scenario.')
  } finally {
    createPending.value = false
  }
}

function openOfficialDialog() {
  if (!selectedId.value) {
    toast.warning('Please select a scenario first.')
    return
  }
  officialOpen.value = true
}

async function confirmOfficial() {
  if (!selectedId.value) return
  officialPending.value = true
  try {
    await exerciseApi.markOfficial(props.exerciseId, selectedId.value)
    toast.success('Saved as the official scenario.')
    officialOpen.value = false
    await load()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not mark official.')
  } finally {
    officialPending.value = false
  }
}

function onSubmitted() {
  void router.push({ name: 'supervisor-submission', params: { id: props.exerciseId } })
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">
    Loading exercise…
  </div>
  <div v-else-if="exercise" class="grid gap-4">
    <PageActions>
      <template #left>
        <Button variant="link" class="px-0" @click="router.push({ name: 'supervisor-exercises' })">
          ← Back to Exercise List
        </Button>
      </template>
      <Button
        v-if="exercise.canDelete"
        variant="destructive"
        @click="deleteOpen = true"
      >
        Delete Exercise
      </Button>
      <Button
        v-if="locked && exercise.submittedAt"
        @click="router.push({ name: 'supervisor-submission', params: { id: exerciseId } })"
      >
        Submitted Exercise Details
      </Button>
      <Button v-if="exercise.canSubmit" @click="submitOpen = true">Submit For Validation</Button>
    </PageActions>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Exercise Info</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-3">
        <DetailTable
          :rows="[
            { label: 'Toolkit', value: exercise.snapshot.toolkit.name, strong: true },
            { label: 'Exercise No', value: exercise.exerciseCode, strong: true },
            { label: 'Created', value: formatDate(exercise.createdAt) },
            { label: 'Sizing Month', value: exercise.sizingMonth },
            {
              label: 'Slot Period',
              value: `${exercise.slotStartDate} · ${exercise.slotWeeks} week(s)`,
            },
            { label: 'TMS period', value: `${exercise.tmsFrom} – ${exercise.tmsTo}` },
            { label: 'Status', value: exercise.workflowStatus },
            { label: 'Delivery HC', value: deliveryHc.toFixed(1) },
          ]"
        />
        <div
          v-if="!locked"
          class="rounded-md bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-foreground"
        >
          Associated Data initialized from the latest Approved archive. Edit below — all scenarios
          in this exercise share this baseline.
        </div>
      </CardContent>
    </Card>

    <AssociatedDataPanel :exercise-id="exerciseId" :read-only="locked" />

    <Card>
      <CardHeader class="items-center">
        <CardTitle class="text-base">Scenario Matrix</CardTitle>
        <CardAction v-if="!locked" class="flex gap-2">
          <Button variant="outline" @click="openOfficialDialog">Save Official Scenario</Button>
          <Button @click="newScenarioOpen = true">New Scenario</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto rounded-lg border">
          <Table class="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead class="w-24 text-center">Is Official</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assumptions</TableHead>
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
                    ? 'bg-primary/5'
                    : scenario.status === 'OFFICIAL'
                      ? 'bg-amber-50'
                      : undefined
                "
                @click="!locked && (selectedId = selectedId === scenario.id ? null : scenario.id)"
              >
                <TableCell class="text-center">
                  <span v-if="scenario.status === 'OFFICIAL'" class="text-amber-500">★</span>
                </TableCell>
                <TableCell class="font-semibold">{{ scenario.scenarioCode }}</TableCell>
                <TableCell>{{ scenario.name }}</TableCell>
                <TableCell>{{ scenario.status }}</TableCell>
                <TableCell>{{ scenario.assumptions.length }}</TableCell>
                <TableCell class="text-right" @click.stop>
                  <Button
                    size="sm"
                    variant="outline"
                    @click="
                      router.push({
                        name: 'supervisor-scenario-form',
                        params: { id: exerciseId, scenarioId: scenario.id },
                      })
                    "
                  >
                    {{ locked ? 'Open' : 'Edit' }}
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!scenarios.length">
                <TableCell colspan="6" class="h-24 text-center text-muted-foreground">
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

    <Dialog v-model:open="newScenarioOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Scenario</DialogTitle>
          <DialogDescription>
            A new scenario will be created with the following identity. You can adjust assumptions
            on the next page.
          </DialogDescription>
        </DialogHeader>
        <DetailTable
          :rows="[
            { label: 'Toolkit', value: exercise.snapshot.toolkit.name },
            { label: 'Exercise NO', value: exercise.exerciseCode },
            { label: 'Scenario NO', value: nextScenarioCode, strong: true },
          ]"
        />
        <DialogFooter>
          <Button variant="outline" :disabled="createPending" @click="newScenarioOpen = false">
            Cancel
          </Button>
          <Button :disabled="createPending" @click="createScenario">
            {{ createPending ? 'Creating…' : 'Confirm' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="officialOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save Official Scenario</DialogTitle>
          <DialogDescription>
            Review the package below and confirm to mark this as the official scenario.
          </DialogDescription>
        </DialogHeader>
        <DetailTable
          v-if="selectedScenario"
          :rows="[
            { label: 'Scenario', value: selectedScenario.scenarioCode, strong: true },
            { label: 'Name', value: selectedScenario.name },
            { label: 'Status', value: selectedScenario.status },
            { label: 'Assumptions', value: String(selectedScenario.assumptions.length) },
          ]"
        />
        <DialogFooter>
          <Button variant="outline" :disabled="officialPending" @click="officialOpen = false">
            Cancel
          </Button>
          <Button :disabled="officialPending" @click="confirmOfficial">
            {{ officialPending ? 'Saving…' : 'Confirm as Official' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete Exercise"
      description="This removes the In Progress exercise. This action cannot be undone."
      confirm-label="Delete Exercise"
      :pending="deletePending"
      @confirm="confirmDelete"
    />

    <SubmitDialog v-model:open="submitOpen" :exercise-id="exerciseId" @submitted="onSubmitted" />
  </div>
</template>
