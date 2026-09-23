<script setup lang="ts">
import { UserIcon, XIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

import ListLoading from '@/components/ListLoading.vue'
import TablePager from '@/components/TablePager.vue'
import { Badge } from '@/components/ui/badge'
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
    multiple?: boolean
  }>(),
  {
    emptyLabel: 'All',
    loading: false,
    allowClear: false,
    emptyText: 'No people found',
    searchPlaceholder: 'Search name, email or CCGID',
    size: 'default',
    multiple: false,
  },
)

const model = defineModel<string | null>({ default: null })
const many = defineModel<string[]>('many', { default: () => [] })

const emit = defineEmits<{
  query: [value: PersonPickerQuery]
}>()

const open = ref(false)
const queryInput = ref('')
const appliedQuery = ref('')
const page = ref(1)
const pageSize = ref(10)
const picked = ref<PersonPickerRow | null>(null)
const remembered = ref(new Map<string, PersonPickerRow>())

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

const selectedMany = computed(() =>
  many.value.map((id) => {
    const live = props.items.find((item) => item.id === id)
    return live ?? remembered.value.get(id) ?? { id, ccgid: id, name: id }
  }),
)

const canClear = computed(() => {
  if (props.disabled) return false
  if (props.multiple) return many.value.length > 0
  return Boolean(props.allowClear && model.value)
})

function remember(row: PersonPickerRow) {
  const next = new Map(remembered.value)
  next.set(row.id, row)
  remembered.value = next
}

function choose(row: PersonPickerRow | null) {
  if (props.multiple) {
    if (!row) {
      many.value = []
      return
    }
    remember(row)
    many.value = many.value.includes(row.id)
      ? many.value.filter((id) => id !== row.id)
      : [...many.value, row.id]
    return
  }
  picked.value = row
  model.value = row?.id ?? null
  open.value = false
}

function removeMany(id: string) {
  many.value = many.value.filter((item) => item !== id)
}

function clear() {
  if (!canClear.value) return
  if (props.multiple) {
    many.value = []
    return
  }
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
          v-if="!multiple"
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
        <div
          v-else
          role="button"
          tabindex="0"
          :aria-disabled="disabled || undefined"
          :aria-invalid="invalid || undefined"
          :data-placeholder="selectedMany.length ? undefined : ''"
          :class="
            cn(
              pickerTriggerClass,
              'inline-flex h-auto min-h-9 w-full cursor-pointer flex-wrap items-center justify-start gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-sm shadow-xs transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:shrink-0',
              canClear && 'pr-8',
              disabled && 'pointer-events-none opacity-50',
            )
          "
        >
          <UserIcon class="size-4 shrink-0" />
          <span v-if="!selectedMany.length" class="truncate text-muted-foreground">
            {{ emptyLabel }}
          </span>
          <Badge
            v-for="row in selectedMany"
            :key="row.id"
            variant="secondary"
            class="gap-1 pr-1 font-normal"
          >
            <span class="max-w-40 truncate">{{ labelOf(row) }}</span>
            <button
              type="button"
              class="rounded-sm text-muted-foreground hover:text-foreground"
              :aria-label="`Remove ${labelOf(row)}`"
              @pointerdown.stop
              @click.stop.prevent="removeMany(row.id)"
            >
              <XIcon class="size-3" />
            </button>
          </Badge>
        </div>
      </PopoverTrigger>
      <PickerClearButton v-if="canClear" label="Clear person" @click="clear" />
    </div>
    <PopoverContent
      :class="
        cn(
          pickerPopoverClass,
          'z-60 flex w-[32rem] min-h-0 max-h-(--reka-popover-content-available-height) max-w-(--reka-popover-content-available-width) flex-col gap-0 overflow-hidden',
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
      <div class="relative border-y">
        <div class="flex max-h-72 min-h-40 flex-col overflow-y-auto">
          <div
            class="sticky top-0 z-10 grid grid-cols-[minmax(0,6.75rem)_minmax(0,7.5rem)_minmax(0,1fr)] gap-3 border-b bg-popover px-2 py-1.5 text-sm font-medium text-muted-foreground"
          >
            <span>CCGID</span>
            <span>Name</span>
            <span>Email</span>
          </div>
          <button
            v-for="row in items"
            :key="row.id"
            type="button"
            class="grid w-full min-w-0 grid-cols-[minmax(0,6.75rem)_minmax(0,7.5rem)_minmax(0,1fr)] gap-3 px-2 py-1.5 text-left text-sm hover:bg-muted/50"
            :class="
              (props.multiple ? many.includes(row.id) : row.id === model) ? 'bg-muted' : undefined
            "
            @click="choose(row)"
          >
            <span class="min-w-0 truncate" :title="row.ccgid || undefined">
              {{ row.ccgid || '—' }}
            </span>
            <span class="min-w-0 truncate" :title="row.name || undefined">{{ row.name || '—' }}</span>
            <span class="min-w-0 truncate text-muted-foreground" :title="row.email || undefined">
              {{ row.email || '—' }}
            </span>
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
