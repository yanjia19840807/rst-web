<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

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

import { useTimesheetPeopleQuery } from '@/features/timesheet/api/queries'
import type { TimesheetPerson } from '@/features/timesheet/types'

const props = defineProps<{
  modelValue: string | null
  center: string
  fallbackName?: string | null
  fallbackPositionId?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const open = ref(false)
const queryInput = ref('')
const appliedQuery = ref('')
const page = ref(1)
const pageSize = ref(10)
const picked = ref<TimesheetPerson | null>(null)

const listQuery = computed(() => ({
  center: props.center,
  q: appliedQuery.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const peopleQuery = useTimesheetPeopleQuery(listQuery, () => open.value && Boolean(props.center.trim()))

const items = computed(() => peopleQuery.data.value?.items ?? [])
const total = computed(() => peopleQuery.data.value?.total ?? 0)
const loading = computed(() => peopleQuery.isPending.value && !peopleQuery.data.value)

const selected = computed(() => {
  const match = items.value.find((item) => item.positionId === props.modelValue)
  if (match) return match
  if (picked.value && picked.value.positionId === props.modelValue) return picked.value
  if (props.modelValue && props.fallbackPositionId === props.modelValue) {
    return {
      positionId: props.fallbackPositionId,
      ccgid: '',
      name: props.fallbackName ?? '',
    } satisfies TimesheetPerson
  }
  return null
})

function labelOf(candidate: TimesheetPerson | null) {
  if (!candidate) return 'Select approver'
  return candidate.name.trim() || 'Select approver'
}

function choose(candidate: TimesheetPerson | null) {
  picked.value = candidate
  emit('update:modelValue', candidate?.positionId ?? null)
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
  () => ({
    totalPages: peopleQuery.data.value?.totalPages,
    fetching: peopleQuery.isFetching.value,
  }),
  ({ totalPages: pages, fetching }) => {
    if (!fetching && pages != null && page.value > pages) {
      page.value = pages
    }
  },
)
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        class="w-full justify-between font-normal"
        :disabled="disabled"
      >
        <span class="truncate">{{ labelOf(selected) }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-96 gap-2 p-2" align="start">
      <div class="flex items-center gap-2">
        <div class="min-w-0 flex-1">
          <Input
            v-model="queryInput"
            placeholder="Search name"
            class="h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant="link"
          class="h-auto shrink-0 px-0"
          :disabled="!modelValue"
          @click="choose(null)"
        >
          Clear
        </Button>
      </div>

      <div class="max-h-72 overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="h-8">CCGID</TableHead>
              <TableHead class="h-8">Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="candidate in items"
              :key="candidate.positionId"
              class="cursor-pointer"
              :class="candidate.positionId === modelValue ? 'bg-muted' : undefined"
              @click="choose(candidate)"
            >
              <TableCell class="py-1.5 font-mono text-xs">{{ candidate.ccgid }}</TableCell>
              <TableCell class="py-1.5">{{ candidate.name }}</TableCell>
            </TableRow>
            <TableRow v-if="loading">
              <TableCell colspan="2" class="h-14 text-center text-sm text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
            <TableRow v-else-if="!items.length">
              <TableCell colspan="2" class="h-14 text-center text-sm text-muted-foreground">
                {{ appliedQuery ? 'No matching people' : 'No people in this Center' }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <TablePager
        class="mt-0"
        hide-summary
        link-buttons
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
