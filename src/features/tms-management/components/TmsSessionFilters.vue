<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'

import type { Pl3Option, TeamAgentOption, Toolkit } from '../types'
import TeamAgentPicker from './TeamAgentPicker.vue'

const props = defineProps<{
  sessionNo: string
  reference: string
  dateFrom: string
  dateTo: string
  agentCcgid?: string
  toolkitId?: string
  pl3Code?: string
  showTeamFilters?: boolean
  agents?: TeamAgentOption[]
  toolkits?: Toolkit[]
  pl3Options?: Pl3Option[]
}>()

const emit = defineEmits<{
  'update:sessionNo': [value: string]
  'update:reference': [value: string]
  'update:dateFrom': [value: string]
  'update:dateTo': [value: string]
  'update:agentCcgid': [value: string]
  'update:toolkitId': [value: string]
  'update:pl3Code': [value: string]
}>()

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const moreOpen = ref(false)
const draftFrom = ref(props.dateFrom)
const draftTo = ref(props.dateTo)

const toolkitOptions = computed(() => {
  const all = props.toolkits ?? []
  if (!props.pl3Code) return all
  return all.filter((toolkit) => toolkit.pl3Code === props.pl3Code)
})

watch(
  () => [props.dateFrom, props.dateTo],
  () => {
    draftFrom.value = props.dateFrom
    draftTo.value = props.dateTo
  },
)

function applyDates() {
  emit('update:dateFrom', draftFrom.value)
  emit('update:dateTo', draftTo.value)
  moreOpen.value = false
}

function clearDraftDates() {
  draftFrom.value = ''
  draftTo.value = ''
}

function onPl3Change(value: string) {
  emit('update:pl3Code', value)
  if (
    props.toolkitId &&
    value &&
    !(props.toolkits ?? []).some(
      (toolkit) => toolkit.id === props.toolkitId && toolkit.pl3Code === value,
    )
  ) {
    emit('update:toolkitId', '')
  }
}
</script>

<template>
  <div class="grid gap-3">
    <div class="flex flex-wrap items-end gap-2.5">
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Session No
        <Input
          class="w-[200px]"
          :model-value="sessionNo"
          placeholder="Search session no"
          @update:model-value="emit('update:sessionNo', String($event))"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Reference
        <Input
          class="w-[180px]"
          :model-value="reference"
          placeholder="Search reference"
          @update:model-value="emit('update:reference', String($event))"
        />
      </label>
      <label
        v-if="showTeamFilters"
        class="grid gap-1.5 text-xs text-muted-foreground"
      >
        Agent
        <TeamAgentPicker
          :model-value="agentCcgid || null"
          :agents="agents ?? []"
          @update:model-value="emit('update:agentCcgid', $event ?? '')"
        />
      </label>
      <label
        v-if="showTeamFilters"
        class="grid gap-1.5 text-xs text-muted-foreground"
      >
        Toolkit
        <select
          :class="[selectClass, 'w-[220px]']"
          :value="toolkitId ?? ''"
          @change="emit('update:toolkitId', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All toolkits</option>
          <option
            v-for="toolkit in toolkitOptions"
            :key="toolkit.id"
            :value="toolkit.id"
          >
            {{ toolkit.name }}
          </option>
        </select>
      </label>
      <label
        v-if="showTeamFilters"
        class="grid gap-1.5 text-xs text-muted-foreground"
      >
        PL3
        <select
          :class="[selectClass, 'w-[220px]']"
          :value="pl3Code ?? ''"
          @change="onPl3Change(($event.target as HTMLSelectElement).value)"
        >
          <option value="">All PL3</option>
          <option
            v-for="pl3 in pl3Options ?? []"
            :key="pl3.code"
            :value="pl3.code"
          >
            {{ pl3.name }}
          </option>
        </select>
      </label>
      <Button variant="outline" @click="moreOpen = !moreOpen">
        More Filters{{ dateFrom || dateTo ? ' (1)' : '' }}
      </Button>
    </div>

    <div v-if="moreOpen" class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted/40 p-3">
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Session Date From
        <DatePicker
          v-model="draftFrom"
          aria-label="Choose session start date"
          placeholder="Select start date"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Session Date To
        <DatePicker
          v-model="draftTo"
          aria-label="Choose session end date"
          placeholder="Select end date"
        />
      </label>
      <Button variant="outline" @click="clearDraftDates">Clear</Button>
      <Button @click="applyDates">Apply Filters</Button>
    </div>

    <div v-if="dateFrom || dateTo" class="flex flex-wrap gap-2">
      <button
        v-if="dateFrom"
        class="rounded-full border bg-card px-3 py-1 text-xs"
        @click="emit('update:dateFrom', '')"
      >
        Date after: {{ dateFrom }} ×
      </button>
      <button
        v-if="dateTo"
        class="rounded-full border bg-card px-3 py-1 text-xs"
        @click="emit('update:dateTo', '')"
      >
        Date before: {{ dateTo }} ×
      </button>
    </div>
  </div>
</template>
