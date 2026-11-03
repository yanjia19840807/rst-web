<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import TableTextLink from '@/components/TableTextLink.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { geographyApi } from '../api'
import { geographyQueryKeys, useClusterQuery, useRegionAdminQuery } from '../api/queries'
import { assignmentConflict } from '../assignment'
import type { GeoGroup } from '../types'

const props = defineProps<{
  mode: 'region' | 'cluster'
}>()

const isRegion = computed(() => props.mode === 'region')
const kind = computed(() => (isRegion.value ? 'region' : 'cluster'))
const noun = computed(() => (isRegion.value ? 'Region' : 'Cluster'))
const regionQuery = useRegionAdminQuery(isRegion)
const clusterQuery = useClusterQuery(computed(() => !isRegion.value))
const pageQuery = computed(() => (isRegion.value ? regionQuery : clusterQuery))
const countries = computed(() => pageQuery.value.data.value?.countries ?? [])
const groups = computed(() => pageQuery.value.data.value?.groups ?? [])
const loading = computed(() => pageQuery.value.isPending.value && !pageQuery.value.data.value)

const queryClient = useQueryClient()
const adding = ref(false)
const editingId = ref<string | null>(null)
const draftName = ref('')
const draftCountries = ref<string[]>([])
const nameInvalid = ref(false)
const saving = ref(false)
const deleteOpen = ref(false)
const pendingDelete = ref<GeoGroup | null>(null)
const formLocked = computed(() => adding.value || editingId.value != null)

watch(
  () => pageQuery.value.isError.value,
  (isError) => {
    if (!isError) return
    const error = pageQuery.value.error.value
    toast.error(error instanceof Error ? error.message : `Could not load ${noun.value}s.`)
  },
)

function startAdd() {
  if (formLocked.value || saving.value) return
  editingId.value = null
  draftName.value = ''
  draftCountries.value = []
  nameInvalid.value = false
  adding.value = true
}

function cancelAdd() {
  adding.value = false
  draftName.value = ''
  draftCountries.value = []
  nameInvalid.value = false
}

function startEdit(group: GeoGroup) {
  if (formLocked.value || saving.value) return
  adding.value = false
  editingId.value = group.id
  draftName.value = group.name
  draftCountries.value = [...group.countries]
  nameInvalid.value = false
}

function cancelEdit() {
  editingId.value = null
  draftName.value = ''
  draftCountries.value = []
  nameInvalid.value = false
}

function draftBody() {
  const name = draftName.value.trim()
  nameInvalid.value = !name
  if (!name) {
    toast.error(`${noun.value} name is required.`)
    return null
  }
  if (!draftCountries.value.length) {
    toast.error('Select at least one customer country.')
    return null
  }
  const conflict = assignmentConflict(groups.value, editingId.value, draftCountries.value, kind.value)
  if (conflict) {
    toast.error(conflict)
    return null
  }
  return { name, countries: [...draftCountries.value] }
}

async function confirmAdd() {
  const body = draftBody()
  if (!body || saving.value) return
  saving.value = true
  try {
    if (isRegion.value) await geographyApi.createRegion(body)
    else await geographyApi.createCluster(body)
    await queryClient.invalidateQueries({ queryKey: geographyQueryKeys.all })
    toast.success(`${noun.value} added.`)
    cancelAdd()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : `Could not save the ${noun.value}.`)
  } finally {
    saving.value = false
  }
}

async function confirmEdit() {
  const id = editingId.value
  const body = draftBody()
  if (!id || !body || saving.value) return
  saving.value = true
  try {
    if (isRegion.value) await geographyApi.updateRegion(id, body)
    else await geographyApi.updateCluster(id, body)
    await queryClient.invalidateQueries({ queryKey: geographyQueryKeys.all })
    toast.success(`${noun.value} saved.`)
    cancelEdit()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : `Could not save the ${noun.value}.`)
  } finally {
    saving.value = false
  }
}

function requestDelete(group: GeoGroup) {
  if (formLocked.value || saving.value) return
  pendingDelete.value = group
  deleteOpen.value = true
}

