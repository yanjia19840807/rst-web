<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
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

import { exerciseApi } from '../api'
import type { SubmitPreview, SubmittedDetails } from '../types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  exerciseId: string
}>()

const emit = defineEmits<{
  submitted: [details: SubmittedDetails]
}>()

const loading = ref(false)
const submitting = ref(false)
const preview = ref<SubmitPreview | null>(null)
const remarks = ref('')

const remarksRequired = computed(() => preview.value?.remarksRequired ?? false)

const findingLabel: Record<string, string> = {
  DAILY_VS_MONTHLY: 'Daily total vs monthly total',
  SHARED_KPI_PRESENT: 'Shared KPI lines present',
}

watch(open, async (value) => {
  if (!value) {
    preview.value = null
    remarks.value = ''
    return
  }
  loading.value = true
  try {
    preview.value = await exerciseApi.submitPreview(props.exerciseId)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Submit preview failed.')
    open.value = false
  } finally {
    loading.value = false
  }
})

async function confirm() {
  if (remarksRequired.value && !remarks.value.trim()) {
    toast.warning('Remarks are required when severe validation checks fail.')
    return
  }
  submitting.value = true
  try {
    const key = crypto.randomUUID()
    const details = await exerciseApi.submit(
      props.exerciseId,
      { remarks: remarks.value.trim() || null, requestId: key },
      key,
    )
    emit('submitted', details)
    open.value = false
    toast.success('Submitted for validation. Awaiting Manager approval.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Submit failed.')
  } finally {
    submitting.value = false
  }
}

function severityLabel(finding: { severity: string; passed: boolean }) {
  if (finding.passed && finding.severity !== 'SEVERE') return 'Passed'
  if (finding.severity === 'SEVERE') return 'Severe'
  if (finding.severity === 'WARNING') return 'Warning'
  return finding.severity
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Submit For Validation</DialogTitle>
        <DialogDescription>
          System checks run before lock. Failed severe checks require remarks.
        </DialogDescription>
      </DialogHeader>

      <div v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
        Running pre-submit validation…
      </div>
      <div v-else class="grid gap-4">
        <DetailTable
          :rows="[
            { label: 'Next step', value: 'Manager Review' },
            { label: 'Current owner', value: 'Manager queue' },
            { label: 'Notification', value: 'HO Transformation Team after validation' },
          ]"
        />

        <div>
          <div class="mb-1 text-sm font-semibold">Pre-submit Validation</div>
          <p class="mb-3 text-xs text-muted-foreground">
            {{
              remarksRequired
                ? 'One or more severe checks failed. Add remarks before confirming.'
                : 'All severe checks passed. Remarks are optional.'
            }}
          </p>
          <div class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead class="w-28">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="finding in preview?.findings ?? []" :key="finding.ruleCode">
                  <TableCell>{{ findingLabel[finding.ruleCode] ?? finding.ruleCode }}</TableCell>
                  <TableCell>
                    {{ finding.passed ? 'Passed' : 'Failed' }}
                  </TableCell>
                  <TableCell>{{ severityLabel(finding) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div class="grid gap-1.5">
          <Label for="submit-remarks">
            Submission remarks{{ remarksRequired ? ' *' : '' }}
          </Label>
          <p class="text-xs text-muted-foreground">
            {{
              remarksRequired
                ? 'Required because at least one severe check failed.'
                : 'Optional context for the Manager reviewer.'
            }}
          </p>
          <Textarea id="submit-remarks" v-model="remarks" rows="3" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="submitting" @click="open = false">Cancel</Button>
        <Button :disabled="loading || submitting" @click="confirm">
          {{ submitting ? 'Submitting…' : 'Confirm Submit' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
