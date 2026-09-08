<script setup lang="ts">
import { computed, reactive } from 'vue'

import QueryPanel from '@/components/QueryPanel.vue'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'

import type { Pl3Option, TeamAgentOption, Toolkit } from '../types'
import TeamAgentPicker from './TeamAgentPicker.vue'

export type TmsSessionFilterValues = {
  sessionNo: string
  reference: string
  dateFrom: string
  dateTo: string
  agentCcgid: string
  toolkitId: string
  pl3Code: string
}

const emptyFilters = (): TmsSessionFilterValues => ({
  sessionNo: '',
  reference: '',
  dateFrom: '',
  dateTo: '',
  agentCcgid: '',
  toolkitId: '',
  pl3Code: '',
})

const props = defineProps<{
  showTeamFilters?: boolean
  showExport?: boolean
  exporting?: boolean
  agents?: TeamAgentOption[]
  toolkits?: Toolkit[]
  pl3Options?: Pl3Option[]
}>()

const emit = defineEmits<{
  search: [value: TmsSessionFilterValues]
  clear: []
  export: []
}>()

const draft = reactive(emptyFilters())

const fieldClass = 'w-[220px]'

const toolkitOptions = computed(() => {
  const all = props.toolkits ?? []
  if (!draft.pl3Code) return all
  return all.filter((toolkit) => toolkit.pl3Code === draft.pl3Code)
})

function onPl3Change(value: string) {
  draft.pl3Code = value
  if (
    draft.toolkitId &&
    value &&
    !(props.toolkits ?? []).some(
      (toolkit) => toolkit.id === draft.toolkitId && toolkit.pl3Code === value,
    )
  ) {
    draft.toolkitId = ''
  }
}

function onSearch() {
  emit('search', { ...draft })
}

function onClear() {
  Object.assign(draft, emptyFilters())
  emit('clear')
}
</script>

<template>
  <QueryPanel
    title="Filters"
    :show-export="showExport"
    :exporting="exporting"
    @search="onSearch"
    @clear="onClear"
    @export="emit('export')"
  >
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Session No
      <Input
        v-model="draft.sessionNo"
        :class="fieldClass"
        placeholder="Search session no"
      />
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Reference
      <Input
        v-model="draft.reference"
        :class="fieldClass"
        placeholder="Search reference"
      />
    </label>
    <label
      v-if="showTeamFilters"
      class="grid gap-1.5 text-xs text-muted-foreground"
    >
      Agent
      <TeamAgentPicker
        :model-value="draft.agentCcgid || null"
        :agents="agents ?? []"
        @update:model-value="draft.agentCcgid = $event ?? ''"
      />
    </label>
    <label
      v-if="showTeamFilters"
      class="grid gap-1.5 text-xs text-muted-foreground"
    >
      Toolkit
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.toolkitId"
        @update:model-value="draft.toolkitId = String($event ?? '')"
      >
        <option value="">All toolkits</option>
        <option
          v-for="toolkit in toolkitOptions"
          :key="toolkit.id"
          :value="toolkit.id"
        >
          {{ toolkit.name }}
        </option>
      </NativeSelect>
    </label>
    <label
      v-if="showTeamFilters"
      class="grid gap-1.5 text-xs text-muted-foreground"
    >
      PL3
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.pl3Code"
        @update:model-value="onPl3Change(String($event ?? ''))"
      >
        <option value="">All PL3</option>
        <option
          v-for="pl3 in pl3Options ?? []"
          :key="pl3.code"
          :value="pl3.code"
        >
          {{ pl3.name }}
        </option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Session Date From
      <DatePicker
        v-model="draft.dateFrom"
        aria-label="Choose session start date"
        placeholder="Select start date"
        :class="fieldClass"
      />
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Session Date To
      <DatePicker
        v-model="draft.dateTo"
        aria-label="Choose session end date"
        placeholder="Select end date"
        :class="fieldClass"
      />
    </label>
  </QueryPanel>
</template>
