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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { formatDateTime } from '@/lib/datetime'

import { useCreateDelegation, useRevokeDelegation } from '../api/mutations'
import { useGrantedDelegationsQuery, useReceivedDelegationsQuery } from '../api/queries'
import {
  emptyGrantDelegationForm,
  grantDelegationSchema,
  toCreateDelegationRequest,
} from '../schemas/grantDelegation'
import { isOpenDelegation, type Delegation } from '../types'
import DelegateSelect from './DelegateSelect.vue'

const session = useSessionStore()
const router = useRouter()
const grantedQuery = useGrantedDelegationsQuery(() => session.canManageDelegation)
const receivedQuery = useReceivedDelegationsQuery()
const isIncomingDelegate = computed(() =>
  (receivedQuery.data.value ?? []).some(isOpenDelegation),
)
const canGrant = computed(() => session.canManageDelegation && !isIncomingDelegate.value)
const createDelegation = useCreateDelegation()
const revokeDelegation = useRevokeDelegation()
const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: toTypedSchema(grantDelegationSchema),
  initialValues: emptyGrantDelegationForm(),
  validateOnMount: false,
})
const [delegateCcgid] = defineField('delegateCcgid')
const [validFrom] = defineField('validFrom')
const [validUntil] = defineField('validUntil')
const revokeOpen = ref(false)
const revokeTarget = ref<Delegation | null>(null)

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
    toast.error('You cannot grant a delegation while someone has authorized you to act for them.')
    return
  }
  try {
    await createDelegation.mutateAsync(toCreateDelegationRequest(formValues))
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

type TabKey = 'granted' | 'received' | 'history'

const tabs = computed(() => {
  const items: { key: TabKey; label: string }[] = []
  if (session.canManageDelegation) {
    items.push({ key: 'granted', label: 'People who can act for me' })
  }
  items.push({ key: 'received', label: 'Act on behalf of' }, { key: 'history', label: 'History' })
  return items
})

const activeTab = ref<TabKey>('received')
const tabTouched = ref(false)

watch(
  () => session.canManageDelegation,
  (can) => {
    if (tabTouched.value) {
      if (!can && activeTab.value === 'granted') activeTab.value = 'received'
      return
    }
    activeTab.value = can ? 'granted' : 'received'
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
    <div class="flex gap-1 border-b">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="border-b-2 px-3.5 py-2 text-sm transition-colors"
        :class="
          activeTab === tab.key
            ? 'border-primary font-semibold text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        "
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="activeTab === 'granted' && session.canManageDelegation"
      class="grid items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
    >
      <Card>
        <CardHeader>
          <CardTitle>Grant access</CardTitle>
          <CardDescription>
            Grant a colleague your RST access for a limited period. They sign in as themselves, then
            choose Act as. Chain delegation is not allowed.
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <Alert v-if="isIncomingDelegate" variant="warning">
            <TriangleAlert />
            <AlertTitle>Granting is blocked</AlertTitle>
            <AlertDescription>
              You cannot grant access while someone has authorized you to act for them.
            </AlertDescription>
          </Alert>
          <form v-else class="grid gap-4" @submit.prevent="grant">
            <div class="grid gap-1.5">
              <Label>Delegate</Label>
              <DelegateSelect v-model="delegateCcgid" :invalid="Boolean(errors.delegateCcgid)" />
              <p v-if="errors.delegateCcgid" class="text-xs text-destructive">
                {{ errors.delegateCcgid }}
              </p>
            </div>
            <div class="grid gap-1.5">
              <Label>From</Label>
              <DatePicker
                v-model="validFrom"
                aria-label="Choose start date"
                placeholder="From"
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
                placeholder="Until"
                class="w-full"
                :invalid="Boolean(errors.validUntil)"
              />
              <p v-if="errors.validUntil" class="text-xs text-destructive">
                {{ errors.validUntil }}
              </p>
            </div>
            <div>
              <Button type="submit" :disabled="createDelegation.isPending.value">
                Grant access
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People who can act for me</CardTitle>
          <CardDescription>Open grants. Revoke to end access immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delegate</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
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
                    {{ formatDateTime(row.validFrom) }} – {{ formatDateTime(row.validUntil) }}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{{ statusLabel(row.status) }}</Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <Button type="button" variant="destructive" size="sm" @click="requestRevoke(row)">
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow v-if="!grantedOpen.length">
                  <TableCell colspan="4" class="h-20 text-center text-muted-foreground">
                    No one can act for you right now.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card v-else-if="activeTab === 'received'">
      <CardHeader>
        <CardTitle>Act on behalf of</CardTitle>
        <CardDescription>
          People who granted you access. You stay signed in as yourself.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delegator</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in receivedOpen" :key="row.id">
                <TableCell>
                  <div class="font-medium">{{ row.delegatorName || row.delegatorCcgid }}</div>
                  <div class="font-mono text-xs text-muted-foreground">{{ row.delegatorCcgid }}</div>
                </TableCell>
                <TableCell class="text-sm">
                  {{ formatDateTime(row.validFrom) }} – {{ formatDateTime(row.validUntil) }}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{{ statusLabel(row.status) }}</Badge>
                </TableCell>
                <TableCell class="text-right">
                  <Button type="button" size="sm" @click="switchIdentity(row.id)">
                    Act as {{ row.delegatorName || row.delegatorCcgid }}
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!receivedOpen.length">
                <TableCell colspan="4" class="h-20 text-center text-muted-foreground">
                  Nobody has authorized you to act for them.
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
        <div class="overflow-x-auto rounded-lg border">
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
                  {{ formatDateTime(row.validFrom) }} – {{ formatDateTime(row.validUntil) }}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{{ statusLabel(row.status) }}</Badge>
                </TableCell>
                <TableCell>{{ formatDateTime(row.endedAt) }}</TableCell>
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
