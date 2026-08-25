<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
import ListLoading from '@/components/ListLoading.vue'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

import { useExerciseMutations } from '../api/mutations'
import { useSubmitPreviewQuery } from '../api/queries'
import {
  emptySubmitRemarks,
  submitRemarksRequiredSchema,
  submitRemarksSchema,
} from '../schemas/submitRemarks'
import type {
  SubmittedDetails,
  ValidationFinding,
  ValidationRuleCode,
} from '../types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  exerciseId: string
}>()

const emit = defineEmits<{
  submitted: [details: SubmittedDetails]
}>()

const { submit } = useExerciseMutations()
const { defineField, errors, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema: toTypedSchema(submitRemarksSchema),
  initialValues: emptySubmitRemarks(),
  validateOnMount: false,
})
const [remarks] = defineField('remarks')
const previewQuery = useSubmitPreviewQuery(
  () => props.exerciseId,
  open,
)
const preview = computed(() => previewQuery.data.value ?? null)
const loading = computed(() => previewQuery.isPending.value && !previewQuery.data.value)

const remarksRequired = computed(() => preview.value?.remarksRequired ?? false)
const submitBlocked = computed(() => preview.value?.submitBlocked ?? false)
const submitting = computed(() => submit.isPending.value)

const findingLabel: Record<ValidationRuleCode, string> = {
  DAILY_VS_MONTHLY: 'Daily total vs monthly total',
}

const reasonLabel: Record<string, string> = {
  'both-empty': 'No monthly or daily actuals to compare',
  'monthly-empty': 'No monthly actuals to compare',
  'daily-empty': 'No daily actuals to compare',
  'no-overlap': 'No overlapping months to compare',
  matched: 'Overlapping months match',
  mismatch: 'Overlapping months do not match',
}

watch(open, (value) => {
  if (!value) return
  resetForm({ values: emptySubmitRemarks() })
})

watch(
  [open, () => previewQuery.isError.value, () => previewQuery.isFetching.value],
  ([isOpen, isError, isFetching]) => {
    if (!isOpen || !isError || isFetching) return
    toast.error(
      previewQuery.error.value instanceof Error
        ? previewQuery.error.value.message
        : 'Submit preview failed.',
    )
    open.value = false
  },
)

const submitNow = handleSubmit(async (values) => {
  if (submitBlocked.value) return
  if (remarksRequired.value) {
    const required = submitRemarksRequiredSchema().safeParse(values)
    if (!required.success) {
      setFieldError(
        'remarks',
        required.error.issues[0]?.message ??
          'Remarks are required when warning checks fail.',
      )
      return
    }
  }
  try {
    const key = crypto.randomUUID()
    const details = await submit.mutateAsync({
      id: props.exerciseId,
      body: { remarks: values.remarks.trim() || null, requestId: key },
      idempotencyKey: key,
    })
    emit('submitted', details)
    open.value = false
    toast.success('Submitted for validation. Awaiting Manager approval.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Submit failed.')
  }
})

function validationSummary(): string {
  if (submitBlocked.value) return 'Severe checks failed — submit is blocked'
  if (remarksRequired.value) return 'Warning checks failed — remarks required'
  return 'Ready to submit'
}

function findingDetail(finding: ValidationFinding): string {
  const reason = finding.detail?.reason
  if (reason && reasonLabel[reason]) return reasonLabel[reason]
  return reason ?? '—'
}

function mismatchesOf(finding: ValidationFinding) {
  return finding.detail?.mismatches ?? []
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Submit For Validation</DialogTitle>
        <DialogDescription>
          This will send the Official Scenario to Manager Review and lock the exercise.
          You cannot edit it until it is returned or withdrawn. Warning checks require remarks.
          Severe checks block submit.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div v-if="loading" class="rounded-lg border bg-card p-4">
          <ListLoading />
        </div>
        <div v-else class="rounded-lg border bg-card p-4">
          <div>
            <div class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Submission path
            </div>
            <DetailTable
              :rows="[
                { label: 'Next step', value: 'Manager Review' },
                { label: 'Current owner', value: 'Manager queue' },
                { label: 'Notification', value: 'HO Transformation Team after validation' },
              ]"
            />
          </div>

          <div class="mt-4">
            <div class="mb-2 flex items-baseline justify-between gap-2">
              <div class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Pre-submit Validation
              </div>
              <span class="text-xs text-muted-foreground">
                {{ validationSummary() }}
              </span>
            </div>
            <div class="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check</TableHead>
                    <TableHead class="w-28">Severity</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="finding in preview?.findings ?? []" :key="finding.ruleCode">
                    <TableCell>{{ findingLabel[finding.ruleCode] ?? finding.ruleCode }}</TableCell>
                    <TableCell>{{ finding.severity }}</TableCell>
                    <TableCell>
                      <div>{{ findingDetail(finding) }}</div>
                      <ul
                        v-if="mismatchesOf(finding).length"
                        class="mt-1 space-y-0.5 text-xs text-muted-foreground"
                      >
                        <li
                          v-for="mismatch in mismatchesOf(finding)"
                          :key="mismatch.month"
                        >
                          {{ mismatch.month }}: daily {{ mismatch.daily }} ≠ monthly
                          {{ mismatch.monthly }}
                        </li>
                      </ul>
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="!(preview?.findings?.length)">
                    <TableCell colspan="3" class="text-muted-foreground">
                      No validation findings returned.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div class="mt-4 grid gap-1.5">
            <Label for="submit-remarks">
              Submission remarks{{ remarksRequired && !submitBlocked ? ' *' : '' }}
            </Label>
            <p class="text-xs text-muted-foreground">
              {{
                submitBlocked
                  ? 'Resolve severe checks before submitting.'
                  : remarksRequired
                    ? 'Required because at least one warning check failed.'
                    : 'Optional context for the Manager reviewer.'
              }}
            </p>
            <Textarea
              id="submit-remarks"
              v-model="remarks"
              rows="3"
              :aria-invalid="Boolean(errors.remarks)"
            />
            <p v-if="errors.remarks" class="text-xs text-destructive">{{ errors.remarks }}</p>
          </div>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button variant="outline" :disabled="submitting" @click="open = false">Cancel</Button>
        <Button :disabled="loading || submitting || submitBlocked" @click="submitNow">
          {{ submitting ? 'Submitting…' : 'Confirm Submit' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
