<script setup lang="ts">
import { GripVertical } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TableTextLink from '@/components/TableTextLink.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  useCreateSupportCategory,
  useDeleteSupportCategory,
  useReorderSupportCategories,
  useUpdateSupportCategory,
} from '../api/mutations'
import { useSupportCategoryAdminQuery } from '../api/queries'
import type { SupportCategoryAdminRow } from '../types'

const pageQuery = useSupportCategoryAdminQuery()
const createMutation = useCreateSupportCategory()
const updateMutation = useUpdateSupportCategory()
const reorderMutation = useReorderSupportCategories()
const deleteMutation = useDeleteSupportCategory()

const adding = ref(false)
const editingId = ref<string | null>(null)
const draftName = ref('')
const nameInvalid = ref(false)
const disableOpen = ref(false)
const pendingDisable = ref<SupportCategoryAdminRow | null>(null)
const deleteOpen = ref(false)
const pendingDelete = ref<SupportCategoryAdminRow | null>(null)
const localRows = ref<SupportCategoryAdminRow[]>([])
const orderSnapshot = ref<string[]>([])

const loading = computed(() => pageQuery.isPending.value && !pageQuery.data.value)
const saving = computed(
  () =>
    createMutation.isPending.value ||
    updateMutation.isPending.value ||
    reorderMutation.isPending.value ||
    deleteMutation.isPending.value,
)
const formLocked = computed(() => adding.value || editingId.value != null)
const dragDisabled = computed(() => formLocked.value || saving.value || localRows.value.length < 2)

watch(
  () => pageQuery.data.value?.categories,
  (categories) => {
    localRows.value = (categories ?? []).map((row) => ({ ...row }))
    orderSnapshot.value = localRows.value.map((row) => row.id)
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
          : 'Could not load Support Categories.',
      )
    }
  },
)

function startAdd() {
  if (formLocked.value || saving.value) return
  editingId.value = null
  draftName.value = ''
  nameInvalid.value = false
  adding.value = true
}

function cancelAdd() {
  adding.value = false
  draftName.value = ''
  nameInvalid.value = false
}

function startEdit(row: SupportCategoryAdminRow) {
  if (formLocked.value || saving.value) return
  adding.value = false
  editingId.value = row.id
  draftName.value = row.name
  nameInvalid.value = false
}

function cancelEdit() {
  editingId.value = null
  draftName.value = ''
  nameInvalid.value = false
}

function trimmedName() {
  const name = draftName.value.trim()
  nameInvalid.value = !name
  return name
}

async function confirmAdd() {
  const name = trimmedName()
  if (!name || saving.value) return
  try {
    await createMutation.mutateAsync({ name })
    toast.success('Category added.')
    cancelAdd()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save the Category.')
  }
}

async function confirmEdit() {
  const row = localRows.value.find((item) => item.id === editingId.value)
  const name = trimmedName()
  if (!row || !name || saving.value) return
  if (await saveUpdate(row, { name })) {
    cancelEdit()
  }
}

function categoryStatusLabel(status: SupportCategoryAdminRow['status']) {
  return status === 'ACTIVE' ? 'Enabled' : 'Disabled'
}

function requestDisable(row: SupportCategoryAdminRow) {
  if (formLocked.value || saving.value) return
  pendingDisable.value = row
  disableOpen.value = true
}

async function confirmDisable() {
  const row = pendingDisable.value
  if (!row) return
  await saveUpdate(row, { status: 'INACTIVE' })
  disableOpen.value = false
  pendingDisable.value = null
}

async function enable(row: SupportCategoryAdminRow) {
  if (formLocked.value || saving.value) return
  await saveUpdate(row, { status: 'ACTIVE' })
}

function requestDelete(row: SupportCategoryAdminRow) {
  if (formLocked.value || saving.value) return
  pendingDelete.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  const row = pendingDelete.value
  if (!row || deleteMutation.isPending.value) return
  try {
    await deleteMutation.mutateAsync(row.id)
    toast.success('Category deleted.')
    deleteOpen.value = false
    pendingDelete.value = null
    if (editingId.value === row.id) cancelEdit()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not delete the Category.')
  }
}

async function onDragEnd() {
  const ids = localRows.value.map((row) => row.id)
  if (ids.join() === orderSnapshot.value.join()) return
  try {
    await reorderMutation.mutateAsync({ ids })
    toast.success('Category order saved.')
  } catch (error) {
    localRows.value = (pageQuery.data.value?.categories ?? []).map((row) => ({ ...row }))
    toast.error(error instanceof Error ? error.message : 'Could not save the Category order.')
  }
}

