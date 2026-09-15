<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import PersonPicker, {
  type PersonPickerQuery,
  type PersonPickerRow,
} from '@/components/PersonPicker.vue'
import type { ButtonVariants } from '@/components/ui/button'
import { useSessionStore } from '@/auth/session'
import { useTimesheetPeopleQuery } from '@/features/timesheet/api/queries'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  size?: ButtonVariants['size']
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { user } = storeToRefs(useSessionStore())
const center = computed(() => user.value?.center?.trim() ?? '')

const pickerQuery = ref<PersonPickerQuery>({
  q: '',
  page: 1,
  pageSize: 10,
  open: false,
})

const listQuery = computed(() => ({
  center: center.value,
  q: pickerQuery.value.q || undefined,
  page: pickerQuery.value.page,
  pageSize: pickerQuery.value.pageSize,
}))

const peopleQuery = useTimesheetPeopleQuery(
  listQuery,
  () => pickerQuery.value.open && Boolean(center.value),
)

const items = computed(() =>
  (peopleQuery.data.value?.items ?? []).map((item) => ({
    id: item.name,
    ccgid: item.ccgid,
    name: item.name,
    email: item.email,
  })),
)
const total = computed(() => peopleQuery.data.value?.total ?? 0)
const loading = computed(() => peopleQuery.isFetching.value)
const emptyText = computed(() => {
  if (!center.value) return 'Current identity has no Center'
  if (peopleQuery.isError.value) return 'Could not load people'
  return pickerQuery.value.q ? 'No matching people' : 'No people in this Center'
})

function formatLabel(row: PersonPickerRow) {
  return row.name.trim() || row.id.trim() || 'All reviewers'
}
</script>

<template>
  <PersonPicker
    :model-value="props.modelValue || null"
    empty-label="All reviewers"
    allow-clear
    :items="items"
    :total="total"
    :loading="loading"
    :empty-text="emptyText"
    :disabled="disabled"
    :size="size"
    :format-label="formatLabel"
    trigger-class="w-[220px]"
    @update:model-value="emit('update:modelValue', $event ?? '')"
    @query="pickerQuery = $event"
  />
</template>
