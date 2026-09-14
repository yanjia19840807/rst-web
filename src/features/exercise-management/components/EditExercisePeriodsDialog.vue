<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
import { showOperationNotices } from '@/composables/useOperationNotices'

import { useExerciseMutations } from '../api/mutations'
import {
  editExercisePeriodsSchema,
  emptyEditExercisePeriodsForm,
} from '../schemas/exercisePeriods'
import type { Exercise } from '../types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  exercise: Exercise
}>()

const emit = defineEmits<{
  saved: [exercise: Exercise]
}>()

const { updatePeriods } = useExerciseMutations()
const busy = computed(() => updatePeriods.isPending.value)
const confirmOpen = ref(false)

const { defineField, errors, handleSubmit, resetForm, values } = useForm({
  validationSchema: toTypedSchema(editExercisePeriodsSchema),
  initialValues: emptyEditExercisePeriodsForm(),
  validateOnMount: false,
})

const [sizingMonth] = defineField('sizingMonth')

const sizingChanged = computed(
  () => (values.sizingMonth ?? '') !== props.exercise.sizingMonth,
)

watch(open, (value) => {
  if (!value) return
  confirmOpen.value = false
  resetForm({
    values: {
      sizingMonth: props.exercise.sizingMonth,
    },
  })
})

const requestSave = handleSubmit(() => {
  if (!sizingChanged.value) {
    open.value = false
    return
  }
  confirmOpen.value = true
})

async function confirmSave() {
  try {
    const result = await updatePeriods.mutateAsync({
      id: props.exercise.id,
      body: {
        sizingMonth: values.sizingMonth!,
      },
    })
    confirmOpen.value = false
    emit('saved', result.exercise)
    open.value = false
    const summary = 'Exercise periods updated.'
    const shown = showOperationNotices({
      summary,
      notices: result.notices ?? [],
    })
    if (!shown) toast.success(summary)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not update periods.')
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      :close-on-outside="!confirmOpen"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Edit Exercise Periods</DialogTitle>
        <DialogDescription>
          Update Sizing Month. Toolkit remains frozen from create. TMS period is set in Associated
          Data when using the SYSTEM median.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div class="grid gap-4 rounded-lg border bg-card p-4">
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
        <Button :loading="busy" @click="requestSave">
          {{ busy ? 'Saving…' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    v-model:open="confirmOpen"
    title="Update Exercise Periods"
    description="Sizing Month change resets Monthly and Daily Volume from Toolkit (last 36 months). Volume edits on this Exercise are discarded. Saved Forecast and Simulation results on all scenarios will be cleared."
    confirm-label="Save"
    confirm-variant="default"
    :pending="busy"
    @confirm="confirmSave"
  />
</template>
