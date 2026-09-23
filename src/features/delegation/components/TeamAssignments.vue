<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { computed, ref } from 'vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import PositionPicker from '@/components/PositionPicker.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useContextTimeZone } from '@/composables/useContextTimeZone'
import { formatInstantForCenter } from '@/lib/datetime'

import { useAssignDelegation, useRevokeDelegation } from '../api/mutations'
import { usePositionAssignmentsQuery } from '../api/queries'
import {
  assignCoverageSchema,
  emptyAssignCoverageForm,
  toAssignCoverageRequest,
} from '../schemas/grantDelegation'
import { delegationPeriodLabel, type Delegation } from '../types'
import DelegateSelect from './DelegateSelect.vue'

const contextTimeZone = useContextTimeZone()
const assignmentsQuery = usePositionAssignmentsQuery()
const assignDelegation = useAssignDelegation()
const revokeDelegation = useRevokeDelegation()

const positions = computed(() => assignmentsQuery.data.value ?? [])
const occupantByPosition = computed(() =>
  Object.fromEntries(positions.value.map((position) => [position.positionId, position.occupantCcgid])),
)

const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: computed(() =>
    toTypedSchema(assignCoverageSchema(contextTimeZone.value, occupantByPosition.value)),
  ),
  initialValues: emptyAssignCoverageForm(),
  validateOnMount: false,
})
const [positionId] = defineField('positionId')
const [delegateCcgids] = defineField('delegateCcgids')
const [validFrom] = defineField('validFrom')
const [validUntil] = defineField('validUntil')
const revokeOpen = ref(false)
const revokeTarget = ref<Delegation | null>(null)

const loading = computed(() => assignmentsQuery.isPending.value && !assignmentsQuery.data.value)
const positionOptions = computed(() =>
  positions.value.map((position) => ({
    id: position.positionId,
    roles: position.roles,
    occupantName: position.occupantName,
  })),
)
const coverageRows = computed(() =>
  positions.value.flatMap((position) =>
    position.delegations.map((row) => ({
      ...row,
      roles: position.roles,
    })),
  ),
)
const bundledPositions = computed(() => {
  const selected = positions.value.find((position) => position.positionId === positionId.value)
  if (!selected?.occupantCcgid) return selected ? [selected] : []
  const occupant = selected.occupantCcgid.trim().toUpperCase()
  return positions.value.filter(
    (position) => position.occupantCcgid?.trim().toUpperCase() === occupant,
  )
})
const bundledPositionsLabel = computed(() =>
  bundledPositions.value
    .map((position) => {
      const roles = position.roles.filter(Boolean).join(', ')
      return roles ? `${position.positionId} · ${roles}` : position.positionId
    })
    .join('; '),
)

function roleLabel(roles: string[]) {
  return roles.filter(Boolean).join(', ') || '—'
}

function operator(row: Delegation) {
  return row.assignedByName || row.assignedByCcgid || '—'
}

const submitAssign = handleSubmit(async (formValues) => {
  try {
    await assignDelegation.mutateAsync(
      toAssignCoverageRequest(formValues, contextTimeZone.value),
    )
    resetForm({ values: emptyAssignCoverageForm() })
    toast.success('Position delegated.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not delegate the position.')
  }
})

function requestRevoke(row: Delegation) {
  revokeTarget.value = row
  revokeOpen.value = true
}

async function onRevoke() {
  const target = revokeTarget.value
  if (!target) return
  try {
    await revokeDelegation.mutateAsync(target.id)
    revokeOpen.value = false
    revokeTarget.value = null
    toast.success('Delegation revoked.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not revoke the delegation.')
  }
}
</script>

