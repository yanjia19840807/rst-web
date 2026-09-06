<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { TmsSession, TmsSummary } from '../types'
import { formatSessionVolume } from './tmsSessionColumns'

const props = defineProps<{
  session: TmsSession | null
  elapsed: string
  busy?: boolean
  canStart?: boolean
  summary?: TmsSummary | null
}>()

defineEmits<{
  start: []
  pause: []
  resume: []
  end: []
}>()

const isRunning = computed(() => props.session?.status === 'running')
const isPaused = computed(() => props.session?.status === 'paused')
const startDisabled = computed(
  () => isRunning.value || Boolean(props.busy) || (!isPaused.value && props.canStart === false),
)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Timer</CardTitle>
      <CardAction>
        <Badge class="h-full py-0" :variant="isRunning ? 'default' : 'secondary'">
          {{ isRunning ? 'Running' : isPaused ? 'Paused' : 'Ready' }}
        </Badge>
      </CardAction>
    </CardHeader>
    <CardContent class="flex flex-1 flex-col">
      <div class="rounded-lg border bg-muted/40 px-4 py-5 text-center">
        <p class="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Elapsed
        </p>
        <output
          class="font-mono text-3xl font-extrabold tracking-wider sm:text-4xl"
          :class="isRunning ? 'text-primary' : 'text-muted-foreground'"
          aria-live="polite"
        >
          {{ elapsed }}
        </output>
      </div>

      <div class="mt-4 grid grid-cols-3 gap-2">
        <Button
          :loading="busy && !isRunning"
          :disabled="startDisabled"
          :class="startDisabled && !busy ? 'opacity-50' : undefined"
          @click="isPaused ? $emit('resume') : $emit('start')"
        >
          {{ isPaused ? 'Resume' : 'Start' }}
        </Button>
        <Button
          variant="outline"
          :loading="busy && isRunning"
          :disabled="!isRunning || busy"
          :class="!isRunning ? 'opacity-50' : undefined"
          @click="$emit('pause')"
        >
          Pause
        </Button>
        <Button
          variant="secondary"
          :loading="busy && isRunning"
          :disabled="!isRunning || busy"
          :class="!isRunning ? 'opacity-50' : undefined"
          @click="$emit('end')"
        >
          End
        </Button>
      </div>

      <div class="mt-auto grid gap-3 border-t pt-5">
        <h3 class="text-sm font-semibold">Today's Summary</h3>
        <div class="grid gap-2 sm:grid-cols-3">
          <div class="rounded-lg border p-3">
            <p class="text-xs text-muted-foreground">Sessions today</p>
            <p class="mt-1 text-xl font-bold">
              {{ summary?.sessionsToday ?? '—' }}
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">Completed timing entries</p>
          </div>
          <div class="rounded-lg border p-3">
            <p class="text-xs text-muted-foreground">Total volume</p>
            <p class="mt-1 text-xl font-bold">
              {{ formatSessionVolume(summary?.totalVolume) }}
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">Across all sessions</p>
          </div>
          <div class="rounded-lg border p-3">
            <p class="text-xs text-muted-foreground">Paused Sessions</p>
            <p class="mt-1 text-xl font-bold">
              {{ summary?.pausedSessions ?? '—' }}
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">Currently paused by you</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
