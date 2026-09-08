<script setup lang="ts">
import { computed, nextTick } from 'vue'

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

const props = defineProps<{
  errors?: Record<string, string | undefined>
}>()

const activeSubtasks = computed(() => subtasks.value.filter((item) => !item.deletedAt))

function nameError(id: string) {
  const index = subtasks.value.findIndex((item) => item.id === id)
  if (index < 0) return undefined
  return props.errors?.[`subtasks[${index}].name`] ?? props.errors?.[`subtasks.${index}.name`]
}

function updateName(id: string, name: string) {
  subtasks.value = subtasks.value.map((item) => (item.id === id ? { ...item, name } : item))
}

function remove(subtask: ToolkitSubtask) {
  subtasks.value = subtasks.value.map((item) =>
    item.id === subtask.id ? { ...item, deletedAt: new Date().toISOString() } : item,
  )
}

async function addSubtask() {
  const id = crypto.randomUUID()
  subtasks.value = [
    ...subtasks.value,
    {
      id,
      name: '',
      description: '',
      displayOrder: subtasks.value.length + 1,
      deletedAt: null,
    },
  ]
  await nextTick()
  document.getElementById(`subtask-name-${id}`)?.focus()
}
</script>

<template>
  <Card>
    <CardHeader>
      <div>
        <CardTitle>Subtasks</CardTitle>
        <p class="mt-1 text-xs text-muted-foreground">
          Define the work steps timed in TMS. A TASK with running or paused sessions cannot be deleted until those sessions are ended or discarded.
        </p>
      </div>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="grid gap-2">
        <div class="flex justify-end">
          <Button variant="outline" @click="addSubtask">Add Subtask</Button>
        </div>
        <div class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-10">#</TableHead>
                <TableHead>Subtask name</TableHead>
                <TableHead class="w-20 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(subtask, index) in activeSubtasks" :key="subtask.id">
                <TableCell class="text-muted-foreground">{{ index + 1 }}</TableCell>
                <TableCell>
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
                <TableCell class="text-right">
                  <Button
                    size="sm"
                    variant="link-destructive"
                    class="h-auto px-0 font-semibold"
                    @click="remove(subtask)"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!activeSubtasks.length">
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
