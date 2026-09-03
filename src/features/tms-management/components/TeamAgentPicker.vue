<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonPicker, { type PersonPickerQuery } from '@/components/PersonPicker.vue'

import type { TeamAgentOption } from '../types'

const props = defineProps<{
  modelValue: string | null
  agents: TeamAgentOption[]
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

const filtered = computed(() => {
  const needle = pickerQuery.value.q.trim().toLowerCase()
  const rows = props.agents.map((agent) => ({
    id: agent.ccgid,
    ccgid: agent.ccgid,
    name: agent.name,
    email: agent.email,
  }))
  if (!needle) return rows
  return rows.filter(
    (agent) =>
      agent.name.toLowerCase().includes(needle) ||
      (agent.email ?? '').toLowerCase().includes(needle),
  )
})

const items = computed(() => {
  const start = (pickerQuery.value.page - 1) * pickerQuery.value.pageSize
  return filtered.value.slice(start, start + pickerQuery.value.pageSize)
})

const emptyText = computed(() =>
  pickerQuery.value.q ? 'No matching people' : 'No agents on this team',
)
</script>

<template>
  <PersonPicker
    :model-value="props.modelValue"
    empty-label="All agents"
    allow-clear
    :items="items"
    :total="filtered.length"
    :empty-text="emptyText"
    :disabled="disabled"
    trigger-class="h-9 w-[200px]"
    @update:model-value="emit('update:modelValue', $event)"
    @query="pickerQuery = $event"
  />
</template>
