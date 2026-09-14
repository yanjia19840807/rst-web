<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonPicker, {
  type PersonPickerQuery,
  type PersonPickerRow,
} from '@/components/PersonPicker.vue'
import { personMatchesQuery } from '@/components/personPickerQuery'
import type { ButtonVariants } from '@/components/ui/button'

import type { ExerciseReviewerOption } from '../types'

const props = defineProps<{
  modelValue: string
  reviewers: ExerciseReviewerOption[]
  disabled?: boolean
  size?: ButtonVariants['size']
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const pickerQuery = ref<PersonPickerQuery>({
  q: '',
  page: 1,
  pageSize: 10,
  open: false,
})

const rows = computed<PersonPickerRow[]>(() =>
  props.reviewers
    .filter((reviewer) => reviewer.name.trim())
    .map((reviewer) => ({
      id: reviewer.name,
      ccgid: reviewer.ccgid ?? '',
      name: reviewer.name,
      email: reviewer.email,
    })),
)

const filtered = computed(() =>
  rows.value.filter((row) => personMatchesQuery(row, pickerQuery.value.q)),
)

const items = computed(() => {
  const start = (pickerQuery.value.page - 1) * pickerQuery.value.pageSize
  return filtered.value.slice(start, start + pickerQuery.value.pageSize)
})

const emptyText = computed(() =>
  pickerQuery.value.q ? 'No matching people' : 'No reviewers in this list',
)

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
    :total="filtered.length"
    :empty-text="emptyText"
    :disabled="disabled"
    :size="size"
    :format-label="formatLabel"
    trigger-class="w-[220px]"
    @update:model-value="emit('update:modelValue', $event ?? '')"
    @query="pickerQuery = $event"
  />
</template>
