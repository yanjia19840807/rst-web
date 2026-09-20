<script setup lang="ts">
import { computed } from 'vue'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import { NativeSelect } from '@/components/ui/native-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { hierarchyOptionKey, type HierarchyOption } from '../types'

const name = defineModel<string>('name', { required: true })
const center = defineModel<string>('center', { required: true })
const domain = defineModel<string>('domain', { required: true })
const pl1 = defineModel<string>('pl1', { required: true })
const pl2 = defineModel<string>('pl2', { required: true })
const supervisorPositionId = defineModel<string>('supervisorPositionId', { required: true })
const pl3Code = defineModel<string>('pl3Code', { required: true })
const selectedCountries = defineModel<string[]>('selectedCountries', { required: true })

const props = defineProps<{
  centers: string[]
  domains: string[]
  pl1s: string[]
  pl2s: string[]
  pl3s: HierarchyOption[]
  countries: string[]
  hasHierarchy?: boolean
  errors: Record<string, string | undefined>
}>()

const fieldClass = 'w-full'

const pl3Selection = computed({
  get() {
    if (!supervisorPositionId.value || !pl3Code.value) return ''
    return hierarchyOptionKey({
      supervisorPositionId: supervisorPositionId.value,
      pl3Code: pl3Code.value,
    })
  },
  set(value: string) {
    const selected = props.pl3s.find((item) => hierarchyOptionKey(item) === value)
    supervisorPositionId.value = selected?.supervisorPositionId ?? ''
    pl3Code.value = selected?.pl3Code ?? ''
  },
})
</script>

<template>
  <Card>
    <CardHeader>
      <div>
        <CardTitle>Process Mapping</CardTitle>
        <p class="mt-1 text-xs text-muted-foreground">
          Map this toolkit to Timesheet hierarchy, customer countries, and Shared KPI split.
        </p>
      </div>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="grid max-w-xl gap-4">
        <div class="grid gap-1.5">
          <Label for="toolkit-name">Toolkit</Label>
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
          <NativeSelect
            v-model="center"
            :class="fieldClass"
            :aria-invalid="Boolean(errors.center)"
          >
            <option value="">Select GBS Center</option>
            <option v-for="item in centers" :key="item" :value="item">{{ item }}</option>
          </NativeSelect>
          <p v-if="errors.center" class="text-xs text-destructive">{{ errors.center }}</p>
        </div>
        <div class="grid gap-1.5">
          <Label>Domain</Label>
          <NativeSelect
            v-model="domain"
            :class="fieldClass"
            :aria-invalid="Boolean(errors.domain)"
          >
            <option value="">Select Domain</option>
            <option v-for="item in domains" :key="item" :value="item">{{ item }}</option>
          </NativeSelect>
          <p v-if="errors.domain" class="text-xs text-destructive">{{ errors.domain }}</p>
        </div>
        <div class="grid gap-1.5">
          <Label>PL1</Label>
          <NativeSelect v-model="pl1" :class="fieldClass" :aria-invalid="Boolean(errors.pl1)">
            <option value="">Select PL1</option>
            <option v-for="item in pl1s" :key="item" :value="item">{{ item }}</option>
          </NativeSelect>
          <p v-if="errors.pl1" class="text-xs text-destructive">{{ errors.pl1 }}</p>
        </div>
        <div class="grid gap-1.5">
          <Label>PL2</Label>
          <NativeSelect
            v-model="pl2"
            :class="fieldClass"
            :disabled="Boolean(hasHierarchy) && !pl2s.length"
            :aria-invalid="Boolean(errors.pl2)"
          >
            <option value="">
              {{ hasHierarchy && !pl2s.length ? 'Select PL1 first' : 'Select PL2' }}
            </option>
            <option v-for="item in pl2s" :key="item" :value="item">{{ item }}</option>
          </NativeSelect>
          <p v-if="errors.pl2" class="text-xs text-destructive">{{ errors.pl2 }}</p>
        </div>
        <div class="grid gap-1.5">
          <Label>PL3</Label>
          <NativeSelect
            v-model="pl3Selection"
            :class="fieldClass"
            :disabled="Boolean(hasHierarchy) && !pl3s.length"
            :aria-invalid="Boolean(errors.supervisorPositionId || errors.pl3Code)"
          >
            <option value="">
              {{ hasHierarchy && !pl3s.length ? 'Select PL2 first' : 'Select PL3' }}
            </option>
            <option
              v-for="item in pl3s"
              :key="hierarchyOptionKey(item)"
              :value="hierarchyOptionKey(item)"
            >
              {{ item.pl3Name }} ({{ item.pl3Code }})
            </option>
          </NativeSelect>
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
            empty-text="Select PL3 to load countries."
            :disabled="Boolean(hasHierarchy) && !countries.length"
          />
        </div>
      </div>
      <slot />
    </CardContent>
  </Card>
</template>
