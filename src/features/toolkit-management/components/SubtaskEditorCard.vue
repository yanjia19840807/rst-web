<script setup lang="ts">
import { computed, ref } from 'vue'

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

import type { ToolkitSubtask } from '../types'

const subtasks = defineModel<ToolkitSubtask[]>('subtasks', { required: true })

const editingSubtaskId = ref<string | null>(null)
const editSubtaskName = ref('')
const addingSubtask = ref(false)
const addSubtaskName = ref('')

const activeSubtasks = computed(() => subtasks.value.filter((item) => !item.deletedAt))

function startEdit(subtask: ToolkitSubtask) {
  editingSubtaskId.value = subtask.id
  editSubtaskName.value = subtask.name
}

function saveEdit() {
  const name = editSubtaskName.value.trim()
  if (name) {
    subtasks.value = subtasks.value.map((item) =>
      item.id === editingSubtaskId.value ? { ...item, name } : item,
    )
  }
  editingSubtaskId.value = null
}

function remove(subtask: ToolkitSubtask) {
  subtasks.value = subtasks.value.map((item) =>
    item.id === subtask.id ? { ...item, deletedAt: new Date().toISOString() } : item,
  )
}

function beginAdd() {
  addingSubtask.value = true
  addSubtaskName.value = ''
}

function confirmAdd() {
  const name = addSubtaskName.value.trim()
  if (!name) return
  subtasks.value = [
    ...subtasks.value,
    {
      id: crypto.randomUUID(),
      name,
      description: '',
      displayOrder: subtasks.value.length + 1,
      deletedAt: null,
    },
  ]
  addSubtaskName.value = ''
  addingSubtask.value = false
}
</script>

<template>
  <Card>
    <CardHeader>
      <div>
        <CardTitle>Subtasks</CardTitle>
        <p class="mt-1 text-xs text-muted-foreground">
          Define the work steps timed in TMS.
        </p>
      </div>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="grid gap-2">
        <div class="flex justify-end">
          <Button size="sm" variant="outline" @click="beginAdd">+ Add Subtask</Button>
        </div>
        <div class="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">#</TableHead>
              <TableHead>Subtask name</TableHead>
              <TableHead class="w-28">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(subtask, index) in activeSubtasks" :key="subtask.id">
              <TableCell class="text-muted-foreground">{{ index + 1 }}</TableCell>
              <TableCell>
                <Input
                  v-if="editingSubtaskId === subtask.id"
                  v-model="editSubtaskName"
                  autofocus
                  @keydown.enter="saveEdit"
                  @keydown.escape="editingSubtaskId = null"
                />
                <span v-else>{{ subtask.name }}</span>
              </TableCell>
              <TableCell>
                <div v-if="editingSubtaskId === subtask.id" class="flex gap-3">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    @click="saveEdit"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    @click="editingSubtaskId = null"
                  >
                    Cancel
                  </Button>
                </div>
                <div v-else class="flex gap-3">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    @click="startEdit(subtask)"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="link-destructive"
                    class="h-auto px-0 font-semibold"
                    @click="remove(subtask)"
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="addingSubtask">
              <TableCell class="text-muted-foreground">{{ activeSubtasks.length + 1 }}</TableCell>
              <TableCell>
                <Input
                  v-model="addSubtaskName"
                  autofocus
                  placeholder="Enter subtask name…"
                  @keydown.enter="confirmAdd"
                  @keydown.escape="addingSubtask = false"
                />
              </TableCell>
              <TableCell>
                <div class="flex justify-end gap-3">
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    @click="confirmAdd"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    @click="addingSubtask = false"
                  >
                    Cancel
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="!activeSubtasks.length && !addingSubtask">
              <TableCell colspan="3" class="h-20 text-center text-muted-foreground">
                No subtasks defined — click "Add Subtask" to begin.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
