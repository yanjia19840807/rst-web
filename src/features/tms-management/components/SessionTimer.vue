<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { TmsSession } from '../types'

const props = defineProps<{
  session: TmsSession | null
  elapsed: string
  busy?: boolean
  canStart?: boolean
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
    <CardContent>
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
          :disabled="startDisabled"
          :class="startDisabled ? 'opacity-50' : undefined"
          @click="isPaused ? $emit('resume') : $emit('start')"
        >
          {{ isPaused ? 'Resume' : 'Start' }}
        </Button>
        <Button
          variant="outline"
          :disabled="!isRunning || busy"
          :class="!isRunning ? 'opacity-50' : undefined"
          @click="$emit('pause')"
        >
          Pause
        </Button>
        <Button
          variant="secondary"
          :disabled="!isRunning || busy"
          :class="!isRunning ? 'opacity-50' : undefined"
          @click="$emit('end')"
        >
          End
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
