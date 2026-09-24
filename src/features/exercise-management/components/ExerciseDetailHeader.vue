<script setup lang="ts">
import { computed, ref } from 'vue'

import CreatedByText from '@/components/CreatedByText.vue'
import DetailTable, { type DetailRow } from '@/components/DetailTable.vue'
import TableTextLink from '@/components/TableTextLink.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { actorLabel, ownerLabel, sameAuditActor } from '@/lib/auditActor'
import { distinctCommaTokens } from '@/lib/commaTokens'
import { formatInstantForCenter } from '@/lib/datetime'

import type { Exercise } from '../types'
import ToolkitInfoDialog from './ToolkitInfoDialog.vue'
import ToolkitInfoPanel from './ToolkitInfoPanel.vue'

const toolkitInfoOpen = ref(false)

const props = withDefaults(
  defineProps<{
    exercise: Exercise
    locked: boolean
    submitted?: boolean
  }>(),
  { submitted: false },
)

const emit = defineEmits<{
  editPeriods: []
}>()

const toolkit = computed(() => props.exercise.snapshot.toolkit)
const countries = computed(() =>
  distinctCommaTokens((props.exercise.snapshot.sharedKpis ?? []).map((item) => item.customerCountry)),
)

const exerciseRows = computed(() => {
  const rows: DetailRow[] = [
    { label: 'Exercise No', value: props.exercise.exerciseCode },
    { label: 'Sizing Month', value: props.exercise.sizingMonth },
  ]
  if (!props.submitted) {
    rows.push({
      label: 'Created at',
      value: formatInstantForCenter(props.exercise.createdAt, toolkit.value.center),
    })
  }
  if (ownerLabel(props.exercise.createdBy)) {
    rows.push({ key: 'createdBy', label: 'Created by', value: '' })
  }
  if (
    !props.submitted &&
    actorLabel(props.exercise.updatedBy) &&
    !sameAuditActor(props.exercise.createdBy, props.exercise.updatedBy)
  ) {
    rows.push({ key: 'updatedBy', label: 'Last updated by', value: '' })
  }
  if (props.submitted || props.exercise.submittedAt) {
    rows.push({
      label: 'Submitted at',
      value: formatInstantForCenter(props.exercise.submittedAt, toolkit.value.center),
    })
  }
  if (props.exercise.archivedAt) {
    rows.push({
      label: 'Validated at',
      value: formatInstantForCenter(props.exercise.archivedAt, toolkit.value.center),
    })
  }
  return rows
})

const toolkitRows = computed(() => [
  { key: 'toolkit', label: 'Toolkit', value: toolkit.value.name, strong: true },
  { label: 'GBS Center', value: toolkit.value.center },
  { label: 'Domain', value: toolkit.value.domain },
  { label: 'PL1', value: toolkit.value.pl1 },
  { label: 'PL2', value: toolkit.value.pl2 },
  { label: 'PL3', value: toolkit.value.pl3Name },
  { label: 'Customer Country', value: countries.value.join(', ') || '—' },
])
</script>

<template>
  <Card>
    <CardHeader class="items-center">
      <CardTitle class="text-base">Exercise Info</CardTitle>
      <CardAction v-if="!locked">
        <Button variant="outline" @click="emit('editPeriods')">Edit Periods</Button>
      </CardAction>
    </CardHeader>
    <CardContent class="grid gap-4">
      <section class="grid gap-3">
        <h3 class="text-sm font-semibold">Basic Information</h3>
        <div class="grid gap-4">
          <DetailTable :rows="exerciseRows" :columns="2">
            <template #createdBy>
              <CreatedByText :actor="exercise.createdBy" />
            </template>
            <template #updatedBy>
              <CreatedByText :actor="exercise.updatedBy" />
            </template>
          </DetailTable>
          <DetailTable :rows="toolkitRows" :columns="2">
            <template v-if="submitted" #toolkit="{ row }">
              <TableTextLink
                v-if="row.value"
                title="Toolkit info"
                @click="toolkitInfoOpen = true"
              >
                {{ row.value }}
              </TableTextLink>
              <span v-else>—</span>
            </template>
          </DetailTable>
        </div>
      </section>

      <ToolkitInfoPanel
        v-if="!submitted"
        flat
        :show-mapping="false"
        show-delivery-hc
        :snapshot="exercise.snapshot"
        :alignment="exercise.timesheetAlignment"
      />
    </CardContent>
  </Card>

  <ToolkitInfoDialog
    v-if="submitted"
    v-model:open="toolkitInfoOpen"
    show-delivery-hc
    :snapshot="exercise.snapshot"
    :alignment="exercise.timesheetAlignment"
  />
</template>
