<script setup lang="ts">
import { computed } from 'vue'

import ReadOnlyField from '@/components/ReadOnlyField.vue'
import { Button } from '@/components/ui/button'
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
  readOnly?: boolean
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

const selectedSubtaskName = computed(
  () =>
    selectedToolkit.value?.subtasks.find((item) => item.id === props.subtaskId)?.name ?? '—',
)

function valueOf(event: Event) {
  return (event.target as HTMLInputElement | HTMLSelectElement).value
}
</script>

<template>
  <Card>
    <CardHeader class="items-center">
      <CardTitle>Session</CardTitle>
      <CardAction>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="emit('open-paused')"
        >
          Paused Sessions
          <span class="text-muted-foreground">({{ pausedCount }})</span>
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="grid gap-1.5">
        <Label for="session-subtask">Subtask <span class="font-normal text-muted-foreground">(optional)</span></Label>
        <ReadOnlyField v-if="readOnly" :value="selectedSubtaskName" />
        <select
          v-else
          id="session-subtask"
          :value="subtaskId"
          class="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          :aria-invalid="Boolean(errors.subtaskId)"
          @change="emit('update:subtaskId', valueOf($event))"
        >
          <option value="">—</option>
          <option
            v-for="item in selectedToolkit?.subtasks.filter((subtask) => !subtask.deletedAt) ?? []"
            :key="item.id"
            :value="item.id"
          >
            {{ item.name }}
          </option>
        </select>
        <p v-if="errors.subtaskId" class="text-xs text-destructive">{{ errors.subtaskId }}</p>
      </div>

      <div class="grid gap-1.5">
        <Label for="session-volume"
          >Volume <span class="font-normal text-muted-foreground">(optional)</span></Label
        >
        <ReadOnlyField v-if="readOnly" :value="processedVolume || '—'" />
        <Input
          v-else
          id="session-volume"
          type="number"
          min="1"
          :model-value="processedVolume ?? ''"
          :aria-invalid="Boolean(errors.processedVolume)"
          @update:model-value="
            emit(
              'update:processedVolume',
              $event === '' || $event == null ? '' : Number($event),
            )
          "
        />
        <p v-if="errors.processedVolume" class="text-xs text-destructive">
          {{ errors.processedVolume }}
        </p>
      </div>

      <div class="grid gap-1.5">
        <Label for="session-reference">Reference</Label>
        <ReadOnlyField v-if="readOnly" :value="reference" />
        <Input
          v-else
          id="session-reference"
          :model-value="reference"
          placeholder="Invoice / case ID"
          :aria-invalid="Boolean(errors.reference)"
          @update:model-value="emit('update:reference', String($event))"
        />
        <p v-if="errors.reference" class="text-xs text-destructive">{{ errors.reference }}</p>
      </div>

      <div class="grid gap-1.5">
        <Label for="session-remarks">Remarks</Label>
        <ReadOnlyField v-if="readOnly" :value="remarks" />
        <Textarea
          v-else
          id="session-remarks"
          :model-value="remarks"
          placeholder="Optional note for this timing session"
          :aria-invalid="Boolean(errors.remarks)"
          @update:model-value="emit('update:remarks', String($event))"
        />
        <p v-if="errors.remarks" class="text-xs text-destructive">{{ errors.remarks }}</p>
      </div>
    </CardContent>
  </Card>
</template>
