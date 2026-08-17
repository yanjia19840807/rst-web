<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('flex h-24 w-full items-center justify-center', props.class)">
    <Spinner class="size-6 text-primary" />
  </div>
</template>
