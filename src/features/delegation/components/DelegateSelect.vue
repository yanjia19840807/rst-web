<script setup lang="ts">
import { computed, ref } from 'vue'
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

import { useDelegationCandidatesQuery } from '../api/queries'
import type { DelegationCandidate } from '../types'

const props = defineProps<{
  modelValue: string | null
  disabled?: boolean
  invalid?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const open = ref(false)
const queryInput = ref('')
const appliedQuery = ref('')
const page = ref(1)
const pageSize = ref(10)
const picked = ref<DelegationCandidate | null>(null)

const listQuery = computed(() => ({
  q: appliedQuery.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const peopleQuery = useDelegationCandidatesQuery(listQuery, () => open.value)
const items = computed(() => peopleQuery.data.value?.items ?? [])
const total = computed(() => peopleQuery.data.value?.total ?? 0)
const loading = computed(() => peopleQuery.isFetching.value)

const selected = computed(() => {
  const match = items.value.find((item) => item.ccgid === props.modelValue)
  if (match) return match
  if (picked.value && picked.value.ccgid === props.modelValue) return picked.value
  return null
})

function labelOf(candidate: DelegationCandidate | null) {
  if (!candidate) return 'Select a person'
  return candidate.name.trim() || candidate.ccgid
}

function choose(candidate: DelegationCandidate | null) {
  picked.value = candidate
  emit('update:modelValue', candidate?.ccgid ?? null)
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
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        class="w-full justify-between font-normal"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
      >
        <span class="truncate">{{ labelOf(selected) }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-96 gap-2 p-2" align="start">
      <Input
        v-model="queryInput"
        placeholder="Search name or CCGID"
        class="h-8 text-sm"
      />
      <div class="relative h-72 overflow-hidden rounded-md border">
        <div class="h-full overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="h-8">CCGID</TableHead>
                <TableHead class="h-8">Name</TableHead>
                <TableHead class="h-8">Center</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="candidate in items"
                :key="candidate.ccgid"
                class="cursor-pointer"
                :class="candidate.ccgid === modelValue ? 'bg-muted' : undefined"
                @click="choose(candidate)"
              >
                <TableCell class="py-1.5 font-mono text-xs">{{ candidate.ccgid }}</TableCell>
                <TableCell class="py-1.5">{{ candidate.name }}</TableCell>
                <TableCell class="py-1.5 text-muted-foreground">{{ candidate.center || '—' }}</TableCell>
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
          {{ appliedQuery ? 'No matching people' : 'No people found' }}
        </div>
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
