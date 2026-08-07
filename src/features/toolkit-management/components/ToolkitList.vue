<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import PageActions from '@/components/PageActions.vue'
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

import { toolkitApi } from '../api'
import type { SupervisorToolkit } from '../types'

const router = useRouter()
const toolkits = ref<SupervisorToolkit[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    toolkits.value = await toolkitApi.list()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkits.')
  } finally {
    loading.value = false
  }
}

function createExercise(toolkit: SupervisorToolkit) {
  void router.push({
    name: 'supervisor-exercises',
    query: { create: '1', toolkitId: toolkit.id },
  })
}

onMounted(load)
</script>

<template>
  <div>
    <PageActions>
      <Button @click="router.push({ name: 'supervisor-toolkit-new' })">Add Toolkit</Button>
    </PageActions>

    <Card>
      <CardHeader>
        <CardTitle>Manage All Toolkits</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto rounded-lg border">
          <Table class="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead>Toolkit Name</TableHead>
                <TableHead>GBS Center</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Process Level 1</TableHead>
                <TableHead>Process Level 2</TableHead>
                <TableHead>Process Level 3</TableHead>
                <TableHead>Subtasks</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="toolkit in toolkits" :key="toolkit.id">
                <TableCell class="font-semibold">{{ toolkit.name }}</TableCell>
                <TableCell>{{ toolkit.center }}</TableCell>
                <TableCell>{{ toolkit.domain }}</TableCell>
                <TableCell>{{ toolkit.pl1 }}</TableCell>
                <TableCell>{{ toolkit.pl2 }}</TableCell>
                <TableCell>{{ toolkit.pl3Name }}</TableCell>
                <TableCell>
                  {{
                    toolkit.subtasks
                      .filter((item) => !item.deletedAt)
                      .map((item) => item.name)
                      .join('; ') || '—'
                  }}
                </TableCell>
                <TableCell>
                  <div class="flex justify-end gap-2">
                    <Button size="sm" @click="createExercise(toolkit)">Create Exercise</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      @click="
                        router.push({
                          name: 'supervisor-toolkit-edit',
                          params: { id: toolkit.id },
                        })
                      "
                    >
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="!loading && !toolkits.length">
                <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                  No Toolkit is currently available.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                  Loading toolkits…
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
