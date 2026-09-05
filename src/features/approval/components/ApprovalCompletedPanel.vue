<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { ApprovalWorkspaceView } from '../types'
import ApprovalHistoryTable from './ApprovalHistoryTable.vue'

defineProps<{
  workspace?: ApprovalWorkspaceView | null
  emptyMessage?: string
  pending?: boolean
}>()

function statusCaption(workspace: ApprovalWorkspaceView) {
  const bar = workspace.statusBar
  if (!bar) return ''
  return [bar.label, bar.step, bar.reviewer].filter(Boolean).join(' · ')
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">History</CardTitle>
      <CardDescription v-if="workspace && statusCaption(workspace)">
        {{ statusCaption(workspace) }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ApprovalHistoryTable
        :rows="workspace?.history ?? []"
        :empty-message="emptyMessage"
        :pending="pending"
      />
    </CardContent>
  </Card>
</template>
