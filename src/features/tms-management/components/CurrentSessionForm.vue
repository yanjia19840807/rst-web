<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'

import { infoHintButtonClass, infoHintIconClass } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { NumberFieldControl } from '@/components/ui/number-field'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import { snapshotFromToolkit } from '@/features/exercise-management/snapshotFromToolkit'
import type { Exercise } from '@/features/exercise-management/types'
import type { TimesheetAlignmentView } from '@/features/timesheet-alignment/types'
import { toolkitApi } from '@/features/toolkit-management/api'
import { toolkitQueryKeys } from '@/features/toolkit-management/api/queries'

import type { Toolkit } from '../types'

const props = defineProps<{
  toolkits: Toolkit[]
  toolkitId: string
  subtaskId: string
  processedVolume: number | '' | null
  reference: string
  remarks: string
  errors: Partial<
    Record<'toolkitId' | 'subtaskId' | 'processedVolume' | 'reference' | 'remarks', string>
  >
  disabled?: boolean
  toolkitLocked?: boolean
  pausedCount: number
  subtaskRequired?: boolean
}>()

const emit = defineEmits<{
  'update:toolkitId': [value: string]
  'update:subtaskId': [value: string]
  'update:processedVolume': [value: number | '']
  'update:reference': [value: string]
  'update:remarks': [value: string]
  'open-paused': []
  'open-sessions': []
}>()

const queryClient = useQueryClient()
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)
const toolkitAlignment = ref<TimesheetAlignmentView | null>(null)
const toolkitInfoPending = ref(false)

const selectedToolkit = computed(() =>
  props.toolkits.find((toolkit) => toolkit.id === props.toolkitId),
)

async function openToolkitInfo() {
  const toolkitId = props.toolkitId
  if (!toolkitId || toolkitInfoPending.value) return
  toolkitInfoPending.value = true
  try {
    const toolkit = await queryClient.fetchQuery({
      queryKey: toolkitQueryKeys.detail(toolkitId),
      queryFn: () => toolkitApi.get(toolkitId),
    })
    toolkitSnapshot.value = snapshotFromToolkit(toolkit)
    toolkitAlignment.value = toolkit.alignment ?? null
    toolkitInfoOpen.value = true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkit info.')
  } finally {
    toolkitInfoPending.value = false
  }
}

function onToolkitChange(value: unknown) {
  if (props.toolkitLocked) return
  emit('update:toolkitId', String(value ?? ''))
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Session</CardTitle>
      <CardAction class="flex items-center gap-4">
        <Button
          variant="link"
          class="px-0 text-sm leading-none font-semibold"
          @click="emit('open-sessions')"
        >
          All Sessions
        </Button>
        <Button
          variant="link"
          class="px-0 text-sm leading-none font-semibold"
          @click="emit('open-paused')"
        >
          Paused Sessions
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="grid gap-1.5">
        <Label for="session-toolkit">Toolkit</Label>
        <div class="flex items-center gap-2">
          <NativeSelect
            id="session-toolkit"
            class="min-w-0 flex-1"
            :model-value="toolkitId ?? ''"
            :disabled="toolkitLocked"
            :aria-invalid="Boolean(errors.toolkitId)"
            aria-label="Current toolkit"
            @update:model-value="onToolkitChange"
          >
            <NativeSelectOption value="">Select a toolkit</NativeSelectOption>
            <NativeSelectOption
              v-for="toolkit in toolkits"
              :key="toolkit.id"
              :value="toolkit.id"
            >
              {{ toolkit.name }}
            </NativeSelectOption>
          </NativeSelect>
          <button
            v-if="selectedToolkit"
            type="button"
            :class="infoHintButtonClass"
            title="Toolkit info"
            :disabled="toolkitInfoPending"
            @click="openToolkitInfo"
          >
            <Info :class="infoHintIconClass" />
            <span class="sr-only">Toolkit info</span>
          </button>
        </div>
        <p v-if="errors.toolkitId" class="text-xs text-destructive">{{ errors.toolkitId }}</p>
      </div>

      <div class="grid gap-1.5">
        <Label for="session-subtask">
          Subtask
          <span v-if="!subtaskRequired" class="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <NativeSelect
          id="session-subtask"
          class="w-full"
          :model-value="subtaskId"
          :disabled="disabled"
          :aria-invalid="Boolean(errors.subtaskId)"
          @update:model-value="emit('update:subtaskId', String($event ?? ''))"
        >
          <NativeSelectOption value="">Select a subtask</NativeSelectOption>
          <NativeSelectOption
            v-for="item in selectedToolkit?.subtasks.filter((subtask) => !subtask.deletedAt) ?? []"
            :key="item.id"
            :value="item.id"
          >
            {{ item.name }}
          </NativeSelectOption>
        </NativeSelect>
        <p v-if="errors.subtaskId" class="text-xs text-destructive">{{ errors.subtaskId }}</p>
      </div>

      <div class="grid gap-1.5">
        <Label for="session-volume">Volume</Label>
        <NumberFieldControl
          id="session-volume"
          class="text-sm"
          :min="1"
          :decimals="0"
          :step="1"
          :disabled="disabled"
          :invalid="Boolean(errors.processedVolume)"
          placeholder="e.g. 12"
          :model-value="processedVolume === '' || processedVolume == null ? null : Number(processedVolume)"
          @update:model-value="emit('update:processedVolume', $event ?? '')"
        />
        <p v-if="errors.processedVolume" class="text-xs text-destructive">
          {{ errors.processedVolume }}
        </p>
      </div>

      <div class="grid gap-1.5">
        <Label for="session-reference">Reference</Label>
        <Input
          id="session-reference"
          class="text-sm"
          :model-value="reference"
          :disabled="disabled"
          placeholder="Invoice / case ID"
          :aria-invalid="Boolean(errors.reference)"
          @update:model-value="emit('update:reference', String($event))"
        />
        <p v-if="errors.reference" class="text-xs text-destructive">{{ errors.reference }}</p>
      </div>

      <div class="grid gap-1.5">
        <Label for="session-remarks">Remarks</Label>
        <Textarea
          id="session-remarks"
          :model-value="remarks"
          :disabled="disabled"
          placeholder="Optional note for this timing session"
          :aria-invalid="Boolean(errors.remarks)"
          @update:model-value="emit('update:remarks', String($event))"
        />
        <p v-if="errors.remarks" class="text-xs text-destructive">{{ errors.remarks }}</p>
      </div>
    </CardContent>

    <ToolkitInfoDialog
      v-model:open="toolkitInfoOpen"
      :snapshot="toolkitSnapshot"
      :alignment="toolkitAlignment"
    />
  </Card>
</template>
