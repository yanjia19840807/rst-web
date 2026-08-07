<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useTmsSessionMutations } from '../api/mutations'
import { useTmsSessionsQuery } from '../api/queries'
import TmsSessionFilters from './TmsSessionFilters.vue'
import TmsSessionsTable from './TmsSessionsTable.vue'

const filters = reactive({
  status: 'completed' as const,
  query: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  pageSize: 10,
})
const queryFilters = computed(() => ({ ...filters }))
const sessionsQuery = useTmsSessionsQuery(queryFilters)
const { discard } = useTmsSessionMutations()
const deletingId = ref('')
const deleteTargetId = ref('')
const deleteOpen = ref(false)

watch(
  () => [filters.query, filters.dateFrom, filters.dateTo],
  () => {
    filters.page = 1
  },
)

function clearFilters() {
  filters.query = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.page = 1
}

function openDelete(id: string) {
  deleteTargetId.value = id
  deleteOpen.value = true
}

async function confirmDelete(reason: string) {
  deletingId.value = deleteTargetId.value
  try {
    await discard.mutateAsync({ id: deleteTargetId.value, reason })
    deleteOpen.value = false
    toast.success('TMS session deleted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not delete the session.')
  } finally {
    deletingId.value = ''
  }
}
</script>

<template>
  <Card>
    <CardHeader class="items-baseline">
      <div class="flex items-baseline gap-2">
        <CardTitle>My TMS Sessions</CardTitle>
        <span class="text-xs text-muted-foreground">
          {{ sessionsQuery.data.value?.total ?? 0 }} records
        </span>
      </div>
      <CardAction v-if="filters.query || filters.dateFrom || filters.dateTo">
        <Button variant="ghost" size="sm" class="text-primary" @click="clearFilters">
          Clear All
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent class="grid gap-4">
      <TmsSessionFilters
        v-model:query="filters.query"
        v-model:date-from="filters.dateFrom"
        v-model:date-to="filters.dateTo"
        @clear="clearFilters"
      />

      <TmsSessionsTable
        :sessions="sessionsQuery.data.value?.items ?? []"
        :pending="sessionsQuery.isPending.value"
        :deleting-id="deletingId"
        @delete="openDelete"
      />

      <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label class="flex items-center gap-2 text-muted-foreground">
          Rows per page
          <select
            v-model.number="filters.pageSize"
            class="h-8 rounded-lg border border-input bg-background px-2 text-foreground"
            @change="filters.page = 1"
          >
            <option v-for="size in [10, 20, 50, 100]" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </label>

        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" :disabled="filters.page <= 1" @click="filters.page--">
            Previous
          </Button>
          <span class="text-xs text-muted-foreground">
            Page {{ sessionsQuery.data.value?.page ?? 1 }} of
            {{ sessionsQuery.data.value?.totalPages ?? 1 }}
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="filters.page >= (sessionsQuery.data.value?.totalPages ?? 1)"
            @click="filters.page++"
          >
            Next
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>

  <ConfirmDialog
    v-model:open="deleteOpen"
    title="Delete Session"
    warning="This will discard the completed timing session from the list."
    :rows="[{ label: 'Session No', value: deleteTargetId, strong: true }]"
    confirm-label="Delete"
    require-reason
    reason-label="Reason"
    reason-placeholder="Reason for deleting this session"
    :pending="Boolean(deletingId)"
    @confirm="confirmDelete"
  />
</template>
