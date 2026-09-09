<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { useRouter } from 'vue-router'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import { useToolkitEditor } from '../composables/useToolkitEditor'
import TimesheetAlignmentAlert from '@/features/timesheet-alignment/components/TimesheetAlignmentAlert.vue'

import ProcessMappingCard from './ProcessMappingCard.vue'
import SelectSharedKpiDialog from './SelectSharedKpiDialog.vue'
import SharedKpiCard from './SharedKpiCard.vue'
import SubtaskEditorCard from './SubtaskEditorCard.vue'

const props = defineProps<{
  toolkitId?: string
}>()

const router = useRouter()
const {
  name,
  center,
  domain,
  pl1,
  pl2,
  supervisorPositionId,
  combineSubtasksTime,
  selectedCountries,
  centers,
  domains,
  pl1s,
  pl2s,
  pl3s,
  countries,
  candidates,
  candidatesLoading,
  syncDate,
  subtasks,
  sharedKpiSelections,
  selectedKpiRows,
  totalHc,
  hasMissingKpis,
  alignment,
  noTimesheetHierarchy,
  loading,
  busy,
  kpiOpen,
  toggleOpen,
  toolkitEnabled,
  syncSessionCount,
  errors,
  sharedKpiError,
  values,
  applyKpiSelection,
  applyToolkit,
  removeKpi,
  save,
  confirmToggle,
} = useToolkitEditor(() => props.toolkitId)
</script>

<template>
  <div class="grid gap-4">
    <TimesheetAlignmentAlert v-if="toolkitId" audience="toolkit" :alignment="alignment" />

    <Alert v-if="noTimesheetHierarchy" variant="warning">
      <TriangleAlert />
      <AlertTitle>No Timesheet sync data</AlertTitle>
      <AlertDescription>
        No ACTIVE Timesheet hierarchy is available. Process mapping lists will stay empty until a
        snapshot is synced.
      </AlertDescription>
    </Alert>

    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="router.push({ name: 'supervisor-toolkits' })"
        >
          ← Back to Toolkit List
        </Button>
      </template>
      <Button
        v-if="toolkitId"
        :variant="toolkitEnabled ? 'destructive' : 'outline'"
        :disabled="loading || busy"
        @click="toggleOpen = true"
      >
        {{ toolkitEnabled ? 'Disable' : 'Enable' }}
      </Button>
      <Button :loading="busy" :disabled="loading || hasMissingKpis" @click="save">
        {{ busy ? 'Saving…' : 'Save Toolkit' }}
      </Button>
    </PageActions>

    <ListLoading v-if="loading" class="h-48" />
    <div v-else class="grid gap-4">
      <ProcessMappingCard
        v-model:name="name"
        v-model:center="center"
        v-model:domain="domain"
        v-model:pl1="pl1"
        v-model:pl2="pl2"
        v-model:supervisor-position-id="supervisorPositionId"
        v-model:selected-countries="selectedCountries"
        :centers="centers"
        :domains="domains"
        :pl1s="pl1s"
        :pl2s="pl2s"
        :pl3s="pl3s"
        :countries="countries"
        :has-hierarchy="centers.length > 0"
        :errors="errors"
      >
        <SharedKpiCard
          :rows="selectedKpiRows"
          :total-hc="totalHc"
          :sync-date="syncDate"
          :can-select="selectedCountries.length > 0"
          :has-countries="selectedCountries.length > 0"
          :error="sharedKpiError"
          :show-delivery-hc="Boolean(toolkitId)"
          @select="kpiOpen = true"
          @remove="removeKpi"
        />
      </ProcessMappingCard>
      <SubtaskEditorCard
        v-model:subtasks="subtasks"
        v-model:combine-subtasks-time="combineSubtasksTime"
        :mode="toolkitId ? 'edit' : 'create'"
        :toolkit-id="toolkitId"
        :errors="errors"
        @updated="applyToolkit"
      />
    </div>

    <SelectSharedKpiDialog
      v-model:open="kpiOpen"
      :candidates="candidates"
      :pending="candidatesLoading"
      :selected="sharedKpiSelections"
      :countries="selectedCountries"
      :show-delivery-hc="Boolean(toolkitId)"
      @confirm="applyKpiSelection"
    />

    <ConfirmDialog
      v-if="toolkitId"
      v-model:open="toggleOpen"
      :title="toolkitEnabled ? 'Disable Toolkit' : 'Enable Toolkit'"
      :warning="
        toolkitEnabled
          ? `This will disable ${syncSessionCount()} TMS sessions. Completed and in-progress ones will be excluded from cycle time and will not occupy the same Toolkit, TASK and Reference.`
          : undefined
      "
      :description="
        toolkitEnabled
          ? undefined
          : `This will enable ${syncSessionCount()} TMS sessions to match the Toolkit. Discarded sessions stay discarded.`
      "
      :rows="[{ label: 'Toolkit', value: values.name, strong: true }]"
      :confirm-label="toolkitEnabled ? 'Disable' : 'Enable'"
      :confirm-variant="toolkitEnabled ? 'destructive' : 'default'"
      :pending="busy"
      @confirm="confirmToggle"
    />
  </div>
</template>