<template>
  <ListLoading v-if="loading" />
  <div v-else class="grid items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
    <Card>
      <CardHeader>
        <CardTitle>Delegate a position</CardTitle>
        <CardDescription>
          Pick any of a person's positions. Every position they hold under you is covered together,
          and every role on each position is included.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="grid gap-4" @submit.prevent="submitAssign">
          <div class="grid gap-1.5">
            <Label>Position</Label>
            <PositionPicker
              v-model="positionId"
              :items="positionOptions"
              :disabled="!positionOptions.length"
              :invalid="Boolean(errors.positionId)"
              empty-text="No direct child positions"
            />
            <p v-if="errors.positionId" class="text-xs text-destructive">{{ errors.positionId }}</p>
            <p
              v-else-if="bundledPositions.length > 1 && bundledPositionsLabel"
              class="text-xs text-muted-foreground"
            >
              Also covering {{ bundledPositionsLabel }}
            </p>
          </div>
          <div class="grid gap-1.5">
            <Label>Delegates</Label>
            <DelegateSelect
              v-model:many="delegateCcgids"
              multiple
              :invalid="Boolean(errors.delegateCcgids)"
            />
            <p v-if="errors.delegateCcgids" class="text-xs text-destructive">
              {{ errors.delegateCcgids }}
            </p>
          </div>
          <div class="grid gap-1.5">
            <Label>From</Label>
            <DatePicker
              v-model="validFrom"
              aria-label="Choose start date"
              placeholder="Optional"
              class="w-full"
              :invalid="Boolean(errors.validFrom)"
            />
            <p v-if="errors.validFrom" class="text-xs text-destructive">{{ errors.validFrom }}</p>
          </div>
          <div class="grid gap-1.5">
            <Label>Until</Label>
            <DatePicker
              v-model="validUntil"
              aria-label="Choose end date"
              placeholder="Optional"
              class="w-full"
              :invalid="Boolean(errors.validUntil)"
            />
            <p v-if="errors.validUntil" class="text-xs text-destructive">{{ errors.validUntil }}</p>
            <p class="text-xs text-muted-foreground">Leave blank for ongoing access.</p>
          </div>
          <div>
            <Button type="submit" :loading="assignDelegation.isPending.value" :disabled="!positionOptions.length">
              Assign
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Position delegation</CardTitle>
        <CardDescription>Open delegations. Revoke to end one person immediately.</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Delegate</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Operated at</TableHead>
                <TableHead class="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in coverageRows" :key="row.id">
                <TableCell>
                  <div class="font-medium">{{ row.subjectPositionId }}</div>
                  <div class="text-xs text-muted-foreground">{{ roleLabel(row.roles) }}</div>
                </TableCell>
                <TableCell>
                  <div class="font-medium">{{ row.delegateName || row.delegateCcgid }}</div>
                  <div class="font-mono text-xs text-muted-foreground">{{ row.delegateCcgid }}</div>
                </TableCell>
                <TableCell class="text-sm">
                  {{ delegationPeriodLabel(row) }}
                </TableCell>
                <TableCell>
                  <StatusBadge :status="row.status.charAt(0) + row.status.slice(1).toLowerCase()" />
                </TableCell>
                <TableCell>
                  <div class="font-medium">{{ operator(row) }}</div>
                  <div v-if="row.assignedByCcgid" class="font-mono text-xs text-muted-foreground">
                    {{ row.assignedByCcgid }}
                  </div>
                </TableCell>
                <TableCell class="text-sm">
                  {{ formatInstantForCenter(row.createdAt, row.delegatorCenter) }}
                </TableCell>
                <TableCell class="text-right">
                  <Button type="button" variant="destructive" size="sm" @click="requestRevoke(row)">
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!coverageRows.length">
                <TableCell colspan="7" class="h-20 text-center text-muted-foreground">
                  No position delegation yet.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>

  <ConfirmDialog
    v-model:open="revokeOpen"
    title="Revoke delegation"
    :description="revokeTarget
      ? `${revokeTarget.delegateName || revokeTarget.delegateCcgid} will lose this position immediately.`
      : ''"
    confirm-label="Revoke"
    :pending="revokeDelegation.isPending.value"
    @confirm="onRevoke"
  />
</template>
