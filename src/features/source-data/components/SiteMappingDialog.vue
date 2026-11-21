<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useQueryClient } from '@tanstack/vue-query'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import TableTextLink from '@/components/TableTextLink.vue'
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
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { sourceDataApi } from '../api'
import { sourceDataQueryKeys, useCenterSourcesQuery, useSiteMappingsQuery } from '../queries'
import type { SiteMapping } from '../types'

const open = defineModel<boolean>('open', { default: false })

const queryClient = useQueryClient()
const sitesQuery = useSiteMappingsQuery(() => open.value)
const centersQuery = useCenterSourcesQuery()
const draft = reactive({ gbsSite: '', siteCode: '', center: '' })
const adding = ref(false)
const editingKey = ref<string | null>(null)
const saving = ref(false)
const deleteTarget = ref<SiteMapping | null>(null)
const deleting = ref(false)

const rows = computed(() => sitesQuery.data.value ?? [])
const centers = computed(() => centersQuery.data.value ?? [])
const formLocked = computed(() => adding.value || editingKey.value != null)

watch(open, (isOpen) => {
  if (!isOpen) cancelForm()
})

function clearDraft() {
  draft.gbsSite = ''
  draft.siteCode = ''
  draft.center = ''
}

function cancelForm() {
  adding.value = false
  editingKey.value = null
  clearDraft()
}

function startAdd() {
  if (formLocked.value || saving.value) return
  clearDraft()
  adding.value = true
}

function startEdit(row: SiteMapping) {
  if (formLocked.value || saving.value) return
  editingKey.value = row.gbsSite
  draft.gbsSite = row.gbsSite
  draft.siteCode = row.siteCode
  draft.center = row.center
}

async function confirmSave() {
  if (saving.value) return
  const gbsSite = (editingKey.value ?? draft.gbsSite).trim()
  saving.value = true
  try {
    await sourceDataApi.saveSite({
      gbsSite,
      siteCode: draft.siteCode.trim(),
      center: draft.center,
    })
    await queryClient.invalidateQueries({ queryKey: sourceDataQueryKeys.sites })
    toast.success('Site mapping saved. Upload SKPI again to apply it.')
    cancelForm()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save site mapping.')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  const row = deleteTarget.value
  if (!row || deleting.value) return
  deleting.value = true
  try {
    await sourceDataApi.deleteSite(row.gbsSite)
    await queryClient.invalidateQueries({ queryKey: sourceDataQueryKeys.sites })
    deleteTarget.value = null
    toast.success('Site mapping deleted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not delete site mapping.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-5 py-4">
        <DialogTitle>Site mapping</DialogTitle>
        <DialogDescription>
          Maps a SKPI office to the 5-character site code used by Timesheet. Offices that share a
          code are summed together on import. Upload SKPI again after a change.
        </DialogDescription>
      </DialogHeader>
      <div class="grid min-h-0 flex-1 gap-3 overflow-auto px-5 py-4">
        <div class="flex justify-end">
          <Button type="button" variant="outline" :disabled="formLocked || saving" @click="startAdd">
            Add row
          </Button>
        </div>
        <ListLoading v-if="sitesQuery.isPending.value && !rows.length && !adding" />
        <div v-else class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GBS site</TableHead>
                <TableHead>Site code</TableHead>
                <TableHead>Center</TableHead>
                <TableHead class="w-36 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="adding" class="bg-muted/30">
                <TableCell>
                  <Input
                    v-model="draft.gbsSite"
                    maxlength="80"
                    placeholder="CHENNAI-1"
                    :disabled="saving"
                    @keydown.enter.prevent="confirmSave"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    v-model="draft.siteCode"
                    maxlength="5"
                    placeholder="INMAA"
                    :disabled="saving"
                    @keydown.enter.prevent="confirmSave"
                  />
                </TableCell>
                <TableCell>
                  <NativeSelect
                    :model-value="draft.center"
                    class="w-full"
                    :disabled="saving"
                    @update:model-value="draft.center = String($event ?? '')"
                  >
                    <option value="">Select center</option>
                    <option v-for="item in centers" :key="item.center" :value="item.center">
                      {{ item.center }}
                    </option>
                  </NativeSelect>
                </TableCell>
                <TableCell class="text-right">
                  <span class="inline-flex gap-3">
                    <TableTextLink :disabled="saving" @click="confirmSave">
                      {{ saving ? 'Saving…' : 'Confirm' }}
                    </TableTextLink>
                    <TableTextLink :disabled="saving" @click="cancelForm">Cancel</TableTextLink>
                  </span>
                </TableCell>
              </TableRow>
              <TableRow
                v-for="row in rows"
                :key="row.gbsSite"
                :class="editingKey === row.gbsSite ? 'bg-muted/30' : undefined"
              >
                <template v-if="editingKey === row.gbsSite">
                  <TableCell class="font-medium">{{ row.gbsSite }}</TableCell>
                  <TableCell>
                    <Input
                      v-model="draft.siteCode"
                      maxlength="5"
                      placeholder="INMAA"
                      :disabled="saving"
                      @keydown.enter.prevent="confirmSave"
                    />
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      :model-value="draft.center"
                      class="w-full"
                      :disabled="saving"
                      @update:model-value="draft.center = String($event ?? '')"
                    >
                      <option value="">Select center</option>
                      <option v-for="item in centers" :key="item.center" :value="item.center">
                        {{ item.center }}
                      </option>
                    </NativeSelect>
                  </TableCell>
                  <TableCell class="text-right">
                    <span class="inline-flex gap-3">
                      <TableTextLink :disabled="saving" @click="confirmSave">
                        {{ saving ? 'Saving…' : 'Confirm' }}
                      </TableTextLink>
                      <TableTextLink :disabled="saving" @click="cancelForm">Cancel</TableTextLink>
                    </span>
                  </TableCell>
                </template>
                <template v-else>
                  <TableCell class="font-medium">{{ row.gbsSite }}</TableCell>
                  <TableCell>{{ row.siteCode }}</TableCell>
                  <TableCell>{{ row.center }}</TableCell>
                  <TableCell class="text-right">
                    <span class="inline-flex gap-3">
                      <TableTextLink :disabled="saving || formLocked" @click="startEdit(row)">
                        Edit
                      </TableTextLink>
                      <TableTextLink
                        destructive
                        :disabled="saving || formLocked"
                        @click="deleteTarget = row"
                      >
                        Delete
                      </TableTextLink>
                    </span>
                  </TableCell>
                </template>
              </TableRow>
              <TableRow v-if="!rows.length && !adding">
                <TableCell colspan="4" class="h-20 text-center text-sm text-muted-foreground italic">
                  No site mappings yet — click "Add row" to begin.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button type="button" variant="outline" @click="open = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    :open="deleteTarget != null"
    title="Delete site mapping?"
    :description="
      deleteTarget
        ? `Remove ${deleteTarget.gbsSite}. The next SKPI upload will skip that office until it is mapped again.`
        : ''
    "
    confirm-label="Delete"
    confirm-variant="destructive"
    :pending="deleting"
    @update:open="(value) => { if (!value) deleteTarget = null }"
    @confirm="confirmDelete"
  />
</template>
