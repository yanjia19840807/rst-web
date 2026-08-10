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

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  candidates: SharedKpiCandidate[]
  selected: SharedKpiKey[]
  countries: string[]
}>()

const emit = defineEmits<{
  confirm: [items: SharedKpiKey[]]
}>()

const keyOf = (item: SharedKpiKey) =>
  `${item.carrier}\u0000${item.site}\u0000${item.customerCountry}`

const draft = ref<Set<string>>(new Set())

watch(open, (value) => {
  if (value) {
    draft.value = new Set(props.selected.map(keyOf))
  }
})

const selectedCount = computed(() => draft.value.size)

function toggle(item: SharedKpiCandidate) {
  const key = keyOf(item)
  const next = new Set(draft.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  draft.value = next
}

function confirm() {
  emit(
    'confirm',
    props.candidates
      .filter((item) => draft.value.has(keyOf(item)))
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
    <DialogContent class="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
      <DialogHeader class="mx-0 mt-0 rounded-none px-6 py-4">
        <DialogTitle>Select Shared KPI Lines</DialogTitle>
        <DialogDescription>
          {{ selectedCount }} selected
          <template v-if="countries.length"> · filtered by: {{ countries.join(', ') }}</template>
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-6">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead class="w-10" />
              <TableHead>Carrier</TableHead>
              <TableHead>GBS Site</TableHead>
              <TableHead>Customer Country</TableHead>
              <TableHead>Delivery HC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="item in candidates"
              :key="keyOf(item)"
              class="cursor-pointer"
              :class="draft.has(keyOf(item)) ? 'bg-muted/60' : undefined"
              @click="toggle(item)"
            >
              <TableCell>
                <input
                  type="checkbox"
                  :checked="draft.has(keyOf(item))"
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

      <DialogFooter class="mx-0 mt-0 mb-0 rounded-none px-6 py-4">
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button @click="confirm">Confirm Selection</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
