<script setup lang="ts">
import { ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  query: string
  dateFrom: string
  dateTo: string
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:dateFrom': [value: string]
  'update:dateTo': [value: string]
  clear: []
}>()

const moreOpen = ref(false)
const draftFrom = ref(props.dateFrom)
const draftTo = ref(props.dateTo)

watch(
  () => [props.dateFrom, props.dateTo],
  () => {
    draftFrom.value = props.dateFrom
    draftTo.value = props.dateTo
  },
)

function applyDates() {
  emit('update:dateFrom', draftFrom.value)
  emit('update:dateTo', draftTo.value)
  moreOpen.value = false
}

function clearDraftDates() {
  draftFrom.value = ''
  draftTo.value = ''
}
</script>

<template>
  <div class="grid gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <Input
        class="max-w-xs"
        :model-value="query"
        placeholder="Session No / Reference"
        @update:model-value="emit('update:query', String($event))"
      />
      <Button variant="outline" @click="moreOpen = !moreOpen">
        More Filters{{ dateFrom || dateTo ? ' (1)' : '' }}
      </Button>
    </div>

    <div v-if="moreOpen" class="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3">
      <div class="grid gap-1.5">
        <Label>Session Date From</Label>
        <DatePicker
          v-model="draftFrom"
          aria-label="Choose session start date"
          placeholder="Select start date"
        />
      </div>
      <div class="grid gap-1.5">
        <Label>Session Date To</Label>
        <DatePicker
          v-model="draftTo"
          aria-label="Choose session end date"
          placeholder="Select end date"
        />
      </div>
      <Button variant="outline" @click="clearDraftDates">Clear</Button>
      <Button @click="applyDates">Apply Filters</Button>
    </div>

    <div v-if="dateFrom || dateTo" class="flex flex-wrap gap-2">
      <button
        v-if="dateFrom"
        class="rounded-full border bg-background px-3 py-1 text-xs"
        @click="emit('update:dateFrom', '')"
      >
        Date after: {{ dateFrom }} ×
      </button>
      <button
        v-if="dateTo"
        class="rounded-full border bg-background px-3 py-1 text-xs"
        @click="emit('update:dateTo', '')"
      >
        Date before: {{ dateTo }} ×
      </button>
    </div>
  </div>
</template>
