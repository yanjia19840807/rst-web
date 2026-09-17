<script setup lang="ts">
import { reactive } from 'vue'

import QueryPanel from '@/components/QueryPanel.vue'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/month-picker'
import { NativeSelect } from '@/components/ui/native-select'

import {
  CURRENT_STEP_FILTERS,
  IN_PROGRESS_TAB,
  VALIDATED_TAB,
  type CurrentStepFilter,
} from '../workflowLabels'
import {
  emptyExerciseListFilters,
  type ExerciseListFilterValues,
} from './exerciseListFilters'
import ReviewerPicker from './ReviewerPicker.vue'

type TabKey = typeof IN_PROGRESS_TAB | typeof VALIDATED_TAB

defineProps<{
  activeTab: TabKey
  pl3Options: string[]
  toolkitOptions: string[]
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
        @update:model-value="draft.toolkit = String($event ?? '')"
      >
        <option value="">All toolkits</option>
        <option v-for="option in toolkitOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </NativeSelect>
    </label>
    <label class="grid gap-1.5 text-xs text-muted-foreground">
      Sizing Month
      <MonthPicker
        v-model="draft.sizingMonth"
        aria-label="Sizing month"
        placeholder="All months"
        :class="fieldClass"
      />
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
        Current Reviewer
        <ReviewerPicker v-model="draft.reviewer" />
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
        Validated Date From
        <DatePicker
          v-model="draft.archivedFrom"
          aria-label="Validated date from"
          placeholder="From"
          :class="fieldClass"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Validated Date To
        <DatePicker
          v-model="draft.archivedTo"
          aria-label="Validated date to"
          placeholder="To"
          :class="fieldClass"
        />
      </label>
    </template>
  </QueryPanel>
</template>
