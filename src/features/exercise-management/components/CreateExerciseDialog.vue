<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MonthPicker } from '@/components/ui/month-picker'
import { NativeSelect } from '@/components/ui/native-select'
import TimesheetAlignmentAlert from '@/features/timesheet-alignment/components/TimesheetAlignmentAlert.vue'
import { formatHc } from '@/lib/hcFormat'
import type { SupervisorToolkit } from '@/features/toolkit-management/types'
import { showOperationNotices } from '@/composables/useOperationNotices'
import { formatDate } from '@/lib/datetime'

import { useExerciseMutations } from '../api/mutations'
import {
  createExercisePeriodsSchema,
  emptyCreateExercisePeriodsForm,
} from '../schemas/exercisePeriods'
import type { Exercise } from '../types'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    toolkits: SupervisorToolkit[]
    initialToolkitId?: string
    lockToolkit?: boolean
  }>(),
  {
    initialToolkitId: undefined,
    lockToolkit: false,
  },
)

const emit = defineEmits<{
  created: [exercise: Exercise]
}>()

const { create: createMutation } = useExerciseMutations()
const busy = computed(() => createMutation.isPending.value)

const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: toTypedSchema(createExercisePeriodsSchema),
  initialValues: emptyCreateExercisePeriodsForm(),
  validateOnMount: false,
})

const [toolkitId] = defineField('toolkitId')
const [sizingMonth] = defineField('sizingMonth')

const lockedToolkit = computed(
  () => props.toolkits.find((toolkit) => toolkit.id === (toolkitId.value || props.initialToolkitId)),
)
const selectedToolkit = computed(
  () => props.toolkits.find((toolkit) => toolkit.id === toolkitId.value) ?? lockedToolkit.value,
)
const toolkitBlocked = computed(() => Boolean(selectedToolkit.value?.outOfSync))
const freezeHc = computed(() =>
  formatHc(selectedToolkit.value?.alignment?.currentDeliveryHc, 2),
)
const freezeSyncDate = computed(
  () => selectedToolkit.value?.alignment?.currentMonthlySyncDate || '',
)
const createdLabel = computed(() => formatDate(new Date()))
const infoRows = computed(() => {
  const rows = [
    { label: 'Exercise No', value: 'Assigned on create' },
    { label: 'Created', value: createdLabel.value },
  ]
  if (props.lockToolkit) {
    rows.push({ label: 'Toolkit', value: lockedToolkit.value?.name ?? '' })
  }
  if (selectedToolkit.value && !toolkitBlocked.value) {
    const sync = freezeSyncDate.value
    rows.push({
      label: 'Delivery HC to freeze',
      value: sync ? `${freezeHc.value} (ACTIVE Monthly sync ${sync})` : freezeHc.value,
    })
  }
  return rows
})

watch(open, (value) => {
  if (!value) return
  resetForm({
    values: emptyCreateExercisePeriodsForm(props.initialToolkitId ?? ''),
  })
})

const create = handleSubmit(
  async (formValues) => {
    if (toolkitBlocked.value) {
      toast.error('Reconfigure this Toolkit before creating an Exercise.')
      return
    }
    try {
      const result = await createMutation.mutateAsync({
        toolkitId: formValues.toolkitId,
        sizingMonth: formValues.sizingMonth,
      })
      emit('created', result.exercise)
      open.value = false
      const summary = `${result.exercise.exerciseCode} created.`
      const shown = showOperationNotices({
        summary,
        notices: result.notices ?? [],
      })
      if (!shown) toast.success(summary)
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Exercise could not be created.'
      toast.error(message)
    }
  },
  ({ errors: submitErrors }) => {
    const first = Object.values(submitErrors).find((message) => Boolean(message))
    toast.error(
      typeof first === 'string' ? first : 'Complete the toolkit and Sizing Month.',
    )
  },
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Create New Exercise</DialogTitle>
        <DialogDescription class="sr-only">
          Choose a Toolkit and Sizing Month.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div class="grid gap-4 rounded-lg border bg-card p-4">
          <Alert variant="info">
            <Info />
            <AlertDescription>
              The exercise copies Associated Data and Volume from the Toolkit, and freezes Shared
              KPI scope and Delivery HC.
              Toolkit is the source of that frozen scope and initial data. Sizing Month is the last
              month of the exercise. Volume windows and forecast are calculated from it.
            </AlertDescription>
          </Alert>

          <TimesheetAlignmentAlert audience="create" :alignment="selectedToolkit?.alignment" />

          <DetailTable :rows="infoRows" />

          <div v-if="!lockToolkit" class="grid gap-1.5">
            <Label for="create-exercise-toolkit">Toolkit</Label>
            <NativeSelect
              id="create-exercise-toolkit"
              v-model="toolkitId"
              class="max-w-xs"
              :aria-invalid="Boolean(errors.toolkitId)"
            >
              <option value="">Select toolkit</option>
              <option
                v-for="toolkit in toolkits"
                :key="toolkit.id"
                :value="toolkit.id"
                :disabled="toolkit.outOfSync"
              >
                {{ toolkit.name }}{{ toolkit.outOfSync ? ' (scope changed)' : '' }}
              </option>
            </NativeSelect>
            <p v-if="errors.toolkitId" class="text-xs text-destructive">
              {{ errors.toolkitId }}
            </p>
          </div>

          <div class="grid gap-1.5">
            <Label>Sizing Month</Label>
            <MonthPicker
              v-model="sizingMonth"
              aria-label="Choose sizing month"
              placeholder="Select sizing month"
              class="w-[200px]"
            />
            <p v-if="errors.sizingMonth" class="text-xs text-destructive">
              {{ errors.sizingMonth }}
            </p>
          </div>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button variant="outline" :disabled="busy" @click="open = false">Cancel</Button>
        <Button :loading="busy" :disabled="toolkitBlocked" @click="create">
          {{ busy ? 'Creating…' : 'Confirm' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
