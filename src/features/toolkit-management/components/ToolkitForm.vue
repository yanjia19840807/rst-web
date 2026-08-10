<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { toolkitApi } from '../api'
import type {
  HierarchyOption,
  SharedKpiCandidate,
  SharedKpiKey,
  ToolkitEditorPayload,
  ToolkitSubtask,
} from '../types'
import SelectSharedKpiDialog from './SelectSharedKpiDialog.vue'

const props = defineProps<{
  toolkitId?: string
}>()

const router = useRouter()
const hierarchy = ref<HierarchyOption[]>([])
const candidates = ref<SharedKpiCandidate[]>([])
const countries = ref<string[]>([])
const selectedCountries = ref<string[]>([])
const syncDate = ref('')
const busy = ref(false)
const kpiOpen = ref(false)
const deleteOpen = ref(false)
const editingSubtaskId = ref<string | null>(null)
const editSubtaskName = ref('')
const addingSubtask = ref(false)
const addSubtaskName = ref('')

const form = reactive<ToolkitEditorPayload>({
  name: '',
  description: '',
  supervisorPositionId: '',
  center: '',
  domain: '',
  pl1: '',
  pl2: '',
  pl3Code: '',
  pl3Name: '',
  combineSubtasksTime: false,
  subtasks: [],
  sharedKpiSelections: [],
})

const unique = (values: string[]) => [...new Set(values)]
const centers = computed(() => unique(hierarchy.value.map((item) => item.center)))
const domains = computed(() =>
  unique(hierarchy.value.filter((item) => item.center === form.center).map((item) => item.domain)),
)
const pl1s = computed(() =>
  unique(
    hierarchy.value
      .filter((item) => item.center === form.center && item.domain === form.domain)
      .map((item) => item.pl1),
  ),
)
const pl2s = computed(() =>
  unique(
    hierarchy.value
      .filter(
        (item) =>
          item.center === form.center && item.domain === form.domain && item.pl1 === form.pl1,
      )
      .map((item) => item.pl2),
  ),
)
const pl3s = computed(() =>
  hierarchy.value.filter(
    (item) =>
      item.center === form.center &&
      item.domain === form.domain &&
      item.pl1 === form.pl1 &&
      item.pl2 === form.pl2,
  ),
)

const keyOf = (item: SharedKpiKey) =>
  `${item.carrier}\u0000${item.site}\u0000${item.customerCountry}`

const selectedKpiRows = computed(() =>
  form.sharedKpiSelections.map((selection) => {
    const match = candidates.value.find((item) => keyOf(item) === keyOf(selection))
    return {
      ...selection,
      deliveryHc: match?.deliveryHc ?? null,
    }
  }),
)

const totalHc = computed(() =>
  selectedKpiRows.value
    .reduce((sum, item) => sum + (item.deliveryHc ?? 0), 0)
    .toFixed(2),
)

const activeSubtasks = computed(() => form.subtasks.filter((item) => !item.deletedAt))

const controlClass =
  'h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

function resetFormDefaults() {
  Object.assign(form, {
    name: '',
    description: '',
    supervisorPositionId: '',
    center: centers.value[0] ?? '',
    domain: '',
    pl1: '',
    pl2: '',
    pl3Code: '',
    pl3Name: '',
    combineSubtasksTime: false,
    subtasks: [],
    sharedKpiSelections: [],
    version: undefined,
  })
  selectedCountries.value = []
}

async function load() {
  hierarchy.value = await toolkitApi.hierarchy()
  if (props.toolkitId) {
    const toolkits = await toolkitApi.list()
    const toolkit = toolkits.find((item) => item.id === props.toolkitId)
    if (!toolkit) {
      toast.error('Toolkit not found.')
      void router.push({ name: 'supervisor-toolkits' })
      return
    }
    Object.assign(form, {
      name: toolkit.name,
      description: toolkit.description,
      supervisorPositionId: toolkit.supervisorPositionId,
      center: toolkit.center,
      domain: toolkit.domain,
      pl1: toolkit.pl1,
      pl2: toolkit.pl2,
      pl3Code: toolkit.pl3Code,
      pl3Name: toolkit.pl3Name,
      combineSubtasksTime: toolkit.combineSubtasksTime,
      subtasks: toolkit.subtasks.map((item) => ({ ...item })),
      sharedKpiSelections: toolkit.sharedKpiSelections.map((item) => ({ ...item })),
      version: toolkit.version,
    })
    selectedCountries.value = unique(
      toolkit.sharedKpiSelections.map((item) => item.customerCountry),
    )
  } else {
    resetFormDefaults()
  }
  await refreshCandidates()
}

async function refreshCandidates() {
  if (!form.pl3Code || !form.supervisorPositionId) {
    candidates.value = []
    countries.value = []
    return
  }
  const response = await toolkitApi.candidates(
    form.pl3Code,
    form.supervisorPositionId,
    selectedCountries.value,
  )
  candidates.value = response.items
  countries.value = response.customerCountries
  syncDate.value = response.syncDate
}

function applyKpiSelection(items: SharedKpiKey[]) {
  form.sharedKpiSelections = items
}

