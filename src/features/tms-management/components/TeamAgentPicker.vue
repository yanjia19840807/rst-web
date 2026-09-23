<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonPicker, {
  type PersonPickerQuery,
  type PersonPickerRow,
} from '@/components/PersonPicker.vue'
import { personMatchesQuery } from '@/components/personPickerQuery'

import type { TeamAgentOption } from '../types'

const props = defineProps<{
  modelValue: string | null
  agents: TeamAgentOption[]
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

const matched = computed(() =>
  props.agents.filter((agent) =>
    personMatchesQuery(
      { name: agent.name, ccgid: agent.ccgid, email: agent.email },
      pickerQuery.value.q,
    ),
  ),
)

const items = computed<PersonPickerRow[]>(() => {
  const start = (pickerQuery.value.page - 1) * pickerQuery.value.pageSize
  return matched.value.slice(start, start + pickerQuery.value.pageSize).map((agent) => ({
    id: agent.ccgid,
    ccgid: agent.ccgid,
    name: agent.name,
    email: agent.email,
  }))
})

const total = computed(() => matched.value.length)

function formatLabel(row: PersonPickerRow) {
  const agent = props.agents.find((item) => item.ccgid === row.ccgid)
  return (agent?.name || row.name).trim() || row.ccgid || 'All'
}
</script>

<template>
  <PersonPicker
    :model-value="props.modelValue"
    empty-label="All"
    allow-clear
    :items="items"
    :total="total"
    :format-label="formatLabel"
    empty-text="No matching agents"
    trigger-class="w-[220px]"
    @update:model-value="emit('update:modelValue', $event)"
    @query="pickerQuery = $event"
  />
</template>
