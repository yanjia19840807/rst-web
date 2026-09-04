<script setup lang="ts">
import { computed, useSlots, type HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

import { PAGE_ACTIONS_TARGET_ID } from './page-actions'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const slots = useSlots()
const hasLeft = computed(() => Boolean(slots.left))
const hasRight = computed(() => Boolean(slots.default))
</script>

<template>
  <Teleport :to="`#${PAGE_ACTIONS_TARGET_ID}`" defer>
    <div
      v-if="hasLeft || hasRight"
      :class="
        cn(
          'flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 sm:px-6',
          props.class,
        )
      "
    >
      <div v-if="hasLeft" class="flex min-w-0 items-center gap-2">
        <slot name="left" />
      </div>
      <div
        v-if="hasRight"
        class="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>
