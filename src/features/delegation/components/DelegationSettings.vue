<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { queryClient } from '@/api/query-client'
import { useSessionStore } from '@/auth/session'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import TabStrip from '@/components/TabStrip.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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

import { useCreateDelegation, useRevokeDelegation } from '../api/mutations'
import { useGrantedDelegationsQuery, useOwnSeatsQuery, useReceivedDelegationsQuery } from '../api/queries'
import {
  emptyGrantDelegationForm,
  grantDelegationSchema,
  toCreateDelegationRequest,
} from '../schemas/grantDelegation'
import { delegationPeriodLabel, isOpenDelegation, positionCoverageLabel, type Delegation } from '../types'
import DelegateSelect from './DelegateSelect.vue'
import TeamAssignments from './TeamAssignments.vue'

const session = useSessionStore()
const contextTimeZone = useContextTimeZone()
const router = useRouter()
const grantedQuery = useGrantedDelegationsQuery(() => session.canManageDelegation)
const seatsQuery = useOwnSeatsQuery(() => session.canManageDelegation)
const receivedQuery = useReceivedDelegationsQuery()
const isIncomingDelegate = computed(() =>
  (receivedQuery.data.value ?? []).some(isOpenDelegation),
)
const canGrant = computed(() => session.canManageDelegation && !isIncomingDelegate.value)
const createDelegation = useCreateDelegation()
const revokeDelegation = useRevokeDelegation()
const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: computed(() =>
    toTypedSchema(grantDelegationSchema(contextTimeZone.value, session.ccgid)),
  ),
  initialValues: emptyGrantDelegationForm(),
  validateOnMount: false,
})
const [delegateCcgids] = defineField('delegateCcgids')
const [validFrom] = defineField('validFrom')
const [validUntil] = defineField('validUntil')
const revokeOpen = ref(false)
const revokeTarget = ref<Delegation | null>(null)

const grantedLoading = computed(
  () => grantedQuery.isPending.value && !grantedQuery.data.value,
)
const receivedLoading = computed(
  () => receivedQuery.isPending.value && !receivedQuery.data.value,
)
const historyLoading = computed(() => grantedLoading.value || receivedLoading.value)

const seatOptions = computed(() =>
  (seatsQuery.data.value ?? []).map((position) => ({
    id: position.positionId,
    roles: position.roles,
    occupantName: position.occupantName,
  })),
)
const ownPositionsLabel = computed(() =>
  seatOptions.value
    .map((seat) => {
      const roles = seat.roles.filter(Boolean).join(', ')
      return roles ? `${seat.id} · ${roles}` : seat.id
    })
    .join('; '),
)
const grantedOpen = computed(() => (grantedQuery.data.value ?? []).filter(isOpenDelegation))
const grantedHistory = computed(() =>
  (grantedQuery.data.value ?? []).filter((row) => !isOpenDelegation(row)),
)
const receivedOpen = computed(() =>
  (receivedQuery.data.value ?? []).filter((row) => row.status === 'ACTIVE'),
)
const receivedHistory = computed(() =>
  (receivedQuery.data.value ?? []).filter((row) => !isOpenDelegation(row)),
)
const history = computed(() =>
  [...grantedHistory.value, ...receivedHistory.value].sort((a, b) =>
    (b.endedAt ?? b.createdAt).localeCompare(a.endedAt ?? a.createdAt),
  ),
)

