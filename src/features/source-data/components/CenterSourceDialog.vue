<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useQueryClient } from '@tanstack/vue-query'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ListLoading from '@/components/ListLoading.vue'

import { sourceDataApi } from '../api'
import { sourceDataQueryKeys, useCenterSourcesQuery } from '../queries'
import type { CenterSourceMode } from '../types'

const open = defineModel<boolean>('open', { default: false })

const queryClient = useQueryClient()
const centersQuery = useCenterSourcesQuery()
const drafts = ref<Record<string, CenterSourceMode>>({})
const saving = ref(false)

const rows = computed(() => centersQuery.data.value ?? [])
const dirty = computed(() =>
  rows.value.some((row) => drafts.value[row.center] && drafts.value[row.center] !== row.mode),
)

watch(
  [open, () => centersQuery.data.value],
  () => {
    if (!open.value) return
    const next: Record<string, CenterSourceMode> = {}
    for (const row of centersQuery.data.value ?? []) next[row.center] = row.mode
    drafts.value = next
  },
  { immediate: true },
)

async function save() {
  if (saving.value || !dirty.value) return
  saving.value = true
  try {
    for (const row of rows.value) {
      const mode = drafts.value[row.center]
      if (!mode || mode === row.mode) continue
      await sourceDataApi.updateCenter(row.center, mode)
    }
    await queryClient.invalidateQueries({ queryKey: sourceDataQueryKeys.all })
    toast.success('Center source saved.')
    open.value = false
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save center source.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-5 py-4">
        <DialogTitle>Center source</DialogTitle>
        <DialogDescription>
          This setting decides which source each center uses: Timesheet or MyHR + SKPI.
        </DialogDescription>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
        <ListLoading v-if="centersQuery.isPending.value && !rows.length" />
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Center</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in rows" :key="row.center">
              <TableCell class="font-medium">{{ row.center }}</TableCell>
              <TableCell>
                <NativeSelect
                  :model-value="drafts[row.center] ?? row.mode"
                  class="w-[180px]"
                  @update:model-value="drafts[row.center] = String($event) as CenterSourceMode"
                >
                  <option value="TIMESHEET">Timesheet</option>
                  <option value="MYHR_SKPI">MyHR + SKPI</option>
                </NativeSelect>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3 sm:items-center">
        <p class="text-left text-sm text-muted-foreground sm:mr-auto sm:max-w-xs">
          Changing a center's source does not delete data already uploaded from the other source.
        </p>
        <Button type="button" variant="outline" :disabled="saving" @click="open = false">
          Cancel
        </Button>
        <Button type="button" :loading="saving" :disabled="!dirty" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
