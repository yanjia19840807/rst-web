<script setup lang="ts">
import { BriefcaseIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PickerClearButton,
  pickerClearFooterClass,
  pickerPopoverClass,
  pickerTriggerClass,
  pickerTriggerWrapClass,
} from '@/components/ui/picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type PositionPickerRow = {
  id: string
  roles: string[]
  occupantName?: string | null
}

const props = withDefaults(
  defineProps<{
    items: PositionPickerRow[]
    emptyLabel?: string
    emptyText?: string
    disabled?: boolean
    invalid?: boolean
    triggerClass?: string
  }>(),
  {
    emptyLabel: 'Select a position',
    emptyText: 'No positions found',
  },
)

const model = defineModel<string | null>({ default: null })

const open = ref(false)
const queryInput = ref('')
const appliedQuery = ref('')
const page = ref(1)
const pageSize = ref(10)

const matched = computed(() => {
  const needle = appliedQuery.value.trim().toLowerCase()
  if (!needle) return props.items
  return props.items.filter((row) =>
    [row.id, row.occupantName, ...row.roles].some((part) =>
      (part ?? '').toLowerCase().includes(needle),
    ),
  )
})

const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return matched.value.slice(start, start + pageSize.value)
})

const selected = computed(() => props.items.find((row) => row.id === model.value) ?? null)

function roleLabel(roles: string[]) {
  return roles.filter(Boolean).join(', ') || '—'
}

function occupantLabel(name?: string | null) {
  const value = name?.trim()
  return value ? value : '—'
}

const canClear = computed(() => Boolean(model.value) && !props.disabled)

function choose(row: PositionPickerRow) {
  model.value = row.id
  open.value = false
}

function clear() {
  if (!canClear.value) return
  model.value = null
  open.value = false
}

watchDebounced(
  queryInput,
  (value) => {
    appliedQuery.value = value.trim()
    page.value = 1
  },
  { debounce: 300 },
)

watch(open, (isOpen) => {
  if (isOpen) return
  queryInput.value = ''
  appliedQuery.value = ''
  page.value = 1
})

watch(
  () => matched.value.length,
  (total) => {
    const pages = Math.max(1, Math.ceil(total / pageSize.value) || 1)
    if (page.value > pages) page.value = pages
  },
)
</script>

<template>
  <Popover v-model:open="open">
    <div :class="cn(pickerTriggerWrapClass, 'w-full min-w-0 max-w-full', triggerClass)">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          :disabled="disabled"
          :aria-invalid="invalid || undefined"
          :data-placeholder="selected ? undefined : ''"
          :class="
            cn(
              pickerTriggerClass,
              'w-full min-w-0 max-w-full shrink overflow-hidden',
              canClear && 'pr-8',
            )
          "
          @keydown.delete.prevent="clear"
          @keydown.backspace.prevent="clear"
        >
          <BriefcaseIcon class="shrink-0" />
          <span class="min-w-0 flex-1 truncate text-left">
            {{ selected ? `${selected.id} · ${roleLabel(selected.roles)}` : emptyLabel }}
          </span>
        </Button>
      </PopoverTrigger>
      <PickerClearButton v-if="canClear" label="Clear position" @click="clear" />
    </div>
    <PopoverContent
      :class="
        cn(
          pickerPopoverClass,
          'z-60 flex w-96 max-w-full min-w-0 flex-col gap-0 overflow-hidden',
        )
      "
      align="start"
      :collision-padding="8"
    >
      <div class="shrink-0 p-2">
        <Input v-model="queryInput" size="sm" placeholder="Search position, role or occupant" />
      </div>
      <div class="flex max-h-72 min-h-40 flex-col overflow-y-auto border-y">
        <div
          class="sticky top-0 z-10 grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)] gap-3 border-b bg-popover px-2 py-1.5 text-sm font-medium text-muted-foreground"
        >
          <span>Position</span>
          <span>Roles</span>
          <span>Occupant</span>
        </div>
        <button
          v-for="row in pageItems"
          :key="row.id"
          type="button"
          class="grid w-full min-w-0 grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)] gap-3 px-2 py-1.5 text-left text-sm hover:bg-muted/50"
          :class="row.id === model ? 'bg-muted' : undefined"
          @click="choose(row)"
        >
          <span class="min-w-0 truncate">{{ row.id }}</span>
          <span class="min-w-0 truncate text-muted-foreground" :title="roleLabel(row.roles)">
            {{ roleLabel(row.roles) }}
          </span>
          <span class="min-w-0 truncate" :title="occupantLabel(row.occupantName)">
            {{ occupantLabel(row.occupantName) }}
          </span>
        </button>
        <div
          v-if="!pageItems.length"
          class="flex flex-1 items-center justify-center px-3 py-8 text-sm text-muted-foreground"
        >
          {{ emptyText }}
        </div>
      </div>
      <TablePager
        class="mt-0 shrink-0 px-2 py-1.5"
        hide-summary
        size="xs"
        :total="matched.length"
        :page="page"
        :page-size="pageSize"
        label="positions"
        @update:page="page = $event"
        @update:page-size="
          (size) => {
            pageSize = size
            page = 1
          }
        "
      />
      <div v-if="canClear" :class="cn(pickerClearFooterClass, 'shrink-0')">
        <Button type="button" variant="ghost" size="sm" class="w-full" @click="clear">
          Clear
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
