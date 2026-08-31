<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useDomainHeadsQuery } from '../api/queries'
import type { DomainHeadStatus } from '../types'
import ApproverSelect from './ApproverSelect.vue'

const session = useSessionStore()
const pageQuery = useDomainHeadsQuery()
const saveMutation = useSaveDomainHeads()

const drafts = ref<Record<string, string | null>>({})
const domainFilter = ref('')
const confirmOpen = ref(false)

const page = computed(() => pageQuery.data.value)
const loading = computed(() => pageQuery.isPending.value && !pageQuery.data.value)
const center = computed(() => page.value?.center || session.user?.center || '')

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
    .filter((row) => (drafts.value[row.domain] ?? row.positionId) !== row.positionId)
    .map((row) => ({
      domain: row.domain,
      positionId: drafts.value[row.domain] ?? null,
    }))
})

const dirty = computed(() => dirtyMappings.value.length > 0)

watch(
  () => page.value,
  (value) => {
    if (!value) return
    const next: Record<string, string | null> = {}
    for (const row of value.domains) {
      next[row.domain] = row.positionId
    }
    drafts.value = next
  },
  { immediate: true },
)

watch(
  () => pageQuery.isError.value,
  (isError) => {
    if (isError) {
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
  if (!center.value) return 'Current identity has no Center.'
  if (page.value && !page.value.dailyAvailable) {
    return 'No ACTIVE Daily Timesheet snapshot is available.'
  }
  return 'This Center has no GBS Domain in the Daily Timesheet.'
}

function askSave() {
  if (!dirty.value || saveMutation.isPending.value) return
  confirmOpen.value = true
}

async function confirmSave() {
  try {
    const result = await saveMutation.mutateAsync({ mappings: dirtyMappings.value })
    confirmOpen.value = false
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
  <div class="grid gap-4">
    <PageActions>
      <Button :disabled="!dirty || saveMutation.isPending.value" @click="askSave">
        Save
      </Button>
    </PageActions>

    <Card>
      <CardHeader class="gap-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Domain Head</CardTitle>
            <p class="mt-1 text-sm text-muted-foreground">
              Center is taken from SSO. Each GBS Domain can have one approver.
              Saving remounts in-flight CDH reviews for changed Domains.
            </p>
          </div>
          <div class="text-sm">
            <span class="text-muted-foreground">Center</span>
            <div class="font-medium">{{ center || '—' }}</div>
          </div>
        </div>
        <Input
          v-if="page?.domains.length"
          v-model="domainFilter"
          placeholder="Search Domain"
          class="max-w-xs"
        />
      </CardHeader>
      <CardContent>
        <ListLoading v-if="loading" />
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
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="confirmOpen"
      title="Save Domain Head mappings?"
      description="In-flight CDH reviews for the Domains you changed will move to the new approver. Approved steps stay as they are."
      confirm-label="Save"
      confirm-variant="default"
      :pending="saveMutation.isPending.value"
      @confirm="confirmSave"
    />
  </div>
</template>
