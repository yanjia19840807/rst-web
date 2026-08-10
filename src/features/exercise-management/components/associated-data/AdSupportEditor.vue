<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'

import ReadOnlyField from '@/components/ReadOnlyField.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberFieldControl } from '@/components/ui/number-field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { exerciseApi } from '../../api'
import type { SupportItem, SupportItemRequest, TeamSetup } from '../../types'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_FREQUENCIES,
  SUPPORT_UOMS,
  annualMultiplier,
  fteAnnualHours,
  hoursPerYear,
  supportFte,
} from './supportOptions'

const props = defineProps<{
  exerciseId: string
  items: SupportItem[]
  teamSetup?: TeamSetup | null
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:items': [value: SupportItem[]]
}>()

const controlClass =
  'flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm'

const adding = ref(false)
const editingId = ref<string | null>(null)
const busy = ref(false)
const draft = reactive({
  category: SUPPORT_CATEGORIES[0] as string,
  activity: '',
  frequencyCode: 'MONTHLY',
  volume: null as number | null,
  unitOfMeasure: SUPPORT_UOMS[0] as string,
  workloadPerUnitMinutes: null as number | null,
  comments: '',
})

const totalFte = computed(() => {
  if (!props.items.length) return null
  return props.items.reduce((sum, item) => sum + (Number(item.supportFte) || 0), 0)
})

const totalAnnualHours = computed(() => {
  if (!props.items.length) return null
  return props.items.reduce((sum, item) => sum + (Number(item.workloadPerYearHours) || 0), 0)
})

const draftMultiplier = computed(() =>
  annualMultiplier(draft.frequencyCode, props.teamSetup?.workingDaysPerYear),
)

const draftHoursPerYear = computed(() =>
  hoursPerYear(draft.volume, draft.workloadPerUnitMinutes, draftMultiplier.value),
)

const draftFte = computed(() =>
  supportFte(
    draftHoursPerYear.value,
    fteAnnualHours({
      workingHoursPerDay: props.teamSetup?.workingHoursPerDay,
      availabilityRatio: props.teamSetup?.availabilityRatio,
      workingDaysPerYear: props.teamSetup?.workingDaysPerYear,
      capacityRatio: props.teamSetup?.capacityRatio,
    }),
  ),
)

const formLocked = computed(() => adding.value || editingId.value != null)

function resetDraft() {
  draft.category = SUPPORT_CATEGORIES[0]
  draft.activity = ''
  draft.frequencyCode = 'MONTHLY'
  draft.volume = null
  draft.unitOfMeasure = SUPPORT_UOMS[0]
  draft.workloadPerUnitMinutes = null
  draft.comments = ''
}

function fillDraft(item: SupportItem) {
  draft.category = item.category
  draft.activity = item.activity
  draft.frequencyCode = item.frequencyCode
  draft.volume = item.volume
  draft.unitOfMeasure = item.unitOfMeasure
  draft.workloadPerUnitMinutes = item.workloadPerUnitMinutes
  draft.comments = item.comments ?? ''
}

function buildRequest(): SupportItemRequest | null {
  if (!draft.category.trim() || !draft.activity.trim()) {
    toast.warning('Category and Activity are required.')
    return null
  }
  if (draft.volume == null || draft.workloadPerUnitMinutes == null) {
    toast.warning('Volume and Mins / unit are required.')
    return null
  }
  return {
    category: draft.category.trim(),
    activity: draft.activity.trim(),
    frequencyCode: draft.frequencyCode,
    volume: draft.volume,
    unitOfMeasure: draft.unitOfMeasure,
    workloadPerUnitMinutes: draft.workloadPerUnitMinutes,
    annualMultiplier: draftMultiplier.value,
    comments: draft.comments || null,
  }
}

function startAdd() {
  if (formLocked.value) return
  resetDraft()
  adding.value = true
}

function cancelAdd() {
  adding.value = false
}