function removeKpi(item: SharedKpiKey) {
  form.sharedKpiSelections = form.sharedKpiSelections.filter(
    (selection) => keyOf(selection) !== keyOf(item),
  )
}

function startEditSubtask(subtask: ToolkitSubtask) {
  editingSubtaskId.value = subtask.id
  editSubtaskName.value = subtask.name
}

function saveEditSubtask() {
  const target = form.subtasks.find((item) => item.id === editingSubtaskId.value)
  if (target && editSubtaskName.value.trim()) {
    target.name = editSubtaskName.value.trim()
  }
  editingSubtaskId.value = null
}

function softDeleteSubtask(subtask: ToolkitSubtask) {
  subtask.deletedAt = new Date().toISOString()
}

function beginAddSubtask() {
  addingSubtask.value = true
  addSubtaskName.value = ''
}

function confirmAddSubtask() {
  if (!addSubtaskName.value.trim()) return
  form.subtasks.push({
    id: crypto.randomUUID(),
    name: addSubtaskName.value.trim(),
    description: '',
    displayOrder: form.subtasks.length + 1,
    deletedAt: null,
  })
  addSubtaskName.value = ''
  addingSubtask.value = false
}

async function save() {
  if (
    !form.name.trim() ||
    !form.pl3Code ||
    !activeSubtasks.value.some((item) => item.name.trim()) ||
    !form.sharedKpiSelections.length
  ) {
    toast.error('Complete the hierarchy, one active Subtask and one Shared KPI selection.')
    return
  }
  busy.value = true
  try {
    const payload: ToolkitEditorPayload = {
      name: form.name,
      description: form.description,
      supervisorPositionId: form.supervisorPositionId,
      center: form.center,
      domain: form.domain,
      pl1: form.pl1,
      pl2: form.pl2,
      pl3Code: form.pl3Code,
      pl3Name: form.pl3Name,
      combineSubtasksTime: form.combineSubtasksTime,
      subtasks: form.subtasks.map((item) => ({ ...item })),
      sharedKpiSelections: form.sharedKpiSelections.map((item) => ({ ...item })),
      version: form.version,
    }
    if (props.toolkitId) await toolkitApi.update(props.toolkitId, payload)
    else await toolkitApi.create(payload)
    toast.success(props.toolkitId ? 'Toolkit updated.' : 'Toolkit created.')
    void router.push({ name: 'supervisor-toolkits' })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Toolkit could not be saved.')
  } finally {
    busy.value = false
  }
}

async function confirmDelete() {
  if (!props.toolkitId) return
  busy.value = true
  try {
    await toolkitApi.remove(props.toolkitId)
    deleteOpen.value = false
    toast.success(`${form.name} deleted.`)
    void router.push({ name: 'supervisor-toolkits' })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Toolkit could not be deleted.')
  } finally {
    busy.value = false
  }
}

watch(
  () => form.center,
  () => {
    if (!domains.value.includes(form.domain)) form.domain = domains.value[0] ?? ''
  },
)
watch(
  () => form.domain,
  () => {
    if (!pl1s.value.includes(form.pl1)) form.pl1 = pl1s.value[0] ?? ''
  },
)
watch(
  () => form.pl1,
  () => {
    if (!pl2s.value.includes(form.pl2)) form.pl2 = pl2s.value[0] ?? ''
  },
)
watch(
  () => form.pl2,
  () => {
    if (!pl3s.value.some((item) => item.pl3Code === form.pl3Code)) {
      form.pl3Code = pl3s.value[0]?.pl3Code ?? ''
      form.pl3Name = pl3s.value[0]?.pl3Name ?? ''
      form.supervisorPositionId = pl3s.value[0]?.supervisorPositionId ?? ''
      form.sharedKpiSelections = []
      selectedCountries.value = []
    }
  },
)
watch(
  () => form.supervisorPositionId,
  () => {
    const selected = pl3s.value.find(
      (item) => item.supervisorPositionId === form.supervisorPositionId,
    )
    if (selected) {
      form.pl3Code = selected.pl3Code
      form.pl3Name = selected.pl3Name
    }
  },
)
watch([() => form.pl3Code, selectedCountries], refreshCandidates, { deep: true })
watch(selectedCountries, (next) => {
  form.sharedKpiSelections = form.sharedKpiSelections.filter((item) =>
    next.includes(item.customerCountry),
  )
})

onMounted(load)
</script>

