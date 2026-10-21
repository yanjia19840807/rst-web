<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Maximize2 } from '@lucide/vue'
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { chartExpandDialogClass } from '@/components/chartExpand'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    expandable?: boolean
    frameClass?: HTMLAttributes['class']
    heading?: 'section' | 'card'
  }>(),
  {
    expandable: false,
    heading: 'section',
  },
)

const open = ref(false)

watch(
  () => props.expandable,
  (value) => {
    if (!value) open.value = false
  },
)
</script>

<template>
  <div>
    <Dialog v-model:open="open">
      <div :class="cn(heading === 'card' ? 'mb-4' : 'mb-2.5')">
        <div class="flex items-center justify-between gap-3">
          <component
            :is="heading === 'card' ? 'div' : 'h4'"
            :class="
              cn(
                'inline-flex min-w-0 items-center gap-1.5',
                heading === 'card'
                  ? 'text-base leading-snug font-medium cn-font-heading group-data-[size=sm]/card:text-sm'
                  : 'text-sm font-bold',
              )
            "
          >
            {{ title }}
            <slot name="hint" />
          </component>
          <DialogTrigger v-if="expandable" as-child>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="shrink-0 text-muted-foreground"
            >
              <Maximize2 />
              <span class="sr-only">View {{ title }} larger</span>
            </Button>
          </DialogTrigger>
        </div>
        <p v-if="description" class="mt-1 text-xs text-muted-foreground">
          {{ description }}
        </p>
      </div>

      <div v-if="expandable" :class="cn('min-w-0', frameClass)">
        <slot name="chart" />
      </div>
      <slot v-else name="empty" />
      <slot name="extra" />

      <DialogContent v-if="expandable" :class="chartExpandDialogClass">
        <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4 pr-12">
          <DialogTitle class="flex flex-wrap items-center gap-1.5">
            <span>{{ title }}</span>
            <slot name="hint" />
          </DialogTitle>
          <DialogDescription :class="description ? undefined : 'sr-only'">
            {{ description || `Larger view of ${title}.` }}
          </DialogDescription>
        </DialogHeader>
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
          <div class="relative min-h-0 flex-1">
            <div class="absolute inset-0">
              <slot v-if="open" name="chart" />
            </div>
          </div>
          <div class="shrink-0">
            <slot name="extra" />
          </div>
        </div>
        <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
          <Button type="button" variant="outline" @click="open = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
