<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { approvalApi } from '../api'
import type { ApprovalQueueItem } from '../types'

type TabKey = 'Awaiting Review' | 'Archived'

const router = useRouter()
const items = ref<ApprovalQueueItem[]>([])
const loading = ref(true)
const activeTab = ref<TabKey>('Awaiting Review')

const tabs: TabKey[] = ['Awaiting Review', 'Archived']

const filteredRows = computed(() => items.value)

async function load() {
  loading.value = true
  try {
    items.value = await approvalApi.queue({
      status: 'AWAITING',
      archived: activeTab.value === 'Archived',
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load approval queue.')
  } finally {
    loading.value = false
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function openReview(item: ApprovalQueueItem) {
  void router.push({
    name: 'approver-review',
    params: { submissionId: item.submissionId },
  })
}

function onTabChange(tab: TabKey) {
  activeTab.value = tab
  void load()
}

onMounted(load)
</script>

<template>
  <Card>
    <CardHeader class="gap-3">
      <div class="flex gap-1 border-b">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          class="border-b-2 px-3.5 py-2 text-sm transition-colors"
          :class="
            activeTab === tab
              ? 'border-primary font-semibold text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          "
          @click="onTabChange(tab)"
        >
          {{ tab }}
        </button>
      </div>
      <div class="flex items-center justify-between gap-2">
        <CardTitle class="text-base">Approval Queue</CardTitle>
        <span class="text-xs text-muted-foreground">{{ filteredRows.length }} records</span>
      </div>
    </CardHeader>
    <CardContent>
      <div class="overflow-x-auto rounded-lg border">
        <Table class="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Exercise</TableHead>
              <TableHead>Package Version</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Required Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead class="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in filteredRows" :key="item.submissionId">
              <TableCell class="font-semibold">{{ item.exerciseCode }}</TableCell>
              <TableCell>{{ item.packageVersion }}</TableCell>
              <TableCell>{{ item.currentStep ?? '—' }}</TableCell>
              <TableCell>{{ item.requiredRole }}</TableCell>
              <TableCell>{{ item.status }}</TableCell>
              <TableCell>{{ formatDate(item.submittedAt) }}</TableCell>
              <TableCell class="text-right">
                <Button size="sm" variant="outline" @click="openReview(item)">
                  {{ activeTab === 'Awaiting Review' ? 'Review' : 'Open' }}
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="!loading && !filteredRows.length">
              <TableCell colspan="7" class="h-24 text-center text-muted-foreground">
                No {{ activeTab }} submissions.
              </TableCell>
            </TableRow>
            <TableRow v-if="loading">
              <TableCell colspan="7" class="h-24 text-center text-muted-foreground">
                Loading approval queue…
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</template>
