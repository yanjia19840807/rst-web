<script setup lang="ts">
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { NumberFieldControl } from '@/components/ui/number-field'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
  pausedCount: number
}>()

const emit = defineEmits<{
  'update:subtaskId': [value: string]
  'update:processedVolume': [value: number | '']
  'update:reference': [value: string]
  'update:remarks': [value: string]
  'open-paused': []
}>()

const selectedToolkit = computed(() =>
  props.toolkits.find((toolkit) => toolkit.id === props.toolkitId),
)

</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Session</CardTitle>
      <CardAction>
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
        <Label for="session-subtask">Subtask <span class="font-normal text-muted-foreground">(optional)</span></Label>
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
        <Label for="session-volume"
          >Volume <span class="font-normal text-muted-foreground">(optional)</span></Label
        >
        <NumberFieldControl
          id="session-volume"
          class="text-sm"
          :min="0"
          :disabled="disabled"
          placeholder="e.g. 12.00"
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
  </Card>
</template>
