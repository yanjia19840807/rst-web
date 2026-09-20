<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TableTextLink from '@/components/TableTextLink.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useToolkitMutations } from '../api/mutations'
import type { SupervisorToolkit, ToolkitSubtask } from '../types'

const subtasks = defineModel<ToolkitSubtask[]>('subtasks', { required: true })
const combineSubtasksTime = defineModel<boolean>('combineSubtasksTime', { required: true })

const props = defineProps<{
  mode?: 'create' | 'edit'
  toolkitId?: string
  errors?: Record<string, string | undefined>
}>()

const emit = defineEmits<{
  updated: [toolkit: SupervisorToolkit]
}>()

const isEdit = computed(() => props.mode === 'edit' && Boolean(props.toolkitId))
const { addSubtask, updateSubtask, setSubtaskEnabled } = useToolkitMutations()
const adding = ref(false)
const draftName = ref('')
const editingId = ref('')
const editName = ref('')
const toggleTarget = ref<ToolkitSubtask | null>(null)
const toggleOpen = ref(false)

const visibleSubtasks = computed(() =>
  isEdit.value
    ? subtasks.value.filter((item) => !item.deletedAt)
    : subtasks.value.filter((item) => !item.deletedAt),
)

const formLocked = computed(() => adding.value || Boolean(editingId.value))
const busy = computed(
  () =>
    addSubtask.isPending.value ||
    updateSubtask.isPending.value ||
    setSubtaskEnabled.isPending.value,
)

function nameError(id: string) {
  const index = subtasks.value.findIndex((item) => item.id === id)
  if (index < 0) return undefined
  return props.errors?.[`subtasks[${index}].name`] ?? props.errors?.[`subtasks.${index}.name`]
}

function updateName(id: string, name: string) {
  subtasks.value = subtasks.value.map((item) => (item.id === id ? { ...item, name } : item))
}

function removeDraft(subtask: ToolkitSubtask) {
  subtasks.value = subtasks.value.filter((item) => item.id !== subtask.id)
}

async function addDraft() {
  const id = crypto.randomUUID()
  subtasks.value = [
    ...subtasks.value,
    {
      id,
      name: '',
      description: '',
      displayOrder: subtasks.value.length + 1,
      deletedAt: null,
      enabled: true,
    },
  ]
  await nextTick()
  document.getElementById(`subtask-name-${id}`)?.focus()
}

function startAdd() {
  if (formLocked.value || busy.value) return
  adding.value = true
  draftName.value = ''
}

function cancelAdd() {
  adding.value = false
  draftName.value = ''
}

async function confirmAdd() {
  const name = draftName.value.trim()
  if (!name) {
    toast.error('Enter a subtask name.')
    return
  }
  if (!props.toolkitId) return
  try {
    const toolkit = await addSubtask.mutateAsync({ id: props.toolkitId, name })
    applyToolkit(toolkit)
    cancelAdd()
    toast.success('Subtask added.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not add the subtask.')
  }
}

function startEdit(subtask: ToolkitSubtask) {
  if (formLocked.value || busy.value) return
  editingId.value = subtask.id
  editName.value = subtask.name
}

function cancelEdit() {
  editingId.value = ''
  editName.value = ''
}

async function confirmEdit() {
  const name = editName.value.trim()
  if (!name) {
    toast.error('Enter a subtask name.')
    return
  }
  if (!props.toolkitId || !editingId.value) return
  try {
    const toolkit = await updateSubtask.mutateAsync({
      id: props.toolkitId,
      subtaskId: editingId.value,
      name,
    })
    applyToolkit(toolkit)
    cancelEdit()
    toast.success('Subtask updated.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not update the subtask.')
  }
}

function openToggle(subtask: ToolkitSubtask) {
  toggleTarget.value = subtask
  toggleOpen.value = true
}

function syncCount(subtask: ToolkitSubtask) {
  const enabled = subtask.enabled !== false
  return enabled
    ? (subtask.referencedEnabledSessionCount ?? 0)
    : (subtask.referencedDisabledSessionCount ?? 0)
}

async function confirmToggle() {
  const target = toggleTarget.value
  if (!target || !props.toolkitId) return
  const nextEnabled = target.enabled === false
  try {
    const toolkit = await setSubtaskEnabled.mutateAsync({
      id: props.toolkitId,
      subtaskId: target.id,
      enabled: nextEnabled,
    })
    applyToolkit(toolkit)
    toggleOpen.value = false
    toast.success(nextEnabled ? 'Subtask enabled.' : 'Subtask disabled.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not update the subtask status.')
  }
}

function applyToolkit(toolkit: SupervisorToolkit) {
  subtasks.value = toolkit.subtasks.map((item) => ({ ...item, description: item.description ?? '' }))
  emit('updated', toolkit)
}
</script>

