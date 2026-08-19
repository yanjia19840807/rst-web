<script setup lang="ts">
import { useRouter } from 'vue-router'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'

import { useToolkitEditor } from '../composables/useToolkitEditor'
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
  syncDate,
  subtasks,
  sharedKpiSelections,
  selectedKpiRows,
  totalHc,
  loading,
  busy,
  kpiOpen,
  deleteOpen,
  errors,
  sharedKpiError,
  values,
  applyKpiSelection,
  removeKpi,
  save,
  confirmDelete,
} = useToolkitEditor(() => props.toolkitId)
</script>

<template>
  <div>
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
      <Button v-if="toolkitId" variant="destructive" @click="deleteOpen = true">
        Delete Toolkit
      </Button>
      <Button :disabled="busy || loading" @click="save">
        {{ busy ? 'Saving…' : 'Save Toolkit' }}
      </Button>
    </PageActions>

    <div class="grid gap-4 xl:grid-cols-2">
      <ProcessMappingCard
        v-model:name="name"
        v-model:center="center"
        v-model:domain="domain"
        v-model:pl1="pl1"
        v-model:pl2="pl2"
        v-model:supervisor-position-id="supervisorPositionId"
        v-model:selected-countries="selectedCountries"
        v-model:combine-subtasks-time="combineSubtasksTime"
        :centers="centers"
        :domains="domains"
        :pl1s="pl1s"
        :pl2s="pl2s"
        :pl3s="pl3s"
        :countries="countries"
        :errors="errors"
      />
      <SubtaskEditorCard v-model:subtasks="subtasks" />
    </div>

    <SharedKpiCard
      :rows="selectedKpiRows"
      :total-hc="totalHc"
      :sync-date="syncDate"
      :can-select="selectedCountries.length > 0"
      :has-countries="selectedCountries.length > 0"
      :error="sharedKpiError"
      @select="kpiOpen = true"
      @remove="removeKpi"
    />

    <SelectSharedKpiDialog
      v-model:open="kpiOpen"
      :candidates="candidates"
      :selected="sharedKpiSelections"
      :countries="selectedCountries"
      @confirm="applyKpiSelection"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete Toolkit"
      warning="This action cannot be undone. Exercises and scenarios linked to this toolkit will no longer be available in the workspace."
      :rows="[{ label: 'Toolkit', value: values.name, strong: true }]"
      confirm-label="Delete Toolkit"
      :pending="busy"
      @confirm="confirmDelete"
    />
  </div>
</template>