const grant = handleSubmit(async (formValues) => {
  if (!canGrant.value) {
    toast.error('You cannot delegate a position while you are a delegate for someone else.')
    return
  }
  try {
    await createDelegation.mutateAsync(toCreateDelegationRequest(formValues, contextTimeZone.value))
    resetForm({ values: emptyGrantDelegationForm() })
    toast.success('Delegation granted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not grant delegation.')
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
    toast.error(error instanceof Error ? error.message : 'Could not revoke delegation.')
  }
}

async function switchIdentity(id: string) {
  await session.actAs(id)
  queryClient.clear()
  await router.push(session.homePath)
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

type TabKey = 'granted' | 'assignments' | 'received' | 'history'

const tabs = computed(() => {
  const items: { key: TabKey; label: string }[] = []
  if (session.canManageDelegation) {
    items.push({ key: 'granted', label: 'My delegates' })
  }
  if (session.canManageTeamDelegation) {
    items.push({ key: 'assignments', label: 'Assign delegates' })
  }
  items.push({ key: 'received', label: 'Delegate for' }, { key: 'history', label: 'History' })
  return items
})

const activeTab = ref<TabKey>('received')
const tabTouched = ref(false)

watch(
  () => [session.canManageDelegation, session.canManageTeamDelegation] as const,
  ([canGrantOwn, canAssignTeam]) => {
    if (tabTouched.value) {
      if (activeTab.value === 'granted' && !canGrantOwn) activeTab.value = 'received'
      if (activeTab.value === 'assignments' && !canAssignTeam) {
        activeTab.value = canGrantOwn ? 'granted' : 'received'
      }
      return
    }
    activeTab.value = canGrantOwn ? 'granted' : 'received'
  },
  { immediate: true },
)

function selectTab(tab: TabKey) {
  tabTouched.value = true
  activeTab.value = tab
}
</script>

<template>
  <div class="grid gap-4">
    <TabStrip :tabs="tabs" :model-value="activeTab" @update:model-value="selectTab" />

    <div
      v-if="activeTab === 'granted' && session.canManageDelegation"
      class="grid items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
    >
      <Card>
        <CardHeader>
          <CardTitle>Grant access</CardTitle>
          <CardDescription>
            Delegate every position you occupy. Each position is covered as a whole, including
            every role on it. Chain delegation is not allowed.
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <Alert v-if="isIncomingDelegate" variant="warning">
            <TriangleAlert />
            <AlertTitle>Granting is blocked</AlertTitle>
            <AlertDescription>
              You cannot delegate a position while you are a delegate for someone else.
            </AlertDescription>
          </Alert>
          <form v-else class="grid gap-4" @submit.prevent="grant">
            <p v-if="ownPositionsLabel" class="text-xs text-muted-foreground">
              Delegating {{ ownPositionsLabel }}
            </p>
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
              <p v-if="errors.validUntil" class="text-xs text-destructive">
                {{ errors.validUntil }}
              </p>
              <p class="text-xs text-muted-foreground">Leave blank for ongoing access.</p>
            </div>
            <div>
              <Button type="submit" :loading="createDelegation.isPending.value" :disabled="!seatOptions.length">
                Grant access
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My delegates</CardTitle>
          <CardDescription>Open delegations. Revoke to end one immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <ListLoading v-if="grantedLoading" />
          <div v-else class="min-w-0 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delegate</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Operated at</TableHead>
                  <TableHead class="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="row in grantedOpen" :key="row.id">
                  <TableCell>
                    <div class="font-medium">{{ row.delegateName || row.delegateCcgid }}</div>
                    <div class="font-mono text-xs text-muted-foreground">{{ row.delegateCcgid }}</div>
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ delegationPeriodLabel(row) }}
                  </TableCell>
                  <TableCell>
                    <StatusBadge :status="statusLabel(row.status)" />
                  </TableCell>
                  <TableCell>
                    <div class="font-medium">{{ row.assignedByName || row.assignedByCcgid || '—' }}</div>
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
                <TableRow v-if="!grantedOpen.length">
                  <TableCell colspan="6" class="h-20 text-center text-muted-foreground">
                    No one can act for you right now.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

    <TeamAssignments v-else-if="activeTab === 'assignments' && session.canManageTeamDelegation" />

    <Card v-else-if="activeTab === 'received'">
      <CardHeader>
        <CardTitle>Delegate for</CardTitle>
        <CardDescription>
          Positions and people you can act for. You stay signed in as yourself.
        </CardDescription>
      </CardHeader>
        <CardContent>
        <ListLoading v-if="receivedLoading" />
        <div v-else class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delegation</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Operated at</TableHead>
                <TableHead class="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in receivedOpen" :key="row.id">
                <TableCell>
                  <div class="font-medium">{{ positionCoverageLabel(row) }}</div>
                  <div v-if="!row.subjectPositionId" class="font-mono text-xs text-muted-foreground">
                    {{ row.delegatorCcgid }}
                  </div>
                </TableCell>
                <TableCell class="text-sm">
                  {{ delegationPeriodLabel(row) }}
                </TableCell>
                <TableCell>
                  <StatusBadge :status="statusLabel(row.status)" />
                </TableCell>
                <TableCell>
                  <div class="font-medium">{{ row.assignedByName || row.assignedByCcgid || '—' }}</div>
                  <div v-if="row.assignedByCcgid" class="font-mono text-xs text-muted-foreground">
                    {{ row.assignedByCcgid }}
                  </div>
                </TableCell>
                <TableCell class="text-sm">
                  {{ formatInstantForCenter(row.createdAt, row.delegatorCenter) }}
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    class="h-auto px-0"
                    @click="switchIdentity(row.id)"
                  >
                    Delegate for {{ positionCoverageLabel(row) }}
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!receivedOpen.length">
                  <TableCell colspan="6" class="h-20 text-center text-muted-foreground">
                  Nobody has made you a delegate.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <Card v-else-if="activeTab === 'history'">
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Ended authorizations. Actions taken stay on the documents.</CardDescription>
      </CardHeader>
        <CardContent>
        <ListLoading v-if="historyLoading" />
        <div v-else class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delegator</TableHead>
                <TableHead>Delegate</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ended</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in history" :key="row.id">
                <TableCell>{{ row.delegatorName || row.delegatorCcgid }}</TableCell>
                <TableCell>{{ row.delegateName || row.delegateCcgid }}</TableCell>
                <TableCell class="text-sm">
                  {{ delegationPeriodLabel(row) }}
                </TableCell>
                <TableCell>
                  <StatusBadge :status="statusLabel(row.status)" />
                </TableCell>
                <TableCell>{{ formatInstantForCenter(row.endedAt, row.delegatorCenter) }}</TableCell>
              </TableRow>
              <TableRow v-if="!history.length">
                <TableCell colspan="5" class="h-20 text-center text-muted-foreground">
                  No ended delegations yet.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="revokeOpen"
      title="Revoke delegation"
      :description="revokeTarget
        ? `${revokeTarget.delegateName || revokeTarget.delegateCcgid} will lose access immediately.`
        : ''"
      confirm-label="Revoke"
      :pending="revokeDelegation.isPending.value"
      @confirm="onRevoke"
    />
  </div>
</template>
