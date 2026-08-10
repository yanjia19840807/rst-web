<script setup lang="ts">
import { computed, ref } from 'vue'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

import type { CycleTimeBaseline } from '../../types'
import type { MedianSourceMode } from './adTypes'
import { formatNumber } from './adTypes'

const props = defineProps<{
  source: MedianSourceMode
  manualMedian: string
  reason: string
  cycleTime: CycleTimeBaseline | null
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:source': [value: MedianSourceMode]
  'update:manualMedian': [value: string]
  'update:reason': [value: string]
  edit: []
}>()

const filesOpen = ref(false)
const localFiles = ref<{ name: string; size: string }[]>([])

const sourceLabel = computed(() =>
  props.source === 'manual' ? 'Manual median input' : 'System-calculated median',
)

const metrics = computed(() => {
  const ct = props.cycleTime
  const median =
    props.source === 'manual'
      ? props.manualMedian.trim()
        ? `${props.manualMedian.trim()}s`
        : '—'
      : ct
        ? `${ct.medianSeconds}s`
        : '—'
  return [
    {
      metric: 'Median cycle time',
      value: median,
      description: 'Used for simulation',
      warn: false,
    },
    {
      metric: 'Accepted records',
      value: ct?.sampleCount != null ? formatNumber(ct.sampleCount) : '—',
      description: 'After outlier exclusion',
      warn: false,
    },
  ]
})

function onPickFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  localFiles.value = [
    ...localFiles.value,
    ...files.map((file) => ({
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    })),
  ]
  input.value = ''
}
</script>

<template>
  <div>
    <!-- Read-only source summary -->
    <div v-if="readOnly" class="mb-4">
      <table class="w-full border-collapse text-sm">
        <tbody>
          <tr class="border-b">
            <td class="w-[32%] py-2 text-muted-foreground">Median source</td>
            <td class="py-2">{{ sourceLabel }}</td>
          </tr>
          <template v-if="source === 'manual'">
            <tr class="border-b">
              <td class="py-2 text-muted-foreground">Manual median cycle time</td>
              <td class="py-2">
                {{ manualMedian.trim() ? `${manualMedian.trim()}s` : '—' }}
              </td>
            </tr>
            <tr class="border-b">
              <td class="py-2 align-top text-muted-foreground">Reason for override</td>
              <td class="whitespace-pre-wrap py-2">{{ reason.trim() || '—' }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 text-muted-foreground">Support files</td>
              <td class="py-2">
                <span class="inline-flex flex-wrap items-center gap-2.5">
                  <span>
                    {{
                      localFiles.length
                        ? `${localFiles.length} file${localFiles.length > 1 ? 's' : ''} uploaded`
                        : 'No files uploaded'
                    }}
                  </span>
                  <Button size="sm" variant="outline" @click="filesOpen = true">View files</Button>
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Editable source radios -->
    <div v-else class="mb-4 space-y-2.5" :class="source === 'manual' ? 'mb-4' : 'mb-4'">
      <label
        v-for="option in [
          {
            value: 'system' as const,
            label: 'System-calculated median',
            hint: 'Use TMS sessions median and review metrics / control chart below.',
          },
          {
            value: 'manual' as const,
            label: 'Manual median input',
            hint: 'Enter a median override and upload support files as approval evidence.',
          },
        ]"
        :key="option.value"
        class="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-3"
        :class="
          source === option.value
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card'
        "
      >
        <input
          type="radio"
          class="mt-1"
          name="exercise-median-source"
          :checked="source === option.value"
          @change="emit('update:source', option.value)"
        />
        <span>
          <span class="block text-sm font-semibold">{{ option.label }}</span>
          <span class="mt-0.5 block text-xs text-muted-foreground">{{ option.hint }}</span>
        </span>
      </label>

      <div v-if="source === 'manual'" class="grid gap-3.5 pt-1">
        <div class="grid gap-1.5">
          <Label>Manual median cycle time (seconds)</Label>
          <Input
            :model-value="manualMedian"
            placeholder="e.g. 155"
            @update:model-value="emit('update:manualMedian', String($event))"
          />
        </div>
        <div class="grid gap-1.5">
          <Label>Reason for override</Label>
          <Textarea
            :model-value="reason"
            rows="3"
            placeholder="Explain why the system median is not used for this scenario."
            @update:model-value="emit('update:reason', String($event))"
          />
        </div>
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold">Support files</div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              Required for manual median.
              {{
                localFiles.length
                  ? `${localFiles.length} file${localFiles.length > 1 ? 's' : ''} uploaded.`
                  : 'No files uploaded yet.'
              }}
            </div>
          </div>
          <Button size="sm" variant="outline" @click="filesOpen = true">Upload file</Button>
        </div>
      </div>
    </div>

    <!-- System metrics + chart -->
    <div v-if="source === 'system'" class="space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-base font-bold">TMS Metrics</h3>
        <Button size="sm" variant="outline" @click="emit('edit')">
          {{ readOnly ? 'View' : 'Edit' }}
        </Button>
      </div>
      <div class="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in metrics" :key="row.metric">
              <TableCell>{{ row.metric }}</TableCell>
              <TableCell :class="row.warn ? 'text-amber-600' : undefined">
                {{ row.value }}
              </TableCell>
              <TableCell class="text-muted-foreground">{{ row.description }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 class="mb-2 text-sm font-bold">Cycle Time Control Chart</h3>
        <div
          class="relative h-44 overflow-hidden rounded-lg border bg-card"
          aria-hidden="true"
        >
          <svg class="absolute inset-3" viewBox="0 0 600 156" preserveAspectRatio="none">
            <line
              x1="0"
              y1="30"
              x2="600"
              y2="30"
              stroke="hsl(var(--destructive))"
              stroke-dasharray="5 5"
              stroke-width="2"
            />
            <line
              x1="0"
              y1="78"
              x2="600"
              y2="78"
              stroke="hsl(var(--primary))"
              stroke-width="2"
            />
            <line
              x1="0"
              y1="126"
              x2="600"
              y2="126"
              stroke="hsl(var(--destructive))"
              stroke-dasharray="5 5"
              stroke-width="2"
            />
            <polyline
              points="0,82 55,74 110,78 165,70 220,86 275,76 330,72 385,96 440,64 495,80 550,75 600,77"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            />
            <circle cx="385" cy="96" r="5" fill="#d97706" />
            <circle cx="440" cy="64" r="5" fill="#d97706" />
          </svg>
        </div>
        <div class="mt-2.5 flex flex-wrap gap-3.5 text-xs text-muted-foreground">
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-4 rounded-sm bg-foreground" />
            Daily median
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-4 rounded-sm bg-primary" />
            Rolling median
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-4 rounded-sm bg-destructive" />
            Control limit
          </span>
        </div>
      </div>
    </div>

    <Dialog v-model:open="filesOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Support files</DialogTitle>
        </DialogHeader>
        <div class="space-y-2">
          <p v-if="!localFiles.length" class="text-sm text-muted-foreground italic">
            No files uploaded yet.
          </p>
          <ul v-else class="space-y-1.5 text-sm">
            <li
              v-for="file in localFiles"
              :key="file.name"
              class="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span class="truncate">{{ file.name }}</span>
              <span class="shrink-0 text-muted-foreground">{{ file.size }}</span>
            </li>
          </ul>
          <label
            v-if="!readOnly"
            class="mt-2 flex cursor-pointer items-center justify-center rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40"
          >
            <input type="file" class="hidden" multiple @change="onPickFiles" />
            Choose files to attach (local preview; upload API pending)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="filesOpen = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