<template>
  <Card>
    <CardHeader>
      <div>
        <CardTitle>Subtasks</CardTitle>
        <p class="mt-1 text-xs text-muted-foreground">
          {{
            isEdit
              ? 'Save each TASK immediately. Disable keeps the row and syncs referenced TMS sessions.'
              : 'Define the work steps timed in TMS. Save the Toolkit to create these TASK rows.'
          }}
        </p>
      </div>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="grid gap-1.5">
        <Label>Combine Subtask Time</Label>
        <div class="flex h-9 items-center gap-4 text-sm">
          <label class="inline-flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="combine-subtasks-time"
              class="size-3.5 accent-primary"
              :checked="combineSubtasksTime === false"
              @change="combineSubtasksTime = false"
            />
            No
          </label>
          <label class="inline-flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="combine-subtasks-time"
              class="size-3.5 accent-primary"
              :checked="combineSubtasksTime === true"
              @change="combineSubtasksTime = true"
            />
            Yes
          </label>
        </div>
        <p class="text-xs text-muted-foreground">
          Yes: SYSTEM baseline is the sum of each subtask's median.
          No: SYSTEM baseline is the median of all included sessions.
        </p>
      </div>
      <div class="grid gap-2">
        <div class="flex justify-end">
          <Button
            v-if="isEdit"
            variant="outline"
            :disabled="formLocked || busy"
            @click="startAdd"
          >
            Add Subtask
          </Button>
          <Button v-else variant="outline" @click="addDraft">Add Subtask</Button>
        </div>
        <div class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-10">#</TableHead>
                <TableHead>Subtask name</TableHead>
                <TableHead v-if="isEdit" class="w-24">Status</TableHead>
                <TableHead class="w-40 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isEdit && adding" class="bg-muted/30">
                <TableCell class="text-muted-foreground">+</TableCell>
                <TableCell>
                  <Input
                    v-model="draftName"
                    size="sm"
                    placeholder="Enter subtask name"
                  />
                </TableCell>
                <TableCell />
                <TableCell class="text-right">
                  <span class="inline-flex justify-end gap-3">
                    <TableTextLink :disabled="busy" @click="confirmAdd">Confirm</TableTextLink>
                    <TableTextLink :disabled="busy" @click="cancelAdd">Cancel</TableTextLink>
                  </span>
                </TableCell>
              </TableRow>

              <TableRow
                v-for="(subtask, index) in visibleSubtasks"
                :key="subtask.id"
                :class="editingId === subtask.id ? 'bg-muted/30' : undefined"
              >
                <TableCell class="text-muted-foreground">{{ index + 1 }}</TableCell>
                <TableCell v-if="isEdit && editingId === subtask.id">
                  <Input v-model="editName" size="sm" placeholder="Enter subtask name" />
                </TableCell>
                <TableCell v-else-if="isEdit">
                  {{ subtask.name || '—' }}
                </TableCell>
                <TableCell v-else>
                  <Input
                    :id="`subtask-name-${subtask.id}`"
                    size="sm"
                    :model-value="subtask.name"
                    placeholder="Enter subtask name"
                    :aria-invalid="Boolean(nameError(subtask.id))"
                    @update:model-value="updateName(subtask.id, String($event ?? ''))"
                  />
                  <p v-if="nameError(subtask.id)" class="mt-1 text-xs text-destructive">
                    {{ nameError(subtask.id) }}
                  </p>
                </TableCell>
                <TableCell v-if="isEdit">
                  <StatusBadge :status="subtask.enabled === false ? 'Disabled' : 'Enabled'" />
                </TableCell>
                <TableCell class="text-right">
                  <span
                    v-if="isEdit && editingId === subtask.id"
                    class="inline-flex justify-end gap-3"
                  >
                    <TableTextLink :disabled="busy" @click="confirmEdit">Confirm</TableTextLink>
                    <TableTextLink :disabled="busy" @click="cancelEdit">Cancel</TableTextLink>
                  </span>
                  <span v-else-if="isEdit" class="inline-flex justify-end gap-3">
                    <TableTextLink :disabled="formLocked || busy" @click="startEdit(subtask)">
                      Edit
                    </TableTextLink>
                    <TableTextLink
                      :destructive="subtask.enabled !== false"
                      :disabled="formLocked || busy"
                      @click="openToggle(subtask)"
                    >
                      {{ subtask.enabled === false ? 'Enable' : 'Disable' }}
                    </TableTextLink>
                  </span>
                  <TableTextLink v-else destructive @click="removeDraft(subtask)">
                    Remove
                  </TableTextLink>
                </TableCell>
              </TableRow>
              <TableRow v-if="!visibleSubtasks.length && !(isEdit && adding)">
                <TableCell :colspan="isEdit ? 4 : 3" class="h-20 text-center text-muted-foreground">
                  No subtasks defined — click "Add Subtask" to begin.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </CardContent>
  </Card>

  <ConfirmDialog
    v-if="isEdit"
    v-model:open="toggleOpen"
    :title="toggleTarget?.enabled === false ? 'Enable Subtask' : 'Disable Subtask'"
    :warning="
      toggleTarget?.enabled === false
        ? undefined
        : `This will disable ${syncCount(toggleTarget ?? { referencedEnabledSessionCount: 0 } as ToolkitSubtask)} TMS sessions. Completed and in-progress ones will be excluded from cycle time and will not occupy the same Toolkit, TASK and Reference.`
    "
    :description="
      toggleTarget?.enabled === false
        ? `This will enable ${syncCount(toggleTarget)} TMS sessions to match the TASK. Discarded sessions stay discarded.`
        : undefined
    "
    :rows="[{ label: 'Subtask', value: toggleTarget?.name ?? '', strong: true }]"
    :confirm-label="toggleTarget?.enabled === false ? 'Enable' : 'Disable'"
    :confirm-variant="toggleTarget?.enabled === false ? 'default' : 'destructive'"
    :pending="setSubtaskEnabled.isPending.value"
    @confirm="confirmToggle"
  />
</template>