<template>
  <div>
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="router.push({ name: 'supervisor-toolkits' })"
        >
          ← Back to Toolkit List
        </Button>
      </template>
      <Button v-if="toolkitId" variant="destructive" @click="deleteOpen = true">
        Delete Toolkit
      </Button>
      <Button :disabled="busy" @click="save">
        {{ busy ? 'Saving…' : 'Save Toolkit' }}
      </Button>
    </PageActions>

    <div class="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Process Mapping</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div class="grid gap-1.5">
            <Label for="toolkit-name">Toolkit name</Label>
            <Input id="toolkit-name" v-model="form.name" placeholder="e.g. Bank Rec Manual Check" />
          </div>
          <div class="grid gap-1.5">
            <Label>GBS Center</Label>
            <select v-model="form.center" :class="controlClass">
              <option v-for="item in centers" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>
          <div class="grid gap-1.5">
            <Label>Domain</Label>
            <select v-model="form.domain" :class="controlClass">
              <option v-for="item in domains" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>
          <div class="grid gap-1.5">
            <Label>Process Level 1</Label>
            <select v-model="form.pl1" :class="controlClass">
              <option v-for="item in pl1s" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>
          <div class="grid gap-1.5">
            <Label>Process Level 2</Label>
            <select v-model="form.pl2" :class="controlClass" :disabled="!pl2s.length">
              <option v-if="!pl2s.length" value="">— select PL1 first —</option>
              <option v-for="item in pl2s" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>
          <div class="grid gap-1.5">
            <Label>Process Level 3</Label>
            <select
              v-model="form.supervisorPositionId"
              :class="controlClass"
              :disabled="!pl3s.length"
            >
              <option v-if="!pl3s.length" value="">— select PL2 first —</option>
              <option
                v-for="item in pl3s"
                :key="`${item.supervisorPositionId}-${item.pl3Code}`"
                :value="item.supervisorPositionId"
              >
                {{ item.pl3Name }}
              </option>
            </select>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="grid gap-1.5">
              <Label>Customer Country</Label>
              <MultiSelect
                v-model="selectedCountries"
                :options="countries"
                placeholder="Select customer countries…"
                empty-text="Select Process Level 3 to load countries."
                :disabled="!countries.length"
              />
            </div>
            <div class="grid gap-1.5">
              <Label>Combine subtasks time</Label>
              <div class="flex h-9 items-center gap-4 text-sm">
                <label class="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="combine-subtasks-time"
                    :checked="form.combineSubtasksTime === false"
                    @change="form.combineSubtasksTime = false"
                  />
                  No
                </label>
                <label class="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="combine-subtasks-time"
                    :checked="form.combineSubtasksTime === true"
                    @change="form.combineSubtasksTime = true"
                  />
                  Yes
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="items-center">
          <CardTitle>Subtasks</CardTitle>
          <CardAction>
            <Button size="sm" variant="outline" @click="beginAddSubtask">
              + Add Subtask
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
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
                      @keydown.enter="saveEditSubtask"
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
                        @click="saveEditSubtask"
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
                        @click="startEditSubtask(subtask)"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="link-destructive"
                        class="h-auto px-0 font-semibold"
                        @click="softDeleteSubtask(subtask)"
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
                      @keydown.enter="confirmAddSubtask"
                      @keydown.escape="addingSubtask = false"
                    />
                  </TableCell>
                  <TableCell>
                    <div class="flex justify-end gap-3">
                      <Button
                        size="sm"
                        variant="link"
                        class="h-auto px-0 font-semibold"
                        @click="confirmAddSubtask"
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
        </CardContent>
      </Card>
    </div>

    <Card class="mt-4">
      <CardHeader class="items-start">
        <div>
          <CardTitle>Shared KPI Scope Split</CardTitle>
          <p class="mt-1 text-xs text-muted-foreground">
            Delivery HC is read-only from ACTIVE Timesheet (sync {{ syncDate || '—' }}).
          </p>
        </div>
        <CardAction>
          <Button
            variant="outline"
            :disabled="!selectedCountries.length"
            @click="kpiOpen = true"
          >
            Select KPI Lines
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p v-if="!selectedCountries.length" class="text-sm text-muted-foreground italic">
          Select Customer Country above to enable KPI line selection.
        </p>
        <p v-else-if="!selectedKpiRows.length" class="text-sm text-muted-foreground italic">
          No KPI lines selected — click "Select KPI Lines" to add.
        </p>
        <div v-else class="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carrier</TableHead>
                <TableHead>GBS Site</TableHead>
                <TableHead>Customer Country</TableHead>
                <TableHead>Delivery HC</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in selectedKpiRows" :key="keyOf(item)">
                <TableCell>{{ item.carrier }}</TableCell>
                <TableCell>{{ item.site }}</TableCell>
                <TableCell>{{ item.customerCountry }}</TableCell>
                <TableCell>{{ item.deliveryHc ?? '—' }}</TableCell>
                <TableCell class="text-right">
                  <Button
                    size="sm"
                    variant="link-destructive"
                    class="h-auto px-0 font-semibold"
                    @click="removeKpi(item)"
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow class="bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell>{{ totalHc }}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <SelectSharedKpiDialog
      v-model:open="kpiOpen"
      :candidates="candidates"
      :selected="form.sharedKpiSelections"
      :countries="selectedCountries"
      @confirm="applyKpiSelection"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete Toolkit"
      warning="This action cannot be undone. Exercises and scenarios linked to this toolkit will no longer be available in the workspace."
      :rows="[{ label: 'Toolkit', value: form.name, strong: true }]"
      confirm-label="Delete Toolkit"
      :pending="busy"
      @confirm="confirmDelete"
    />
  </div>
</template>
