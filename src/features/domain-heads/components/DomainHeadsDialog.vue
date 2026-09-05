<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSessionStore } from '@/auth/session'

import { useSaveDomainHeads } from '../api/mutations'
import { useDomainHeadCentersQuery, useDomainHeadsQuery } from '../api/queries'
import type { DomainHeadStatus } from '../types'
import ApproverSelect from './ApproverSelect.vue'

const open = defineModel<boolean>('open', { default: false })

const session = useSessionStore()
const saveMutation = useSaveDomainHeads()

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

/** LTH (including LTH+ADMIN) uses identity Center; pure ADMIN picks from ACTIVE Person/Scope. */
const usesAdminPicker = computed(
  () => session.roles.includes('ADMIN') && !session.roles.includes('LTH'),
)

const selectedCenter = ref('')
const pendingCenter = ref<string | null>(null)
const drafts = ref<Record<string, string | null>>({})
const domainFilter = ref('')
const confirmSaveOpen = ref(false)
const confirmSwitchOpen = ref(false)

const centersQuery = useDomainHeadCentersQuery(() => open.value && usesAdminPicker.value)

const queryCenter = computed(() => {
  if (usesAdminPicker.value) return selectedCenter.value.trim() || undefined
  return undefined
})

const pageQuery = useDomainHeadsQuery(queryCenter, () => open.value && (!usesAdminPicker.value || Boolean(selectedCenter.value.trim())))

const page = computed(() => {
  if (usesAdminPicker.value && !selectedCenter.value.trim()) return undefined
  return pageQuery.data.value
})
const loading = computed(
  () =>
    Boolean(selectedCenter.value.trim() || !usesAdminPicker.value) &&
    pageQuery.isPending.value &&
    !pageQuery.data.value,
)
const centers = computed(() => centersQuery.data.value ?? [])

const center = computed(() => {
  if (usesAdminPicker.value) return selectedCenter.value.trim()
  return page.value?.center || session.user?.center || ''
})

const rows = computed(() => {
  const items = page.value?.domains ?? []
  const needle = domainFilter.value.trim().toLowerCase()
  return needle
    ? items.filter((row) => row.domain.toLowerCase().includes(needle))
    : items
})

const dirtyMappings = computed(() => {
  if (!page.value) return []
  return page.value.domains
    .filter((row) => {
      const draft = drafts.value[row.domain]
      const next = draft === undefined ? row.positionId : draft
      return next !== row.positionId
    })
    .map((row) => ({
      domain: row.domain,
      positionId: drafts.value[row.domain] === undefined ? null : drafts.value[row.domain],
    }))
})

const dirty = computed(() => dirtyMappings.value.length > 0)

watch(
  () => page.value,
  (value) => {
    if (!value) {
      drafts.value = {}
      return
    }
    const next: Record<string, string | null> = {}
    for (const row of value.domains) {
      next[row.domain] = row.positionId
    }
    drafts.value = next
  },
  { immediate: true },
)

watch(open, (isOpen) => {
  if (!isOpen) {
    domainFilter.value = ''
    confirmSaveOpen.value = false
    confirmSwitchOpen.value = false
    pendingCenter.value = null
    return
  }
  if (usesAdminPicker.value && !selectedCenter.value && centers.value.length === 1) {
    selectedCenter.value = centers.value[0] ?? ''
  }
})

watch(
  () => centersQuery.data.value,
  (list) => {
    if (!open.value || !usesAdminPicker.value || selectedCenter.value || !list?.length) return
    if (list.length === 1) selectedCenter.value = list[0] ?? ''
  },
)

watch(
  () => pageQuery.isError.value,
  (isError) => {
    if (isError && open.value) {
      toast.error(
        pageQuery.error.value instanceof Error
          ? pageQuery.error.value.message
          : 'Could not load Domain Head mappings.',
      )
    }
  },
)

function statusLabel(status: DomainHeadStatus) {
  if (status === 'CONFIGURED') return 'Configured'
  if (status === 'STALE') return 'Stale'
  return 'Missing'
}

function statusVariant(status: DomainHeadStatus) {
  if (status === 'CONFIGURED') return 'secondary' as const
  if (status === 'STALE') return 'outline' as const
  return 'destructive' as const
}

