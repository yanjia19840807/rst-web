<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { NumberFieldControl } from '@/components/ui/number-field'
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

import { exerciseApi } from '../../api'
import type { CycleTimeBaselineFile } from '../../types'

const props = defineProps<{
  exerciseId: string
  medianSeconds?: string
  reason?: string
  files?: CycleTimeBaselineFile[]
  readOnly?: boolean
}>()

const draftMedian = ref<number | null>(null)
const draftReason = ref('')
const draftFiles = ref<CycleTimeBaselineFile[]>([])
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => [props.medianSeconds, props.reason, props.files] as const,
  ([median, reason, files]) => {
    draftMedian.value = median?.trim() ? Number(median) : null
    draftReason.value = reason?.trim() || ''
    draftFiles.value = [...(files ?? [])]
  },
  { immediate: true },
)

function formatSize(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function onPickFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  if (!picked.length || props.readOnly || uploading.value) return

  uploading.value = true
  try {
    for (const file of picked) {
      const uploaded = await exerciseApi.uploadCycleTimeSupportFile(props.exerciseId, file)
      draftFiles.value = [...draftFiles.value, uploaded]
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not upload support file.')
  } finally {
    uploading.value = false
  }
}

function removeFile(id: string) {
  if (props.readOnly) return
  draftFiles.value = draftFiles.value.filter((file) => file.id !== id)
}

/**
 * Builds the MANUAL baseline create payload, or null when validation fails.
 */
function toRequest(): {
  medianSeconds: number
  manualReason: string
  fileArtifactIds: string[]
} | null {
  const seconds = Number(draftMedian.value)
  const reason = draftReason.value.trim()
  if (!Number.isFinite(seconds) || seconds <= 0 || !reason) {
    toast.warning('Median seconds and reason are required.')
    return null
  }
  return {
    medianSeconds: seconds,
    manualReason: reason,
    fileArtifactIds: draftFiles.value.map((file) => file.id),
  }
}

defineExpose({ toRequest })
</script>

<template>
  <section class="rounded-lg border bg-card p-4">
    <div class="grid gap-4">
      <div class="grid gap-1.5">
        <Label for="manual-median-seconds">Manual median cycle time (seconds)</Label>
        <NumberFieldControl
          id="manual-median-seconds"
          v-model="draftMedian"
          :min="0"
          :disabled="readOnly"
        />
      </div>

      <div class="grid gap-1.5">
        <Label for="manual-median-reason">Reason for override</Label>
        <Textarea
          id="manual-median-reason"
          :model-value="draftReason"
          rows="4"
          placeholder="Explain why the system median is not used for this exercise."
          :disabled="readOnly"
          @update:model-value="draftReason = String($event)"
        />
      </div>

      <div class="space-y-2.5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm font-semibold">Support files</div>
            <p class="mt-0.5 text-xs text-muted-foreground">
              Optional evidence for the manual median. Files are locked with the exercise on
              submission.
            </p>
          </div>
          <template v-if="!readOnly">
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              multiple
              @change="onPickFiles"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              :disabled="uploading"
              @click="fileInput?.click()"
            >
              {{ uploading ? 'Uploading…' : 'Add file' }}
            </Button>
          </template>
        </div>

        <div
          v-if="!draftFiles.length"
          class="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
        >
          No support files yet.{{ readOnly ? '' : ' Click Add file to upload evidence.' }}
        </div>

        <div v-else class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead v-if="!readOnly" class="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="file in draftFiles" :key="file.id">
                <TableCell class="font-medium">{{ file.fileName }}</TableCell>
                <TableCell>{{ formatSize(file.sizeBytes) }}</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell v-if="!readOnly">
                  <Button type="button" size="sm" variant="outline" @click="removeFile(file.id)">
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  </section>
</template>
