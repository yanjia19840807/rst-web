<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonPicker, {
  type PersonPickerQuery,
  type PersonPickerRow,
} from '@/components/PersonPicker.vue'
import { useTimesheetPeopleQuery } from '@/features/timesheet/api/queries'

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

const pickerQuery = ref<PersonPickerQuery>({
  q: '',
  page: 1,
  pageSize: 10,
  open: false,
})

const listQuery = computed(() => ({
  center: props.center,
  q: pickerQuery.value.q || undefined,
  page: pickerQuery.value.page,
  pageSize: pickerQuery.value.pageSize,
}))

const peopleQuery = useTimesheetPeopleQuery(
  listQuery,
  () => pickerQuery.value.open && Boolean(props.center.trim()),
)
const items = computed(() =>
  (peopleQuery.data.value?.items ?? []).map((item) => ({
    id: item.positionId,
    ccgid: item.ccgid,
    name: item.name,
    email: item.email,
  })),
)
const total = computed(() => peopleQuery.data.value?.total ?? 0)
const loading = computed(() => peopleQuery.isFetching.value)
const emptyText = computed(() =>
  pickerQuery.value.q ? 'No matching people' : 'No people in this Center',
)

function formatLabel(row: PersonPickerRow) {
  const fallback =
    row.id === props.fallbackPositionId ? (props.fallbackName ?? '').trim() : ''
  return row.name.trim() || fallback || 'Select approver'
}
</script>

<template>
  <PersonPicker
    :model-value="props.modelValue"
    empty-label="Select approver"
    allow-clear
    :items="items"
    :total="total"
    :loading="loading"
    :empty-text="emptyText"
    :disabled="disabled"
    :format-label="formatLabel"
    @update:model-value="emit('update:modelValue', $event)"
    @query="pickerQuery = $event"
  />
</template>
