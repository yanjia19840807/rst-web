<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="card-action"
    :class="
      cn(
        'col-start-2 row-start-1 flex items-center self-center justify-self-end whitespace-nowrap text-base leading-snug has-data-[slot=badge]:h-[1lh] has-data-[variant=link]:h-[1lh] [&_[data-slot=badge]]:h-full! [&_[data-slot=badge]]:py-0! [&_[data-slot=button][data-variant=link]]:h-full [&_[data-slot=button][data-variant=link]]:text-sm [&_[data-slot=button][data-variant=link]]:leading-none',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
