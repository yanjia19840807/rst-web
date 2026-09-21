<script setup lang="ts">
import { UserIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

import ListLoading from '@/components/ListLoading.vue'
import TablePager from '@/components/TablePager.vue'
import { Button, type ButtonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PickerClearButton,
  pickerClearFooterClass,
  pickerPopoverClass,
  pickerTriggerClass,
  pickerTriggerWrapClass,
} from '@/components/ui/picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type PersonPickerRow = {
  id: string
  ccgid: string
  name: string
  email?: string | null
}

export type PersonPickerQuery = {
  q: string
  page: number
  pageSize: number
  open: boolean
}

const props = withDefaults(
  defineProps<{
    emptyLabel?: string
    items: PersonPickerRow[]
    total: number
    loading?: boolean
    allowClear?: boolean
    disabled?: boolean
    invalid?: boolean
    emptyText?: string
    searchPlaceholder?: string
    triggerClass?: string
    size?: ButtonVariants['size']
    formatLabel?: (row: PersonPickerRow) => string
  }>(),
  {
    emptyLabel: 'All',
    loading: false,
    allowClear: false,
    emptyText: 'No people found',
    searchPlaceholder: 'Search name, email or CCGID',
    size: 'default',
  },
)

const model = defineModel<string | null>({ default: null })

const emit = defineEmits<{
  query: [value: PersonPickerQuery]
}>()

const open = ref(false)
const queryInput = ref('')
const appliedQuery = ref('')
const page = ref(1)
const pageSize = ref(10)
const picked = ref<PersonPickerRow | null>(null)

const selected = computed(() => {
  const match = props.items.find((item) => item.id === model.value)
  if (match) return match
  if (picked.value && picked.value.id === model.value) return picked.value
  if (model.value) {
    return {
      id: model.value,
      ccgid: model.value,
      name: '',
      email: '',
    } satisfies PersonPickerRow
  }
  return null
})

function labelOf(row: PersonPickerRow | null) {
  if (!row) return props.emptyLabel
  return props.formatLabel ? props.formatLabel(row) : row.name.trim() || props.emptyLabel
}

const canClear = computed(
  () => Boolean(props.allowClear && model.value) && !props.disabled,
)

function choose(row: PersonPickerRow | null) {
  picked.value = row
  model.value = row?.id ?? null
  open.value = false
}

function clear() {
  if (!canClear.value) return
  choose(null)
}

function onClearKey() {
  if (!canClear.value) return
  clear()
}

function emitQuery() {
  emit('query', {
    q: appliedQuery.value,
    page: page.value,
    pageSize: pageSize.value,
    open: open.value,
  })
}

watchDebounced(
  queryInput,
  (value) => {
    appliedQuery.value = value.trim()
    page.value = 1
  },
  { debounce: 300 },
)

watch([appliedQuery, page, pageSize, open], emitQuery, { immediate: true })

watch(open, (isOpen) => {
  if (isOpen) return
  queryInput.value = ''
  appliedQuery.value = ''
  page.value = 1
})

watch(model, (value) => {
  if (value) return
  picked.value = null
})

watch(
  () => ({
    total: props.total,
    loading: props.loading,
  }),
  ({ total, loading }) => {
    if (loading) return
    const pages = Math.max(1, Math.ceil(total / pageSize.value) || 1)
    if (page.value > pages) page.value = pages
  },
)
</script>

<template>
  <Popover v-model:open="open">
    <div :class="cn(pickerTriggerWrapClass, 'w-[240px]', triggerClass)">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          :size="size"
          :disabled="disabled"
          :aria-invalid="invalid || undefined"
          :data-placeholder="selected ? undefined : ''"
          :class="cn(pickerTriggerClass, 'w-full', canClear && 'pr-8')"
          @keydown.delete.prevent="onClearKey"
          @keydown.backspace.prevent="onClearKey"
        >
          <UserIcon />
          <span class="min-w-0 truncate">{{ labelOf(selected) }}</span>
        </Button>
      </PopoverTrigger>
      <PickerClearButton v-if="canClear" label="Clear person" @click="clear" />
    </div>
    <PopoverContent
      :class="
        cn(
          pickerPopoverClass,
          'z-60 flex w-96 min-h-0 max-h-(--reka-popover-content-available-height) max-w-(--reka-popover-content-available-width) flex-col gap-0',
        )
      "
      align="start"
      :collision-padding="8"
    >
      <div class="shrink-0 p-2">
        <Input
          v-model="queryInput"
          size="sm"
          :placeholder="searchPlaceholder"
        />
      </div>
      <div class="relative min-h-40 max-h-72 flex-1 overflow-hidden border-y">
        <div class="flex h-full min-h-40 flex-col overflow-y-auto">
          <div
            class="sticky top-0 z-10 grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-3 border-b bg-popover px-2 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <span>Name</span>
            <span>Email</span>
          </div>
          <button
            v-for="row in items"
            :key="row.id"
            type="button"
            class="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-3 px-2 py-1.5 text-left text-sm hover:bg-muted/50"
            :class="row.id === model ? 'bg-muted' : undefined"
            @click="choose(row)"
          >
            <span class="min-w-0 truncate" :title="row.name || undefined">{{ row.name || '—' }}</span>
            <span class="min-w-0 truncate text-muted-foreground" :title="row.email || undefined">{{ row.email || '—' }}</span>
          </button>
          <div
            v-if="!loading && !items.length"
            class="flex flex-1 items-center justify-center px-3 py-8 text-sm text-muted-foreground"
          >
            {{ emptyText }}
          </div>
        </div>
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex items-center justify-center bg-background/70"
        >
          <ListLoading class="h-auto" />
        </div>
      </div>
      <TablePager
        class="mt-0 shrink-0 px-2 py-1.5"
        hide-summary
        size="xs"
        :total="total"
        :page="page"
        :page-size="pageSize"
        label="people"
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
