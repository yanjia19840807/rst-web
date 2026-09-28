<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ChevronRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'

import { cn } from '@/lib/utils'
import type { BreadcrumbItem } from '@/navigation/breadcrumbs'

const props = defineProps<{
  items: BreadcrumbItem[]
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <nav aria-label="Breadcrumb" :class="cn('min-w-0', props.class)">
    <ol class="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <li
        v-for="(item, index) in items"
        :key="`${item.label}-${index}`"
        class="flex min-w-0 items-center gap-1"
      >
        <ChevronRight v-if="index > 0" class="size-3.5 shrink-0" aria-hidden="true" />
        <RouterLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="max-w-56 truncate rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {{ item.label }}
        </RouterLink>
        <span
          v-else
          class="max-w-56 truncate font-medium text-foreground"
          :aria-current="index === items.length - 1 ? 'page' : undefined"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
