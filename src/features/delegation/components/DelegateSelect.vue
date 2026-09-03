<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonPicker, { type PersonPickerQuery } from '@/components/PersonPicker.vue'

import { useDelegationCandidatesQuery } from '../api/queries'

const props = defineProps<{
  modelValue: string | null
  disabled?: boolean
  invalid?: boolean
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
  q: pickerQuery.value.q || undefined,
  page: pickerQuery.value.page,
  pageSize: pickerQuery.value.pageSize,
}))

const peopleQuery = useDelegationCandidatesQuery(listQuery, () => pickerQuery.value.open)
const items = computed(() =>
  (peopleQuery.data.value?.items ?? []).map((item) => ({
    id: item.ccgid,
    ccgid: item.ccgid,
    name: item.name,
    email: item.email,
  })),
)
const total = computed(() => peopleQuery.data.value?.total ?? 0)
const loading = computed(() => peopleQuery.isFetching.value)
const emptyText = computed(() =>
  pickerQuery.value.q ? 'No matching people' : 'No people found',
)
</script>

<template>
  <PersonPicker
    :model-value="props.modelValue"
    empty-label="Select a person"
    :items="items"
    :total="total"
    :loading="loading"
    :empty-text="emptyText"
    :disabled="disabled"
    :invalid="invalid"
    @update:model-value="emit('update:modelValue', $event)"
    @query="pickerQuery = $event"
  />
</template>
