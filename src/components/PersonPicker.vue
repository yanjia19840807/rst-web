<script setup lang="ts">
import { ChevronDownIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

import ListLoading from '@/components/ListLoading.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
    emptyLabel: string
    items: PersonPickerRow[]
    total: number
    loading?: boolean
    allowClear?: boolean
    disabled?: boolean
    invalid?: boolean
    emptyText?: string
    searchPlaceholder?: string
    triggerClass?: string
    formatLabel?: (row: PersonPickerRow) => string
  }>(),
  {
    loading: false,
    allowClear: false,
    emptyText: 'No people found',
    searchPlaceholder: 'Search name or email',
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

function choose(row: PersonPickerRow | null) {
  picked.value = row
  model.value = row?.id ?? null
  open.value = false
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
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :class="cn('relative w-full justify-start pr-8 pl-2.5 font-normal', triggerClass)"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
      >
        <span class="min-w-0 truncate">{{ labelOf(selected) }}</span>
        <ChevronDownIcon
          class="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 select-none"
        />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-96 gap-2 p-2" align="start">
      <div class="flex items-center gap-2">
        <div class="min-w-0 flex-1">
          <Input
            v-model="queryInput"
            :placeholder="searchPlaceholder"
            class="h-8 text-sm"
          />
        </div>
        <Button
          v-if="allowClear"
          size="xs"
          variant="link"
          class="h-auto shrink-0 px-0"
          :disabled="!model"
          @click="choose(null)"
        >
          Clear
        </Button>
      </div>
      <div class="relative h-72 overflow-hidden rounded-md border">
        <div class="h-full overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="h-8">Name</TableHead>
                <TableHead class="h-8">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="row in items"
                :key="row.id"
                class="cursor-pointer"
                :class="row.id === model ? 'bg-muted' : undefined"
                @click="choose(row)"
              >
                <TableCell class="py-1.5">{{ row.name || '—' }}</TableCell>
                <TableCell class="py-1.5 text-muted-foreground">{{ row.email || '—' }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex items-center justify-center bg-background/70"
        >
          <ListLoading class="h-auto" />
        </div>
        <div
          v-else-if="!items.length"
          class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
        >
          {{ emptyText }}
        </div>
      </div>
      <TablePager
        class="mt-0"
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
    </PopoverContent>
  </Popover>
</template>
