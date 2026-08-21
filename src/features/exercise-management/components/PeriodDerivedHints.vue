<script setup lang="ts">
import { Info } from '@lucide/vue'

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'

import type { DerivedHintLine } from '../periodWindows'

defineProps<{
  title: string
  description: string
  lines: DerivedHintLine[]
}>()
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex size-5 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/10"
        :aria-label="`${title} info`"
      >
        <Info class="size-3.5" />
        <span class="sr-only">{{ title }} info</span>
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80 gap-2.5 p-3">
      <PopoverHeader class="gap-1">
        <PopoverTitle>{{ title }}</PopoverTitle>
        <PopoverDescription class="text-xs leading-relaxed">
          {{ description }}
        </PopoverDescription>
      </PopoverHeader>
      <div class="space-y-2 border-t pt-2">
        <div v-for="line in lines" :key="line.label" class="grid gap-0.5">
          <div class="text-xs">
            <span class="font-medium text-foreground">{{ line.label }}</span>
            <span class="text-muted-foreground"> · {{ line.note }}</span>
          </div>
          <div class="text-sm font-medium text-foreground">{{ line.value }}</div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
