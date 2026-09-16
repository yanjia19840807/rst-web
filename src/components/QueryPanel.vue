<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { ref } from 'vue'

import { Button } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    title?: string
    defaultOpen?: boolean
    showExport?: boolean
    exporting?: boolean
    searchDisabled?: boolean
  }>(),
  {
    title: 'Filters',
    defaultOpen: true,
    showExport: false,
    exporting: false,
    searchDisabled: false,
  },
)

const emit = defineEmits<{
  search: []
  clear: []
  export: []
}>()

const open = ref(props.defaultOpen)

function toggle() {
  open.value = !open.value
}

function onSubmit(event: Event) {
  event.preventDefault()
  emit('search')
}
</script>

<template>
  <section class="rounded-lg bg-muted/60 p-3">
    <div class="flex items-center gap-2">
      <span class="min-w-0 flex-1 text-sm font-medium text-foreground">{{ title }}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :aria-expanded="open"
        :aria-label="open ? 'Collapse filters' : 'Expand filters'"
        @click="toggle"
      >
        <ChevronDown
          class="size-4 transition-transform"
          :class="open ? 'rotate-180' : ''"
        />
      </Button>
    </div>

    <form v-show="open" class="grid gap-3" @submit="onSubmit">
      <div class="flex flex-wrap items-end gap-2.5">
        <slot />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" :disabled="searchDisabled">Search</Button>
        <Button type="button" variant="outline" @click="emit('clear')">Clear</Button>
        <Button
          v-if="showExport"
          type="button"
          variant="outline"
          :disabled="exporting || searchDisabled"
          @click="emit('export')"
        >
          Export
        </Button>
      </div>
    </form>
  </section>
</template>
