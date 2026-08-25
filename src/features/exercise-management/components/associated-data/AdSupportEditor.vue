<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { computed, ref } from 'vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
import { useSupportCategoryQuery } from '@/features/support-category/api/queries'
import { categoriesForSelect } from '@/features/support-category/options'

import { useExerciseAssociatedDataMutations } from '../../api/mutations'
import { useBeforeAssociatedDataWrite } from '../../composables/useAssociatedDataSaveGuard'
import {
  emptySupportItemForm,
  supportItemFormSchema,
  supportItemToForm,
  toSupportItemRequest,
  type SupportItemFormValues,
} from '../../schemas/supportItem'
import type { SupportItem, TeamSetup } from '../../types'
import { FieldUnit, withUnit } from '../../fieldUnits'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'
import {
  SUPPORT_FREQUENCIES,
  SUPPORT_UOMS,
  annualMultiplier,
  fteAnnualHours,
  hoursPerYear,
  sumSupportFte,
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

const { createSupport, updateSupport, deleteSupport } = useExerciseAssociatedDataMutations()
const beforeAssociatedDataWrite = useBeforeAssociatedDataWrite()
const categoryQuery = useSupportCategoryQuery()
const adding = ref(false)
const editingId = ref<string | null>(null)
const busy = ref(false)
const deleteTarget = ref<SupportItem | null>(null)
const deleteOpen = ref(false)
const { defineField, errors, resetForm, validate, values } = useForm<SupportItemFormValues>({
  validationSchema: toTypedSchema(supportItemFormSchema),
  initialValues: emptySupportItemForm(),
  validateOnMount: false,
})
const [categoryId] = defineField('categoryId')
const [categoryName] = defineField('categoryName')
const [activity] = defineField('activity')
const [frequencyCode] = defineField('frequencyCode')
const [volume] = defineField('volume')
const [unitOfMeasure] = defineField('unitOfMeasure')
const [workloadPerUnitMinutes] = defineField('workloadPerUnitMinutes')
const [comments] = defineField('comments')

const catalog = computed(() => categoryQuery.data.value?.categories ?? [])
const currentCategory = computed(() =>
  values.categoryId ? { id: values.categoryId, name: values.categoryName } : null,
)
const categoryChoices = computed(() => categoriesForSelect(catalog.value, currentCategory.value))

const totalFte = computed(() => sumSupportFte(props.items))

const totalAnnualHours = computed(() => {
  if (!props.items.length) return null
  return props.items.reduce((sum, item) => sum + (Number(item.workloadPerYearHours) || 0), 0)
})

const draftMultiplier = computed(() =>
  annualMultiplier(values.frequencyCode, props.teamSetup?.workingDaysPerYear),
)

const draftHoursPerYear = computed(() =>
  hoursPerYear(
    values.volume == null ? null : Number(values.volume),
    values.workloadPerUnitMinutes == null ? null : Number(values.workloadPerUnitMinutes),
    draftMultiplier.value,
  ),
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
  resetForm({
    values: emptySupportItemForm(
      categoryChoices.value[0]?.id ?? '',
      categoryChoices.value[0]?.name ?? '',
    ),
  })
}

function fillDraft(item: SupportItem) {
  resetForm({ values: supportItemToForm(item) })
}

function onCategoryChange() {
  const match = categoryChoices.value.find((item) => item.id === categoryId.value)
  categoryName.value = match?.name ?? ''
}

function firstFormError(bag: Record<string, unknown>): string | undefined {
  for (const value of Object.values(bag)) {
    if (typeof value === 'string' && value.trim()) return value
  }
}

async function buildRequest() {
  const result = await validate()
  if (!result.valid) {
    toast.warning(firstFormError(errors.value) ?? 'Check the highlighted fields.')
    return null
  }
  return toSupportItemRequest(values)
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
  const body = await buildRequest()
  if (!body) return
  if (!(await beforeAssociatedDataWrite())) return
  busy.value = true
  try {
    const created = await createSupport.mutateAsync({ exerciseId: props.exerciseId, body })
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
  const body = await buildRequest()
  if (!body) return
  if (!(await beforeAssociatedDataWrite())) return
  const itemId = editingId.value
  busy.value = true
  try {
    const updated = await updateSupport.mutateAsync({
      exerciseId: props.exerciseId,
      itemId,
      body,
    })
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

function requestDelete(item: SupportItem) {
  if (formLocked.value) return
  deleteTarget.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  const item = deleteTarget.value
  if (!item) return
  deleteOpen.value = false
  if (!(await beforeAssociatedDataWrite())) return
  busy.value = true
  try {
    await deleteSupport.mutateAsync({ exerciseId: props.exerciseId, itemId: item.id })
    emit(
      'update:items',
      props.items.filter((row) => row.id !== item.id),
    )
    deleteOpen.value = false
    deleteTarget.value = null
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
        :label="withUnit('Total support', FieldUnit.fte)"
        :value="totalFte != null ? formatNumber(totalFte, 2) : '—'"
        hint="Summed from registry"
      />
      <AdMetric
        :label="withUnit('Annual support hours', FieldUnit.hours)"
        :value="totalAnnualHours != null ? formatNumber(totalAnnualHours, 2) : '—'"
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
            <TableRow v-if="adding" class="bg-muted/30">
              <TableCell>
                <select
                  v-model="categoryId"
                  :class="controlClass"
                  :aria-invalid="Boolean(errors.categoryId)"
                  @change="onCategoryChange"
                >
                  <option value="">Select category</option>
                  <option
                    v-for="category in categoryChoices"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
              </TableCell>
              <TableCell>
                <Input
                  v-model="activity"
                  placeholder="Activity"
                  :aria-invalid="Boolean(errors.activity)"
                />
              </TableCell>
              <TableCell>
                <select
                  v-model="frequencyCode"
                  :class="controlClass"
                  :aria-invalid="Boolean(errors.frequencyCode)"
                >
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
                <NumberFieldControl
                  v-model="volume"
                  :min="0"
                  :invalid="Boolean(errors.volume)"
                />
              </TableCell>
              <TableCell>
                <select
                  v-model="unitOfMeasure"
                  :class="controlClass"
                  :aria-invalid="Boolean(errors.unitOfMeasure)"
                >
                  <option v-for="uom in SUPPORT_UOMS" :key="uom" :value="uom">
                    {{ uom }}
                  </option>
                </select>
              </TableCell>
              <TableCell>
                <NumberFieldControl
                  v-model="workloadPerUnitMinutes"
                  :min="0"
                  :invalid="Boolean(errors.workloadPerUnitMinutes)"
                />
              </TableCell>
              <TableCell>
                <ReadOnlyField
                  :value="draftHoursPerYear != null ? formatNumber(draftHoursPerYear, 2) : '—'"
                />
              </TableCell>
              <TableCell>
                <ReadOnlyField :value="draftFte != null ? formatNumber(draftFte, 2) : '—'" />
              </TableCell>
              <TableCell>
                <Input
                  v-model="comments"
                  placeholder="Comments"
                  :aria-invalid="Boolean(errors.comments)"
                />
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

            <TableRow
              v-for="item in items"
              :key="item.id"
              :class="editingId === item.id ? 'bg-muted/30' : undefined"
            >
              <template v-if="editingId === item.id">
                <TableCell>
                  <select
                    v-model="categoryId"
                    :aria-invalid="Boolean(errors.categoryId)"
                    :class="controlClass"
                    @change="onCategoryChange"
                  >
                    <option value="">Select category</option>
                    <option
                      v-for="category in categoryChoices"
                      :key="category.id"
                      :value="category.id"
                    >
                      {{ category.name }}
                    </option>
                  </select>
                </TableCell>
                <TableCell>
                  <Input
                    v-model="activity"
                    placeholder="Activity"
                    :aria-invalid="Boolean(errors.activity)"
                  />
                </TableCell>
                <TableCell>
                  <select
                    v-model="frequencyCode"
                    :class="controlClass"
                    :aria-invalid="Boolean(errors.frequencyCode)"
                  >
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
                  <NumberFieldControl
                    v-model="volume"
                    :min="0"
                    :invalid="Boolean(errors.volume)"
                  />
                </TableCell>
                <TableCell>
                  <select
                    v-model="unitOfMeasure"
                    :class="controlClass"
                    :aria-invalid="Boolean(errors.unitOfMeasure)"
                  >
                    <option v-for="uom in SUPPORT_UOMS" :key="uom" :value="uom">
                      {{ uom }}
                    </option>
                  </select>
                </TableCell>
                <TableCell>
                  <NumberFieldControl
                    v-model="workloadPerUnitMinutes"
                    :min="0"
                    :invalid="Boolean(errors.workloadPerUnitMinutes)"
                  />
                </TableCell>
                <TableCell>
                  <ReadOnlyField
                    :value="draftHoursPerYear != null ? formatNumber(draftHoursPerYear, 2) : '—'"
                  />
                </TableCell>
                <TableCell>
                  <ReadOnlyField :value="draftFte != null ? formatNumber(draftFte, 2) : '—'" />
                </TableCell>
                <TableCell>
                  <Input
                    v-model="comments"
                    placeholder="Comments"
                    :aria-invalid="Boolean(errors.comments)"
                  />
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
                <TableCell>{{ formatNumber(item.workloadPerUnitMinutes, 2) }}</TableCell>
                <TableCell>
                  {{
                    item.workloadPerYearHours != null
                      ? formatNumber(item.workloadPerYearHours, 2)
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
                      @click="requestDelete(item)"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </template>
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

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete Workload"
      description="This workload will be removed from Production Support. This cannot be undone."
      :rows="
        deleteTarget
          ? [
              { label: 'Category', value: deleteTarget.category },
              { label: 'Activity', value: deleteTarget.activity, strong: true },
            ]
          : []
      "
      confirm-label="Delete"
      :pending="busy"
      @confirm="confirmDelete"
    />
  </div>
</template>
