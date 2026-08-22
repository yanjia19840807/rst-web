<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { SharedKpiCandidate, SharedKpiKey } from '../types'
import { kpiKey } from '../kpiKey'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  candidates: SharedKpiCandidate[]
  selected: SharedKpiKey[]
  countries: string[]
}>()

const emit = defineEmits<{
  confirm: [items: SharedKpiKey[]]
}>()

const draft = ref<Set<string>>(new Set())

watch(open, (value) => {
  if (value) {
    draft.value = new Set(props.selected.map(kpiKey))
  }
})

const selectedCount = computed(() => draft.value.size)

const candidateKeys = computed(() => props.candidates.map(kpiKey))

const allSelected = computed(
  () =>
    candidateKeys.value.length > 0 && candidateKeys.value.every((key) => draft.value.has(key)),
)

const someSelected = computed(() => candidateKeys.value.some((key) => draft.value.has(key)))

function toggle(item: SharedKpiCandidate) {
  const key = kpiKey(item)
  const next = new Set(draft.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  draft.value = next
}

function toggleAll() {
  draft.value = allSelected.value ? new Set() : new Set(candidateKeys.value)
}

function confirm() {
  emit(
    'confirm',
    props.candidates
      .filter((item) => draft.value.has(kpiKey(item)))
      .map((item) => ({
        carrier: item.carrier,
        site: item.site,
        customerCountry: item.customerCountry,
      })),
  )
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[80vh] w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-3xl"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none py-4 pl-6 pr-12">
        <DialogTitle>Select Shared KPI Lines</DialogTitle>
        <DialogDescription>
          {{ selectedCount }} selected
          <template v-if="countries.length"> · filtered by: {{ countries.join(', ') }}</template>
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div class="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-10">
                  <input
                    type="checkbox"
                    class="size-3.5 accent-primary"
                    aria-label="Select all Shared KPI lines"
                    :checked="allSelected"
                    :indeterminate="someSelected && !allSelected"
                    :disabled="!candidates.length"
                    @click.stop
                    @change="toggleAll"
                  />
                </TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>GBS Site</TableHead>
                <TableHead>Customer Country</TableHead>
                <TableHead>Delivery HC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="item in candidates"
                :key="kpiKey(item)"
                class="cursor-pointer"
                :class="draft.has(kpiKey(item)) ? 'bg-muted/60' : undefined"
                @click="toggle(item)"
              >
                <TableCell>
                  <input
                    type="checkbox"
                    class="size-3.5 accent-primary"
                    :checked="draft.has(kpiKey(item))"
                    @click.stop
                    @change="toggle(item)"
                  />
                </TableCell>
                <TableCell>{{ item.carrier }}</TableCell>
                <TableCell>{{ item.site }}</TableCell>
                <TableCell>{{ item.customerCountry }}</TableCell>
                <TableCell>{{ item.deliveryHc }}</TableCell>
              </TableRow>
              <TableRow v-if="!candidates.length">
                <TableCell colspan="5" class="h-20 text-center text-muted-foreground italic">
                  No KPI lines available for the selected countries.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button @click="confirm">Confirm Selection</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
