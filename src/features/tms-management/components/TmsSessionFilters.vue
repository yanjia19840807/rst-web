<script setup lang="ts">
import { computed, reactive } from 'vue'

import QueryPanel from '@/components/QueryPanel.vue'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { distinctCommaTokens } from '@/lib/commaTokens'

import type { TeamAgentOption, Toolkit } from '../types'
import TeamAgentPicker from './TeamAgentPicker.vue'

export type TmsSessionEnabledFilter = '' | 'true' | 'false'

export type TmsSessionFilterValues = {
  sessionNo: string
  reference: string
  dateFrom: string
  dateTo: string
  agentCcgid: string
  toolkitId: string
  center: string
  domain: string
  pl3Code: string
  carrier: string
  site: string
  customerCountry: string
  enabled: TmsSessionEnabledFilter
}

const emptyFilters = (): TmsSessionFilterValues => ({
  sessionNo: '',
  reference: '',
  dateFrom: '',
  dateTo: '',
  agentCcgid: '',
  toolkitId: '',
  center: '',
  domain: '',
  pl3Code: '',
  carrier: '',
  site: '',
  customerCountry: '',
  enabled: '',
})

const props = defineProps<{
  showTeamFilters?: boolean
  showExport?: boolean
  exporting?: boolean
  agents?: TeamAgentOption[]
  toolkits?: Toolkit[]
}>()

const emit = defineEmits<{
  search: [value: TmsSessionFilterValues]
  clear: []
  export: []
}>()

const draft = reactive(emptyFilters())

const fieldClass = 'w-[220px]'
const visibleToolkits = computed(() => props.toolkits ?? [])

const toolkitOptions = computed(() =>
  [...visibleToolkits.value].sort((left, right) => left.name.localeCompare(right.name)),
)

const centerOptions = computed(() => uniqueSorted(visibleToolkits.value.map((toolkit) => toolkit.center)))
const domainOptions = computed(() => uniqueSorted(visibleToolkits.value.map((toolkit) => toolkit.domain)))
const pl3Options = computed(() => {
  const map = new Map<string, string>()
  for (const toolkit of visibleToolkits.value) {
    if (!toolkit.pl3Code) continue
    if (!map.has(toolkit.pl3Code)) {
      map.set(toolkit.pl3Code, toolkit.pl3Name || toolkit.pl3Code)
    }
  }
  return [...map.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.name.localeCompare(right.name))
})
const carrierOptions = computed(() => uniqueSorted(kpiValues((selection) => selection.carrier)))
const siteOptions = computed(() => uniqueSorted(kpiValues((selection) => selection.site)))
const countryOptions = computed(() =>
  distinctCommaTokens(kpiValues((selection) => selection.customerCountry)).sort((left, right) =>
    left.localeCompare(right),
  ),
)

function kpiValues(pick: (selection: NonNullable<Toolkit['sharedKpiSelections']>[number]) => string) {
  return visibleToolkits.value.flatMap((toolkit) =>
    (toolkit.sharedKpiSelections ?? []).map(pick).filter(Boolean),
  )
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort(
    (left, right) => left.localeCompare(right),
  )
}

function onEnabledChange(value: unknown) {
  draft.enabled = value === 'true' || value === 'false' ? value : ''
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
      Toolkit
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.toolkitId"
        @update:model-value="draft.toolkitId = String($event ?? '')"
       placeholder="All">
        <option
          v-for="toolkit in toolkitOptions"
          :key="toolkit.id"
          :value="toolkit.id"
        >
          {{ toolkit.name }}
        </option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      GBS Center
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.center"
        @update:model-value="draft.center = String($event ?? '')"
       placeholder="All">
        <option v-for="center in centerOptions" :key="center" :value="center">
          {{ center }}
        </option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Domain
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.domain"
        @update:model-value="draft.domain = String($event ?? '')"
       placeholder="All">
        <option v-for="domain in domainOptions" :key="domain" :value="domain">
          {{ domain }}
        </option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      PL3
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.pl3Code"
        @update:model-value="draft.pl3Code = String($event ?? '')"
       placeholder="All">
        <option
          v-for="pl3 in pl3Options"
          :key="pl3.code"
          :value="pl3.code"
        >
          {{ pl3.name }}
        </option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Carrier
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.carrier"
        @update:model-value="draft.carrier = String($event ?? '')"
       placeholder="All">
        <option v-for="carrier in carrierOptions" :key="carrier" :value="carrier">
          {{ carrier }}
        </option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      GBS Site
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.site"
        @update:model-value="draft.site = String($event ?? '')"
       placeholder="All">
        <option v-for="site in siteOptions" :key="site" :value="site">
          {{ site }}
        </option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Customer Country
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.customerCountry"
        @update:model-value="draft.customerCountry = String($event ?? '')"
       placeholder="All">
        <option
          v-for="country in countryOptions"
          :key="country"
          :value="country"
        >
          {{ country }}
        </option>
      </NativeSelect>
    </label>
    <label
      v-if="showTeamFilters"
      class="grid gap-1.5 text-xs text-muted-foreground"
    >
      Created by
      <TeamAgentPicker
        :model-value="draft.agentCcgid || null"
        :agents="agents ?? []"
        @update:model-value="draft.agentCcgid = $event ?? ''"
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
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Status
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.enabled"
        @update:model-value="onEnabledChange($event)"
       placeholder="All">
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Session From
      <DatePicker
        v-model="draft.dateFrom"
        aria-label="Choose session start date"
        placeholder="Select start date"
        :class="fieldClass"
      />
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Session To
      <DatePicker
        v-model="draft.dateTo"
        aria-label="Choose session end date"
        placeholder="Select end date"
        :class="fieldClass"
      />
    </label>
  </QueryPanel>
</template>
