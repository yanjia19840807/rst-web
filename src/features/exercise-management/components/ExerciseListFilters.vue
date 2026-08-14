<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'

type TabKey = 'Active' | 'Archived'
type OfficialScenarioFilter = 'All scenarios' | 'Assigned' | 'Not assigned'
type ProgressStatusFilter = 'All statuses' | 'In Progress' | 'Returned' | 'Under Review'

defineProps<{
  activeTab: TabKey
  selectClass: string
  exerciseCodeFilter: string
  pl3Filter: string
  toolkitFilter: string
  statusFilter: ProgressStatusFilter
  reviewStageFilter: string
  finalStatusFilter: string
  advancedOpen: TabKey | null
  advancedCount: number
  pl3Options: string[]
  toolkitOptions: string[]
  reviewerOptions: string[]
  draftCreatedFrom: string
  draftCreatedTo: string
  draftOfficialScenario: OfficialScenarioFilter
  draftReviewer: string
  draftSubmittedFrom: string
  draftSubmittedTo: string
  draftArchivedFrom: string
  draftArchivedTo: string
}>()

const emit = defineEmits<{
  'update:exerciseCodeFilter': [value: string]
  'update:pl3Filter': [value: string]
  'update:toolkitFilter': [value: string]
  'update:statusFilter': [value: ProgressStatusFilter]
  'update:reviewStageFilter': [value: string]
  'update:finalStatusFilter': [value: string]
  'update:draftCreatedFrom': [value: string]
  'update:draftCreatedTo': [value: string]
  'update:draftOfficialScenario': [value: OfficialScenarioFilter]
  'update:draftReviewer': [value: string]
  'update:draftSubmittedFrom': [value: string]
  'update:draftSubmittedTo': [value: string]
  'update:draftArchivedFrom': [value: string]
  'update:draftArchivedTo': [value: string]
  toggleAdvanced: []
  clearAdvancedDrafts: []
  applyAdvanced: []
}>()
</script>

<template>
  <!-- Active filters -->
  <template v-if="activeTab === 'Active'">
    <div class="flex flex-wrap items-end gap-2.5">
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Exercise Code
        <Input
          :model-value="exerciseCodeFilter"
          class="w-[220px]"
          placeholder="Search exercise code"
          @update:model-value="emit('update:exerciseCodeFilter', String($event ?? ''))"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        PL3
        <select
          :value="pl3Filter"
          :class="[selectClass, 'w-[210px]']"
          @change="emit('update:pl3Filter', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in pl3Options" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Toolkit
        <select
          :value="toolkitFilter"
          :class="[selectClass, 'w-[240px]']"
          @change="emit('update:toolkitFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in toolkitOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Status
        <select
          :value="statusFilter"
          :class="[selectClass, 'w-[170px]']"
          @change="
            emit('update:statusFilter', ($event.target as HTMLSelectElement).value as ProgressStatusFilter)
          "
        >
          <option>All statuses</option>
          <option>In Progress</option>
          <option>Returned</option>
          <option>Under Review</option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Review Stage
        <select
          :value="reviewStageFilter"
          :class="[selectClass, 'w-[260px]']"
          @change="emit('update:reviewStageFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option>All stages</option>
          <option>Manager Review</option>
          <option>Center Delivery Head Review</option>
          <option>Local Transformation Head Review</option>
        </select>
      </label>
      <Button variant="outline" @click="emit('toggleAdvanced')">
        More Filters{{ advancedCount ? ` (${advancedCount})` : '' }}
      </Button>
    </div>
    <div
      v-if="advancedOpen === 'Active'"
      class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
    >
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Created Date From
        <DatePicker
          :model-value="draftCreatedFrom"
          aria-label="Created date from"
          placeholder="From"
          class="w-[180px]"
          @update:model-value="emit('update:draftCreatedFrom', $event ?? '')"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Created Date To
        <DatePicker
          :model-value="draftCreatedTo"
          aria-label="Created date to"
          placeholder="To"
          class="w-[180px]"
          @update:model-value="emit('update:draftCreatedTo', $event ?? '')"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Official Scenario
        <select
          :value="draftOfficialScenario"
          :class="[selectClass, 'w-[170px]']"
          @change="
            emit(
              'update:draftOfficialScenario',
              ($event.target as HTMLSelectElement).value as OfficialScenarioFilter,
            )
          "
        >
          <option value="All scenarios">All scenarios</option>
          <option value="Assigned">Assigned</option>
          <option value="Not assigned">Not assigned</option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Handler
        <select
          :value="draftReviewer"
          :class="[selectClass, 'w-[180px]']"
          @change="emit('update:draftReviewer', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in reviewerOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Submitted Date From
        <DatePicker
          :model-value="draftSubmittedFrom"
          aria-label="Submitted date from"
          placeholder="From"
          class="w-[180px]"
          @update:model-value="emit('update:draftSubmittedFrom', $event ?? '')"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Submitted Date To
        <DatePicker
          :model-value="draftSubmittedTo"
          aria-label="Submitted date to"
          placeholder="To"
          class="w-[180px]"
          @update:model-value="emit('update:draftSubmittedTo', $event ?? '')"
        />
      </label>
      <Button variant="outline" @click="emit('clearAdvancedDrafts')">Clear</Button>
      <Button @click="emit('applyAdvanced')">Apply Filters</Button>
    </div>
  </template>

  <!-- Archived filters -->
  <template v-else>
    <div class="flex flex-wrap items-end gap-2.5">
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Exercise Code
        <Input
          :model-value="exerciseCodeFilter"
          class="w-[220px]"
          placeholder="Search exercise code"
          @update:model-value="emit('update:exerciseCodeFilter', String($event ?? ''))"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        PL3
        <select
          :value="pl3Filter"
          :class="[selectClass, 'w-[210px]']"
          @change="emit('update:pl3Filter', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in pl3Options" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Toolkit
        <select
          :value="toolkitFilter"
          :class="[selectClass, 'w-[240px]']"
          @change="emit('update:toolkitFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in toolkitOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Final Status
        <select
          :value="finalStatusFilter"
          :class="[selectClass, 'w-[170px]']"
          @change="emit('update:finalStatusFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option>All statuses</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>
      </label>
      <Button variant="outline" @click="emit('toggleAdvanced')">
        More Filters{{ advancedCount ? ` (${advancedCount})` : '' }}
      </Button>
    </div>
    <div
      v-if="advancedOpen === 'Archived'"
      class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
    >
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Archived Date From
        <DatePicker
          :model-value="draftArchivedFrom"
          aria-label="Archived date from"
          placeholder="From"
          class="w-[180px]"
          @update:model-value="emit('update:draftArchivedFrom', $event ?? '')"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Archived Date To
        <DatePicker
          :model-value="draftArchivedTo"
          aria-label="Archived date to"
          placeholder="To"
          class="w-[180px]"
          @update:model-value="emit('update:draftArchivedTo', $event ?? '')"
        />
      </label>
      <Button variant="outline" @click="emit('clearAdvancedDrafts')">Clear</Button>
      <Button @click="emit('applyAdvanced')">Apply Filters</Button>
    </div>
  </template>
</template>
