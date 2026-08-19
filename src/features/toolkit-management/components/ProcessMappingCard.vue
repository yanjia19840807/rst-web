<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { HierarchyOption } from '../types'

const name = defineModel<string>('name', { required: true })
const center = defineModel<string>('center', { required: true })
const domain = defineModel<string>('domain', { required: true })
const pl1 = defineModel<string>('pl1', { required: true })
const pl2 = defineModel<string>('pl2', { required: true })
const supervisorPositionId = defineModel<string>('supervisorPositionId', { required: true })
const selectedCountries = defineModel<string[]>('selectedCountries', { required: true })
const combineSubtasksTime = defineModel<boolean>('combineSubtasksTime', { required: true })

defineProps<{
  centers: string[]
  domains: string[]
  pl1s: string[]
  pl2s: string[]
  pl3s: HierarchyOption[]
  countries: string[]
  errors: Record<string, string | undefined>
}>()

const controlClass =
  'h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
</script>

<template>
  <Card>
    <CardHeader>
      <div>
        <CardTitle>Process Mapping</CardTitle>
        <p class="mt-1 text-xs text-muted-foreground">
          Map this toolkit to Timesheet hierarchy and customer countries.
        </p>
      </div>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="grid gap-1.5">
        <Label for="toolkit-name">Toolkit name</Label>
        <Input
          id="toolkit-name"
          v-model="name"
          placeholder="e.g. Bank Rec Manual Check"
          :aria-invalid="Boolean(errors.name)"
        />
        <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
      </div>
      <div class="grid gap-1.5">
        <Label>GBS Center</Label>
        <select v-model="center" :class="controlClass" :aria-invalid="Boolean(errors.center)">
          <option v-for="item in centers" :key="item" :value="item">{{ item }}</option>
        </select>
        <p v-if="errors.center" class="text-xs text-destructive">{{ errors.center }}</p>
      </div>
      <div class="grid gap-1.5">
        <Label>Domain</Label>
        <select v-model="domain" :class="controlClass" :aria-invalid="Boolean(errors.domain)">
          <option v-for="item in domains" :key="item" :value="item">{{ item }}</option>
        </select>
        <p v-if="errors.domain" class="text-xs text-destructive">{{ errors.domain }}</p>
      </div>
      <div class="grid gap-1.5">
        <Label>Process Level 1</Label>
        <select v-model="pl1" :class="controlClass" :aria-invalid="Boolean(errors.pl1)">
          <option v-for="item in pl1s" :key="item" :value="item">{{ item }}</option>
        </select>
        <p v-if="errors.pl1" class="text-xs text-destructive">{{ errors.pl1 }}</p>
      </div>
      <div class="grid gap-1.5">
        <Label>Process Level 2</Label>
        <select
          v-model="pl2"
          :class="controlClass"
          :disabled="!pl2s.length"
          :aria-invalid="Boolean(errors.pl2)"
        >
          <option v-if="!pl2s.length" value="">— select PL1 first —</option>
          <option v-for="item in pl2s" :key="item" :value="item">{{ item }}</option>
        </select>
        <p v-if="errors.pl2" class="text-xs text-destructive">{{ errors.pl2 }}</p>
      </div>
      <div class="grid gap-1.5">
        <Label>Process Level 3</Label>
        <select
          v-model="supervisorPositionId"
          :class="controlClass"
          :disabled="!pl3s.length"
          :aria-invalid="Boolean(errors.supervisorPositionId || errors.pl3Code)"
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
        <p v-if="errors.supervisorPositionId || errors.pl3Code" class="text-xs text-destructive">
          {{ errors.supervisorPositionId || errors.pl3Code }}
        </p>
      </div>
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
        <Label>Combine same-reference session time</Label>
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
          Yes: sessions that share a Reference are summed before the SYSTEM median.
          No: each session is an independent median sample.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
