<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonPicker, {
  type PersonPickerQuery,
  type PersonPickerRow,
} from '@/components/PersonPicker.vue'
import { personMatchesQuery } from '@/components/personPickerQuery'

import type { ExerciseReviewerOption } from '../types'

const props = defineProps<{
  modelValue: string
  reviewers: ExerciseReviewerOption[]
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

const matched = computed(() =>
  props.reviewers.filter((reviewer) =>
    personMatchesQuery(
      { name: reviewer.name, ccgid: reviewer.ccgid, email: reviewer.email },
      pickerQuery.value.q,
    ),
  ),
)

const items = computed<PersonPickerRow[]>(() => {
  const start = (pickerQuery.value.page - 1) * pickerQuery.value.pageSize
  return matched.value.slice(start, start + pickerQuery.value.pageSize).map((reviewer) => ({
    id: reviewer.name,
    ccgid: reviewer.ccgid,
    name: reviewer.name,
    email: reviewer.email,
  }))
})

const total = computed(() => matched.value.length)

function formatLabel(row: PersonPickerRow) {
  const reviewer = props.reviewers.find((item) => item.name === row.name)
  return (reviewer?.name || row.name).trim() || row.ccgid || 'All'
}
</script>

<template>
  <PersonPicker
    :model-value="props.modelValue || null"
    empty-label="All"
    allow-clear
    :items="items"
    :total="total"
    :format-label="formatLabel"
    empty-text="No matching reviewers"
    trigger-class="w-[220px]"
    @update:model-value="emit('update:modelValue', $event ?? '')"
    @query="pickerQuery = $event"
  />
</template>