async function confirmAdd() {
  const body = buildRequest()
  if (!body) return
  busy.value = true
  try {
    const created = await exerciseApi.createSupport(props.exerciseId, body)
    emit('update:items', [...props.items, created])
    adding.value = false
    toast.success('Workload added.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not add workload.')
  } finally {
    busy.value = false
  }
}

function startEdit(item: SupportItem) {
  if (formLocked.value) return
  fillDraft(item)
  editingId.value = item.id
}

function cancelEdit() {
  editingId.value = null
}

async function confirmEdit() {
  if (!editingId.value) return
  const body = buildRequest()
  if (!body) return
  const itemId = editingId.value
  busy.value = true
  try {
    const updated = await exerciseApi.updateSupport(props.exerciseId, itemId, body)
    emit(
      'update:items',
      props.items.map((item) => (item.id === itemId ? updated : item)),
    )
    editingId.value = null
    toast.success('Workload updated.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not update workload.')
  } finally {
    busy.value = false
  }
}

async function removeItem(itemId: string) {
  if (formLocked.value) return
  busy.value = true
  try {
    await exerciseApi.deleteSupport(props.exerciseId, itemId)
    emit(
      'update:items',
      props.items.filter((item) => item.id !== itemId),
    )
    toast.success('Workload deleted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Delete failed.')
  } finally {
    busy.value = false
  }
}