async function saveUpdate(
  row: SupportCategoryAdminRow,
  patch: Partial<Pick<SupportCategoryAdminRow, 'name' | 'status' | 'displayOrder'>>,
) {
  try {
    await updateMutation.mutateAsync({
      id: row.id,
      body: {
        name: patch.name ?? row.name,
        status: patch.status ?? row.status,
        displayOrder: patch.displayOrder ?? row.displayOrder,
      },
    })
    toast.success('Category saved.')
    return true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save the Category.')
    return false
  }
}
</script>

<template>
  <div class="grid gap-4">
    <PageActions>
      <Button :disabled="formLocked || saving" @click="startAdd">Add category</Button>
    </PageActions>

    <Card>
    <CardHeader>
      <CardDescription>
        Standard Production Support categories used in Workload Registry and Support Repository.
        Drag the handle to reorder. Disabled names stay on existing rows but are hidden from new
        selections.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ListLoading v-if="loading" />
      <div v-else class="min-w-0 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10" />
              <TableHead>Name</TableHead>
              <TableHead class="w-32">Status</TableHead>
              <TableHead class="w-24">Order</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody v-if="adding">
            <TableRow class="bg-muted/30">
              <TableCell />
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
                <StatusBadge status="Enabled" />
              </TableCell>
              <TableCell>—</TableCell>
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
          <VueDraggable
            v-model="localRows"
            tag="tbody"
            handle=".drag-handle"
            :animation="180"
            :disabled="dragDisabled"
            ghost-class="bg-muted/50"
            class="[&_tr:last-child]:border-0"
            @end="onDragEnd"
          >
            <TableRow
              v-for="row in localRows"
              :key="row.id"
              :class="editingId === row.id ? 'bg-muted/30' : undefined"
            >
              <TableCell class="w-10">
                <button
                  type="button"
                  class="drag-handle inline-flex size-8 items-center justify-center rounded-md text-muted-foreground"
                  :class="
                    dragDisabled
                      ? 'cursor-not-allowed opacity-40'
                      : 'cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing'
                  "
                  :disabled="dragDisabled"
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                >
                  <GripVertical class="size-4" />
                </button>
              </TableCell>
              <template v-if="editingId === row.id">
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
                  <StatusBadge :status="categoryStatusLabel(row.status)" />
                </TableCell>
                <TableCell>{{ row.displayOrder }}</TableCell>
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
                <TableCell class="font-medium">{{ row.name }}</TableCell>
                <TableCell>
                  <StatusBadge :status="categoryStatusLabel(row.status)" />
                </TableCell>
                <TableCell>{{ row.displayOrder }}</TableCell>
                <TableCell>
                  <span class="inline-flex flex-wrap gap-3">
                    <TableTextLink :disabled="saving || formLocked" @click="startEdit(row)">
                      Edit
                    </TableTextLink>
                    <TableTextLink
                      v-if="row.status === 'ACTIVE'"
                      destructive
                      :disabled="saving || formLocked"
                      @click="requestDisable(row)"
                    >
                      Disable
                    </TableTextLink>
                    <TableTextLink v-else :disabled="saving || formLocked" @click="enable(row)">
                      Enable
                    </TableTextLink>
                    <TableTextLink
                      destructive
                      :disabled="saving || formLocked"
                      @click="requestDelete(row)"
                    >
                      Delete
                    </TableTextLink>
                  </span>
                </TableCell>
              </template>
            </TableRow>
          </VueDraggable>
          <TableBody v-if="!localRows.length && !adding">
            <TableRow>
              <TableCell
                colspan="6"
                class="h-20 text-center text-sm text-muted-foreground italic"
              >
                No Support Categories yet — click "Add category" to begin.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>

  <ConfirmDialog
    v-model:open="disableOpen"
    title="Disable this category?"
    description="It will no longer appear in new Workload Registry rows. Existing rows keep it."
    confirm-label="Disable"
    confirm-variant="destructive"
    :pending="updateMutation.isPending.value"
    @confirm="confirmDisable"
  />

  <ConfirmDialog
    v-model:open="deleteOpen"
    title="Delete this category?"
    description="It will be removed from the catalog. Existing Workload Registry rows keep the name."
    confirm-label="Delete"
    :rows="
      pendingDelete
        ? [{ label: 'Category', value: pendingDelete.name, strong: true }]
        : []
    "
    :pending="deleteMutation.isPending.value"
    @confirm="confirmDelete"
  />
  </div>
</template>
