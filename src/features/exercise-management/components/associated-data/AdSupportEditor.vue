<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { exerciseApi } from '../../api'
import type { SupportItem, SupportItemRequest } from '../../types'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'

const props = defineProps<{
  exerciseId: string
  items: SupportItem[]
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:items': [value: SupportItem[]]
}>()

const adding = ref(false)
const busy = ref(false)
const draft = ref({
  category: '',
  activity: '',
  frequencyCode: 'MONTHLY',
  volume: '1',
  unitOfMeasure: 'CASE',
  workloadPerUnitMinutes: '30',
  annualMultiplier: '12',
  comments: '',
})

const totalFte = computed(() => {
  if (!props.items.length) return null
  return props.items.reduce((sum, item) => sum + (Number(item.supportFte) || 0), 0)
})

function startAdd() {
  if (adding.value) return
  draft.value = {
    category: '',
    activity: '',
    frequencyCode: 'MONTHLY',
    volume: '1',
    unitOfMeasure: 'CASE',
    workloadPerUnitMinutes: '30',
    annualMultiplier: '12',
    comments: '',
  }
  adding.value = true
}

function cancelAdd() {
  adding.value = false
}

async function confirmAdd() {
  if (!draft.value.category.trim() || !draft.value.activity.trim()) {
    toast.warning('Category and Activity are required.')
    return
  }
  busy.value = true
  try {
    const body: SupportItemRequest = {
      category: draft.value.category.trim(),
      activity: draft.value.activity.trim(),
      frequencyCode: draft.value.frequencyCode,
      volume: Number(draft.value.volume),
      unitOfMeasure: draft.value.unitOfMeasure,
      workloadPerUnitMinutes: Number(draft.value.workloadPerUnitMinutes),
      annualMultiplier: Number(draft.value.annualMultiplier),
      comments: draft.value.comments || null,
    }
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

async function removeItem(itemId: string) {
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
</script>

<template>
  <div class="space-y-4">
    <div class="max-w-xs">
      <AdMetric
        label="Total support FTE"
        :value="totalFte != null ? formatNumber(totalFte, 2) : '—'"
        hint="Summed from registry"
      />
    </div>

    <section class="rounded-lg border bg-card p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h3 class="text-sm font-bold">Workload Registry</h3>
        <Button v-if="!readOnly" size="sm" variant="outline" :disabled="adding" @click="startAdd">
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
            <TableRow v-for="item in items" :key="item.id">
              <TableCell>{{ item.category }}</TableCell>
              <TableCell>{{ item.activity }}</TableCell>
              <TableCell>{{ item.frequencyCode }}</TableCell>
              <TableCell>{{ item.volume }}</TableCell>
              <TableCell>{{ item.unitOfMeasure }}</TableCell>
              <TableCell>{{ item.workloadPerUnitMinutes }}</TableCell>
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
                <Button
                  size="sm"
                  variant="link-destructive"
                  class="h-auto px-0 font-semibold"
                  :disabled="busy"
                  @click="removeItem(item.id)"
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>

            <TableRow v-if="adding" class="bg-muted/30">
              <TableCell><Input v-model="draft.category" placeholder="Category" /></TableCell>
              <TableCell><Input v-model="draft.activity" placeholder="Activity" /></TableCell>
              <TableCell><Input v-model="draft.frequencyCode" /></TableCell>
              <TableCell><Input v-model="draft.volume" /></TableCell>
              <TableCell><Input v-model="draft.unitOfMeasure" /></TableCell>
              <TableCell><Input v-model="draft.workloadPerUnitMinutes" /></TableCell>
              <TableCell class="text-muted-foreground">—</TableCell>
              <TableCell class="text-muted-foreground">—</TableCell>
              <TableCell><Input v-model="draft.comments" placeholder="Comments" /></TableCell>
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