function emptyMessage() {
  if (usesAdminPicker.value && !selectedCenter.value.trim()) {
    return centers.value.length
      ? 'Select a Center to configure Domain Heads.'
      : 'No ACTIVE Person or Scope Center is available.'
  }
  if (!center.value) return 'Current identity has no Center.'
  if (page.value && !page.value.dailyAvailable) {
    return 'No ACTIVE Daily Timesheet snapshot is available.'
  }
  if (page.value && !page.value.monthlyAvailable) {
    return 'No ACTIVE Monthly Timesheet snapshot is available.'
  }
  return 'This Center has no GBS Domain in the ACTIVE Monthly Timesheet.'
}

function onCenterChange(event: Event) {
  const next = (event.target as HTMLSelectElement).value
  if (next === selectedCenter.value) return
  if (dirty.value) {
    pendingCenter.value = next
    confirmSwitchOpen.value = true
    ;(event.target as HTMLSelectElement).value = selectedCenter.value
    return
  }
  selectedCenter.value = next
}

function confirmSwitchCenter() {
  if (pendingCenter.value == null) return
  selectedCenter.value = pendingCenter.value
  pendingCenter.value = null
  confirmSwitchOpen.value = false
}

function askSave() {
  if (!dirty.value || saveMutation.isPending.value || !center.value) return
  confirmSaveOpen.value = true
}

async function confirmSave() {
  try {
    const result = await saveMutation.mutateAsync({
      center: usesAdminPicker.value ? center.value : undefined,
      mappings: dirtyMappings.value,
    })
    confirmSaveOpen.value = false
    const remounted = result.remountedCount ?? 0
    toast.success(
      remounted > 0
        ? `Saved. ${remounted} in-flight CDH review${remounted === 1 ? '' : 's'} remounted.`
        : 'Domain Head mappings saved.',
    )
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save Domain Head mappings.')
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-5 py-4">
        <DialogTitle>Domain Head</DialogTitle>
        <DialogDescription>
          Each GBS Domain can have one CDH approver. Saving remounts in-flight CDH reviews for
          changed Domains.
        </DialogDescription>
      </DialogHeader>

      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 py-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="grid gap-1.5 text-sm">
            <span class="text-muted-foreground">Center</span>
            <select
              v-if="usesAdminPicker"
              :value="selectedCenter"
              :class="[selectClass, 'w-[240px]']"
              @change="onCenterChange"
            >
              <option value="">Select center</option>
              <option v-for="item in centers" :key="item" :value="item">{{ item }}</option>
            </select>
            <div v-else class="font-medium">{{ center || '—' }}</div>
          </div>
          <Input
            v-if="page?.domains.length"
            v-model="domainFilter"
            placeholder="Search Domain"
            class="max-w-xs"
          />
        </div>

        <div class="min-h-0 flex-1 overflow-auto rounded-lg border bg-card p-4">
          <ListLoading v-if="usesAdminPicker && centersQuery.isPending.value && !centers.length" />
          <ListLoading v-else-if="loading" />
          <p
            v-else-if="!page?.domains.length"
            class="py-8 text-center text-sm text-muted-foreground"
          >
            {{ emptyMessage() }}
          </p>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead class="w-32">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in rows" :key="row.domain">
                <TableCell class="font-medium">{{ row.domain }}</TableCell>
                <TableCell>
                  <ApproverSelect
                    :model-value="drafts[row.domain] ?? null"
                    :center="center"
                    :fallback-name="row.name"
                    :fallback-position-id="row.positionId"
                    @update:model-value="drafts[row.domain] = $event"
                  />
                </TableCell>
                <TableCell>
                  <Badge :variant="statusVariant(row.status)">
                    {{ statusLabel(row.status) }}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button type="button" variant="outline" :disabled="saveMutation.isPending.value" @click="open = false">
          Cancel
        </Button>
        <Button
          type="button"
          :loading="saveMutation.isPending.value"
          :disabled="!dirty || !center"
          @click="askSave"
        >
          {{ saveMutation.isPending.value ? 'Saving…' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    v-model:open="confirmSaveOpen"
    title="Save Domain Head mappings?"
    description="In-flight CDH reviews for the Domains you changed will move to the new approver. Approved steps stay as they are."
    confirm-label="Save"
    confirm-variant="default"
    :pending="saveMutation.isPending.value"
    @confirm="confirmSave"
  />

  <ConfirmDialog
    v-model:open="confirmSwitchOpen"
    title="Discard unsaved changes?"
    description="Switching Center will discard your unsaved Domain Head edits."
    confirm-label="Discard"
    confirm-variant="destructive"
    @confirm="confirmSwitchCenter"
  />
</template>
