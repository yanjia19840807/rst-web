<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonPicker, {
  type PersonPickerQuery,
  type PersonPickerRow,
} from '@/components/PersonPicker.vue'
import { personMatchesQuery } from '@/components/personPickerQuery'

import type { ValidationPersonOption } from '../types'

const props = defineProps<{
  modelValue: string
  owners: ValidationPersonOption[]
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
  props.owners.filter((owner) =>
    personMatchesQuery({ name: owner.name, ccgid: owner.ccgid }, pickerQuery.value.q),
  ),
)

const items = computed<PersonPickerRow[]>(() => {
  const start = (pickerQuery.value.page - 1) * pickerQuery.value.pageSize
  return matched.value.slice(start, start + pickerQuery.value.pageSize).map((owner) => ({
    id: owner.ccgid,
    ccgid: owner.ccgid,
    name: owner.name,
  }))
})

const total = computed(() => matched.value.length)

function formatLabel(row: PersonPickerRow) {
  const owner = props.owners.find((item) => item.ccgid === row.ccgid)
  return (owner?.name || row.name).trim() || row.ccgid || 'All'
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
    empty-text="No matching owners"
    trigger-class="w-[220px]"
    @update:model-value="emit('update:modelValue', $event ?? '')"
    @query="pickerQuery = $event"
  />
</template>