function frequencyLabel(code: string) {
  return SUPPORT_FREQUENCIES.find((item) => item.value === code)?.label ?? code
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AdMetric
        label="Total support FTE"
        :value="totalFte != null ? formatNumber(totalFte, 2) : '—'"
        hint="Summed from registry"
      />
      <AdMetric
        label="Annual support hours"
        :value="totalAnnualHours != null ? formatNumber(totalAnnualHours, 1) : '—'"
        hint="Sum of Hours / year"
      />
    </div>

    <section class="rounded-lg border bg-card p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h3 class="text-sm font-bold">Workload Registry</h3>
        <Button
          v-if="!readOnly"
          size="sm"
          variant="outline"
          :disabled="formLocked"
          @click="startAdd"
        >
          Add Workload
        </Button>
      </div>

      <div class="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Mins / unit</TableHead>
              <TableHead>Hours / year</TableHead>
              <TableHead>FTE</TableHead>
              <TableHead>Comments</TableHead>
              <TableHead v-if="!readOnly">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="item in items"
              :key="item.id"
              :class="editingId === item.id ? 'bg-muted/30' : undefined"
            >
              <template v-if="editingId === item.id">
                <TableCell>
                  <select v-model="draft.category" :class="controlClass">
                    <option
                      v-for="category in SUPPORT_CATEGORIES"
                      :key="category"
                      :value="category"
                    >
                      {{ category }}
                    </option>
                  </select>
                </TableCell>
                <TableCell>
                  <Input v-model="draft.activity" placeholder="Activity" />
                </TableCell>
                <TableCell>
                  <select v-model="draft.frequencyCode" :class="controlClass">
                    <option
                      v-for="frequency in SUPPORT_FREQUENCIES"
                      :key="frequency.value"
                      :value="frequency.value"
                    >
                      {{ frequency.label }}
                    </option>
                  </select>
                </TableCell>
                <TableCell>
                  <NumberFieldControl v-model="draft.volume" :min="0" :step="1" />
                </TableCell>
                <TableCell>
                  <select v-model="draft.unitOfMeasure" :class="controlClass">
                    <option v-for="uom in SUPPORT_UOMS" :key="uom" :value="uom">
                      {{ uom }}
                    </option>
                  </select>
                </TableCell>
                <TableCell>
                  <NumberFieldControl
                    v-model="draft.workloadPerUnitMinutes"
                    :min="0"
                    :step="0.1"
                  />
                </TableCell>
                <TableCell>
                  <ReadOnlyField
                    :value="draftHoursPerYear != null ? formatNumber(draftHoursPerYear, 1) : '—'"
                  />
                </TableCell>
                <TableCell>
                  <ReadOnlyField :value="draftFte != null ? formatNumber(draftFte, 2) : '—'" />
                </TableCell>
                <TableCell>
                  <Input v-model="draft.comments" placeholder="Comments" />
                </TableCell>
                <TableCell>
                  <div class="flex gap-3">
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
                      :disabled="busy"
                      @click="confirmEdit"
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
                      :disabled="busy"
                      @click="cancelEdit"
                    >
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </template>
              <template v-else>
                <TableCell>{{ item.category }}</TableCell>
                <TableCell>{{ item.activity }}</TableCell>
                <TableCell>{{ frequencyLabel(item.frequencyCode) }}</TableCell>
                <TableCell>{{ formatNumber(item.volume, 2) }}</TableCell>
                <TableCell>{{ item.unitOfMeasure }}</TableCell>
                <TableCell>{{ formatNumber(item.workloadPerUnitMinutes, 1) }}</TableCell>
                <TableCell>
                  {{
                    item.workloadPerYearHours != null
                      ? formatNumber(item.workloadPerYearHours, 1)
                      : '—'
                  }}
                </TableCell>
                <TableCell>
                  {{ item.supportFte != null ? formatNumber(item.supportFte, 2) : '—' }}
                </TableCell>
                <TableCell>{{ item.comments || '—' }}</TableCell>
                <TableCell v-if="!readOnly">
                  <div class="flex gap-3">
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
                      :disabled="busy || formLocked"
                      @click="startEdit(item)"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="link-destructive"
                      class="h-auto px-0 font-semibold"
                      :disabled="busy || formLocked"
                      @click="removeItem(item.id)"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </template>
            </TableRow>

            <TableRow v-if="adding" class="bg-muted/30">
              <TableCell>
                <select v-model="draft.category" :class="controlClass">
                  <option v-for="category in SUPPORT_CATEGORIES" :key="category" :value="category">
                    {{ category }}
                  </option>
                </select>
              </TableCell>
              <TableCell>
                <Input v-model="draft.activity" placeholder="Activity" />
              </TableCell>
              <TableCell>
                <select v-model="draft.frequencyCode" :class="controlClass">
                  <option
                    v-for="frequency in SUPPORT_FREQUENCIES"
                    :key="frequency.value"
                    :value="frequency.value"
                  >
                    {{ frequency.label }}
                  </option>
                </select>
              </TableCell>
              <TableCell>
                <NumberFieldControl v-model="draft.volume" :min="0" :step="1" />
              </TableCell>
              <TableCell>
                <select v-model="draft.unitOfMeasure" :class="controlClass">
                  <option v-for="uom in SUPPORT_UOMS" :key="uom" :value="uom">
                    {{ uom }}
                  </option>
                </select>
              </TableCell>
              <TableCell>
                <NumberFieldControl v-model="draft.workloadPerUnitMinutes" :min="0" :step="0.1" />
              </TableCell>
              <TableCell>
                <ReadOnlyField
                  :value="draftHoursPerYear != null ? formatNumber(draftHoursPerYear, 1) : '—'"
                />
              </TableCell>
              <TableCell>
                <ReadOnlyField :value="draftFte != null ? formatNumber(draftFte, 2) : '—'" />
              </TableCell>
              <TableCell>
                <Input v-model="draft.comments" placeholder="Comments" />
              </TableCell>
              <TableCell>
                <div class="flex gap-3">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    @click="confirmAdd"
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    :disabled="busy"
                    @click="cancelAdd"
                  >
                    Cancel
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            <TableRow v-if="!items.length && !adding">
              <TableCell
                :colspan="readOnly ? 9 : 10"
                class="h-20 text-center text-sm text-muted-foreground italic"
              >
                No support rows{{ readOnly ? '.' : ' — click "Add Workload" to begin.' }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </div>
</template>
