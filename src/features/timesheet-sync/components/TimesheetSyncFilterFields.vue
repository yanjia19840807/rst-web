<script setup lang="ts">
import FilterField from '@/features/governance-reports/components/FilterField.vue'
import { DatePicker } from '@/components/ui/date-picker'
import { MonthPicker } from '@/components/ui/month-picker'
import { NativeSelect } from '@/components/ui/native-select'

import {
  isMonthlyKind,
  normalizeKindDates,
  type TimesheetSyncFilters,
} from '../timesheetSyncFilters'

const props = defineProps<{
  draft: TimesheetSyncFilters
  centerOptions: string[]
  showStatus?: boolean
}>()

const fieldClass = 'w-[180px]'

function onKindChange(value: string) {
  Object.assign(props.draft, normalizeKindDates(props.draft, String(value ?? '')))
}
</script>

<template>
  <FilterField label="Center">
    <NativeSelect
      :class="fieldClass"
      :model-value="draft.center"
      placeholder="All"
      @update:model-value="draft.center = String($event ?? '')"
    >
      <option v-for="center in centerOptions" :key="center" :value="center">
        {{ center }}
      </option>
    </NativeSelect>
  </FilterField>
  <FilterField label="Kind">
    <NativeSelect
      :class="fieldClass"
      :model-value="draft.kind"
      placeholder="All"
      @update:model-value="onKindChange(String($event ?? ''))"
    >
      <option value="DAILY">Daily</option>
      <option value="MONTHLY">Monthly</option>
    </NativeSelect>
  </FilterField>
  <FilterField v-if="showStatus" label="Status">
    <NativeSelect
      :class="fieldClass"
      :model-value="draft.status"
      placeholder="All"
      @update:model-value="draft.status = String($event ?? '')"
    >
      <option value="ACTIVE">ACTIVE</option>
      <option value="FAILED">FAILED</option>
      <option value="LOADING">LOADING</option>
      <option value="ARCHIVED">ARCHIVED</option>
    </NativeSelect>
  </FilterField>
  <FilterField label="Source">
    <NativeSelect
      :class="fieldClass"
      :model-value="draft.sourceType"
      placeholder="All"
      @update:model-value="draft.sourceType = String($event ?? '')"
    >
      <option value="SHAREPOINT">SharePoint</option>
      <option value="MANUAL">Upload</option>
    </NativeSelect>
  </FilterField>
  <FilterField label="Sync date From">
    <MonthPicker
      v-if="isMonthlyKind(draft.kind)"
      v-model="draft.syncDateFrom"
      aria-label="Sync date from"
      placeholder="From"
      :class="fieldClass"
    />
    <DatePicker
      v-else
      v-model="draft.syncDateFrom"
      aria-label="Sync date from"
      placeholder="From"
      :class="fieldClass"
    />
  </FilterField>
  <FilterField label="Sync date To">
    <MonthPicker
      v-if="isMonthlyKind(draft.kind)"
      v-model="draft.syncDateTo"
      aria-label="Sync date to"
      placeholder="To"
      :class="fieldClass"
    />
    <DatePicker
      v-else
      v-model="draft.syncDateTo"
      aria-label="Sync date to"
      placeholder="To"
      :class="fieldClass"
    />
  </FilterField>
</template>
