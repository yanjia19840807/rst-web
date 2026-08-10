<script setup lang="ts">
import { ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  sessionNo: string
  reference: string
  dateFrom: string
  dateTo: string
}>()

const emit = defineEmits<{
  'update:sessionNo': [value: string]
  'update:reference': [value: string]
  'update:dateFrom': [value: string]
  'update:dateTo': [value: string]
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
    <div class="flex flex-wrap items-end gap-2.5">
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Session No
        <Input
          class="w-[200px]"
          :model-value="sessionNo"
          placeholder="Search session no"
          @update:model-value="emit('update:sessionNo', String($event))"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Reference
        <Input
          class="w-[180px]"
          :model-value="reference"
          placeholder="Search reference"
          @update:model-value="emit('update:reference', String($event))"
        />
      </label>
      <Button variant="outline" @click="moreOpen = !moreOpen">
        More Filters{{ dateFrom || dateTo ? ' (1)' : '' }}
      </Button>
    </div>

    <div v-if="moreOpen" class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3">
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Session Date From
        <DatePicker
          v-model="draftFrom"
          aria-label="Choose session start date"
          placeholder="Select start date"
        />
      </label>
      <label class="grid gap-1.5 text-xs text-muted-foreground">
        Session Date To
        <DatePicker
          v-model="draftTo"
          aria-label="Choose session end date"
          placeholder="Select end date"
        />
      </label>
      <Button variant="outline" @click="clearDraftDates">Clear</Button>
      <Button @click="applyDates">Apply Filters</Button>
    </div>

    <div v-if="dateFrom || dateTo" class="flex flex-wrap gap-2">
      <button
        v-if="dateFrom"
        class="rounded-full border bg-card px-3 py-1 text-xs"
        @click="emit('update:dateFrom', '')"
      >
        Date after: {{ dateFrom }} ×
      </button>
      <button
        v-if="dateTo"
        class="rounded-full border bg-card px-3 py-1 text-xs"
        @click="emit('update:dateTo', '')"
      >
        Date before: {{ dateTo }} ×
      </button>
    </div>
  </div>
</template>
