<script setup lang="ts">
import { reactive } from 'vue'

import QueryPanel from '@/components/QueryPanel.vue'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'

import {
  CURRENT_STEP_FILTERS,
  IN_PROGRESS_TAB,
  type CurrentStepFilter,
} from '../workflowLabels'
import {
  emptyExerciseListFilters,
  type ExerciseListFilterValues,
  type OfficialScenarioFilter,
} from './exerciseListFilters'

type TabKey = typeof IN_PROGRESS_TAB | 'Archived'

defineProps<{
  activeTab: TabKey
  pl3Options: string[]
  toolkitOptions: string[]
  reviewerOptions: string[]
}>()

const emit = defineEmits<{
  search: [value: ExerciseListFilterValues]
  clear: []
}>()

const draft = reactive(emptyExerciseListFilters())
const fieldClass = 'w-[220px]'

function onSearch() {
  emit('search', { ...draft })
}

function onClear() {
  Object.assign(draft, emptyExerciseListFilters())
  emit('clear')
}
</script>

<template>
  <QueryPanel title="Filters" @search="onSearch" @clear="onClear">
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Exercise Code
      <Input
        v-model="draft.exerciseCode"
        :class="fieldClass"
        placeholder="Search exercise code"
      />
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      PL3
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.pl3"
        @update:model-value="draft.pl3 = String($event ?? '')"
      >
        <option value="">All PL3</option>
        <option v-for="option in pl3Options" :key="option" :value="option">
          {{ option }}
        </option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Toolkit
      <NativeSelect
        :class="fieldClass"
        :model-value="draft.toolkit"
        @update:model-value="draft.toolkit = String($event ?? 'All toolkits')"
      >
        <option v-for="option in toolkitOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </NativeSelect>
    </label>
    <template v-if="activeTab === IN_PROGRESS_TAB">
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Current Step
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.reviewStage"
          @update:model-value="draft.reviewStage = String($event ?? 'All stages') as CurrentStepFilter"
        >
          <option v-for="option in CURRENT_STEP_FILTERS" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Official Scenario
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.officialScenario"
          @update:model-value="
            draft.officialScenario = String($event ?? 'All scenarios') as OfficialScenarioFilter
          "
        >
          <option value="All scenarios">All scenarios</option>
          <option value="Assigned">Assigned</option>
          <option value="Not assigned">Not assigned</option>
        </NativeSelect>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Handler
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.reviewer"
          @update:model-value="draft.reviewer = String($event ?? 'All reviewers')"
        >
          <option v-for="option in reviewerOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Created Date From
        <DatePicker
          v-model="draft.createdFrom"
          aria-label="Created date from"
          placeholder="From"
          :class="fieldClass"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Created Date To
        <DatePicker
          v-model="draft.createdTo"
          aria-label="Created date to"
          placeholder="To"
          :class="fieldClass"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Submitted Date From
        <DatePicker
          v-model="draft.submittedFrom"
          aria-label="Submitted date from"
          placeholder="From"
          :class="fieldClass"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Submitted Date To
        <DatePicker
          v-model="draft.submittedTo"
          aria-label="Submitted date to"
          placeholder="To"
          :class="fieldClass"
        />
      </label>
    </template>
    <template v-else>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Final Status
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.finalStatus"
          @update:model-value="draft.finalStatus = String($event ?? 'All statuses')"
        >
          <option>All statuses</option>
          <option>Approved</option>
          <option>Rejected</option>
        </NativeSelect>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Archived Date From
        <DatePicker
          v-model="draft.archivedFrom"
          aria-label="Archived date from"
          placeholder="From"
          :class="fieldClass"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Archived Date To
        <DatePicker
          v-model="draft.archivedTo"
          aria-label="Archived date to"
          placeholder="To"
          :class="fieldClass"
        />
      </label>
    </template>
  </QueryPanel>
</template>