async function confirmDelete() {
  const group = pendingDelete.value
  if (!group || saving.value) return
  saving.value = true
  try {
    if (isRegion.value) await geographyApi.deleteRegion(group.id)
    else await geographyApi.deleteCluster(group.id)
    await queryClient.invalidateQueries({ queryKey: geographyQueryKeys.all })
    toast.success(`${noun.value} deleted.`)
    deleteOpen.value = false
    pendingDelete.value = null
    if (editingId.value === group.id) cancelEdit()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : `Could not delete the ${noun.value}.`)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="grid gap-4">
    <PageActions>
      <Button :disabled="formLocked || saving" @click="startAdd">
        {{ isRegion ? 'Add region' : 'Add cluster' }}
      </Button>
    </PageActions>

    <Card>
      <CardContent>
        <ListLoading v-if="loading" />
        <div v-else class="min-w-0 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Customer Countries</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody v-if="adding">
              <TableRow class="bg-muted/30">
                <TableCell>
                  <Input
                    v-model="draftName"
                    maxlength="120"
                    placeholder="Name"
                    :disabled="saving"
                    :aria-invalid="nameInvalid"
                    @keydown.enter.prevent="confirmAdd"
                  />
                </TableCell>
                <TableCell>
                  <MultiSelect
                    v-model="draftCountries"
                    class="min-w-[240px]"
                    :options="countries"
                    :disabled="saving"
                    placeholder="Select countries"
                    empty-text="No customer countries yet."
                  />
                </TableCell>
                <TableCell>
                  <span class="inline-flex gap-3">
                    <TableTextLink :disabled="saving" @click="confirmAdd">
                      {{ saving ? 'Saving…' : 'Confirm' }}
                    </TableTextLink>
                    <TableTextLink :disabled="saving" @click="cancelAdd">Cancel</TableTextLink>
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
            <TableBody>
              <TableRow
                v-for="group in groups"
                :key="group.id"
                :class="editingId === group.id ? 'bg-muted/30' : undefined"
              >
                <template v-if="editingId === group.id">
                  <TableCell>
                    <Input
                      v-model="draftName"
                      maxlength="120"
                      placeholder="Name"
                      :disabled="saving"
                      :aria-invalid="nameInvalid"
                      @keydown.enter.prevent="confirmEdit"
                    />
                  </TableCell>
                  <TableCell>
                    <MultiSelect
                      v-model="draftCountries"
                      class="min-w-[240px]"
                      :options="countries"
                      :disabled="saving"
                      placeholder="Select countries"
                      empty-text="No customer countries yet."
                    />
                  </TableCell>
                  <TableCell>
                    <span class="inline-flex gap-3">
                      <TableTextLink :disabled="saving" @click="confirmEdit">
                        {{ saving ? 'Saving…' : 'Confirm' }}
                      </TableTextLink>
                      <TableTextLink :disabled="saving" @click="cancelEdit">Cancel</TableTextLink>
                    </span>
                  </TableCell>
                </template>
                <template v-else>
                  <TableCell class="font-medium">{{ group.name }}</TableCell>
                  <TableCell>{{ group.countries.join(', ') }}</TableCell>
                  <TableCell>
                    <span class="inline-flex flex-wrap gap-3">
                      <TableTextLink :disabled="saving || formLocked" @click="startEdit(group)">
                        Edit
                      </TableTextLink>
                      <TableTextLink
                        destructive
                        :disabled="saving || formLocked"
                        @click="requestDelete(group)"
                      >
                        Delete
                      </TableTextLink>
                    </span>
                  </TableCell>
                </template>
              </TableRow>
              <TableRow v-if="!groups.length && !adding">
                <TableCell colspan="3" class="h-20 text-center text-sm text-muted-foreground italic">
                  {{
                    isRegion
                      ? 'No regions yet — click "Add region" to begin.'
                      : 'No clusters yet — click "Add cluster" to begin.'
                  }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="isRegion ? 'Delete this region?' : 'Delete this cluster?'"
      description="Report filters that use this name will no longer match it."
      confirm-label="Delete"
      :rows="pendingDelete ? [{ label: noun, value: pendingDelete.name, strong: true }] : []"
      :pending="saving"
      @confirm="confirmDelete"
    />
  </div>
</template>
