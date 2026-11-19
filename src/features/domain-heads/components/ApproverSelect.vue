<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonPicker, {
  type PersonPickerQuery,
  type PersonPickerRow,
} from '@/components/PersonPicker.vue'
import type { ButtonVariants } from '@/components/ui/button'
import { useTimesheetPeopleQuery } from '@/features/timesheet/api/queries'

const props = defineProps<{
  modelValue?: string | null
  multiple?: boolean
  center: string
  fallbackName?: string | null
  fallbackPositionId?: string | null
  fallbacks?: Array<{ positionId?: string | null; name?: string | null }>
  disabled?: boolean
  size?: ButtonVariants['size']
  triggerClass?: string
}>()

const many = defineModel<string[]>('many', { default: () => [] })

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
    id: item.positionId || item.ccgid,
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
  const named = (props.fallbacks ?? []).find((item) => item.positionId === row.id)?.name?.trim()
  const single = row.id === props.fallbackPositionId ? (props.fallbackName ?? '').trim() : ''
  const live = row.name.trim()
  const resolved = live && live !== row.id ? live : named || single
  return resolved || (props.multiple ? 'Select approvers' : 'Select approver')
}
</script>

<template>
  <PersonPicker
    :model-value="props.multiple ? null : (props.modelValue ?? null)"
    v-model:many="many"
    :multiple="multiple"
    :empty-label="multiple ? 'Select approvers' : 'Select approver'"
    allow-clear
    :items="items"
    :total="total"
    :loading="loading"
    :empty-text="emptyText"
    :disabled="disabled"
    :size="size"
    :trigger-class="triggerClass"
    :format-label="formatLabel"
    @update:model-value="emit('update:modelValue', $event)"
    @query="pickerQuery = $event"
  />
</template>
