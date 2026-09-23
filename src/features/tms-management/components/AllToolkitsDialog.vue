<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import ListLoading from '@/components/ListLoading.vue'
import ToolkitInfoPanel from '@/features/exercise-management/components/ToolkitInfoPanel.vue'
import { snapshotFromToolkit } from '@/features/exercise-management/snapshotFromToolkit'
import { useToolkitQuery } from '@/features/toolkit-management/api/queries'
import { distinctCommaTokens } from '@/lib/commaTokens'

import type { Toolkit } from '../types'
import { createAgentToolkitColumns } from './agentToolkitColumns'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  toolkits: Toolkit[]
  pending?: boolean
}>()

const selectedToolkitId = ref('')
const fieldClass = 'w-[220px]'

const emptyFilters = () => ({
  name: '',
  center: '',
  domain: '',
  pl3Code: '',
  carrier: '',
  site: '',
  customerCountry: '',
  enabled: '',
})

const draft = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const page = ref(1)
const pageSize = ref(10)

const columns = computed(() => createAgentToolkitColumns((id) => (selectedToolkitId.value = id)))

const sourceToolkits = computed(() => props.toolkits)

const centerOptions = computed(() => uniqueSorted(sourceToolkits.value.map((toolkit) => toolkit.center)))
const domainOptions = computed(() => uniqueSorted(sourceToolkits.value.map((toolkit) => toolkit.domain)))
const pl3Options = computed(() => {
  const map = new Map<string, string>()
  for (const toolkit of sourceToolkits.value) {
    if (!toolkit.pl3Code) continue
    if (!map.has(toolkit.pl3Code)) {
      map.set(toolkit.pl3Code, toolkit.pl3Name || toolkit.pl3Code)
    }
  }
  return [...map.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.name.localeCompare(right.name))
})
const carrierOptions = computed(() => uniqueSorted(kpiValues((selection) => selection.carrier)))
const siteOptions = computed(() => uniqueSorted(kpiValues((selection) => selection.site)))
const countryOptions = computed(() =>
  distinctCommaTokens(kpiValues((selection) => selection.customerCountry)).sort((left, right) =>
    left.localeCompare(right),
  ),
)

const filtered = computed(() => {
  const nameQuery = applied.name.trim().toLowerCase()
  return sourceToolkits.value.filter((toolkit) => {
    if (nameQuery && !toolkit.name.toLowerCase().includes(nameQuery)) return false
    if (applied.center && toolkit.center !== applied.center) return false
    if (applied.domain && toolkit.domain !== applied.domain) return false
    if (applied.pl3Code && toolkit.pl3Code !== applied.pl3Code) return false
    if (applied.enabled === 'true' && toolkit.enabled === false) return false
    if (applied.enabled === 'false' && toolkit.enabled !== false) return false
    if (!matchesKpi(toolkit, applied.carrier, applied.site, applied.customerCountry)) return false
    return true
  })
})

function kpiValues(pick: (selection: NonNullable<Toolkit['sharedKpiSelections']>[number]) => string) {
  return sourceToolkits.value.flatMap((toolkit) =>
    (toolkit.sharedKpiSelections ?? []).map(pick).filter(Boolean),
  )
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort(
    (left, right) => left.localeCompare(right),
  )
}

function matchesKpi(toolkit: Toolkit, carrier: string, site: string, customerCountry: string) {
  if (!carrier && !site && !customerCountry) return true
  const selections = toolkit.sharedKpiSelections ?? []
  return selections.some((selection) => {
    if (carrier && selection.carrier !== carrier) return false
    if (site && selection.site !== site) return false
    if (customerCountry && !distinctCommaTokens([selection.customerCountry]).includes(customerCountry)) {
      return false
    }
    return true
  })
}

const total = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value) || 1))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const detailQuery = useToolkitQuery(selectedToolkitId)
const detailSnapshot = computed(() => {
  const toolkit = detailQuery.data.value
  return toolkit ? snapshotFromToolkit(toolkit) : null
})

watch(open, (isOpen) => {
  if (isOpen) return
  selectedToolkitId.value = ''
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
})

watch(totalPages, (pages) => {
  if (page.value > pages) page.value = pages
})

function applySearch() {
  Object.assign(applied, { ...draft })
  page.value = 1
}

function clearFilters() {
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[calc(100vh-2rem)] w-[min(1440px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-[calc(100vw-2rem)]"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>{{ selectedToolkitId ? 'Toolkit Info' : 'Team toolkits' }}</DialogTitle>
        <DialogDescription>
          {{
            selectedToolkitId
              ? 'Read-only Process Mapping, Shared KPI Scope Split, and Subtasks.'
              : 'Toolkits authorized by your current ACTIVE Timesheet assignment.'
          }}
        </DialogDescription>
      </DialogHeader>
      <div class="min-w-0 px-5 py-4">
        <div class="min-w-0 rounded-lg border bg-card p-4">
          <div v-show="!selectedToolkitId" class="grid gap-3">
            <QueryPanel @search="applySearch" @clear="clearFilters">
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                Toolkit
                <Input
                  v-model="draft.name"
                  :class="fieldClass"
                  placeholder="Search toolkit name"
                />
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                GBS Center
                <NativeSelect
                  :class="fieldClass"
                  :model-value="draft.center"
                  @update:model-value="draft.center = String($event ?? '')"
                 placeholder="All">
                  <option v-for="center in centerOptions" :key="center" :value="center">
                    {{ center }}
                  </option>
                </NativeSelect>
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                Domain
                <NativeSelect
                  :class="fieldClass"
                  :model-value="draft.domain"
                  @update:model-value="draft.domain = String($event ?? '')"
                 placeholder="All">
                  <option v-for="domain in domainOptions" :key="domain" :value="domain">
                    {{ domain }}
                  </option>
                </NativeSelect>
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                PL3
                <NativeSelect
                  :class="fieldClass"
                  :model-value="draft.pl3Code"
                  @update:model-value="draft.pl3Code = String($event ?? '')"
                 placeholder="All">
                  <option v-for="pl3 in pl3Options" :key="pl3.code" :value="pl3.code">
                    {{ pl3.name }}
                  </option>
                </NativeSelect>
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                Carrier
                <NativeSelect
                  :class="fieldClass"
                  :model-value="draft.carrier"
                  @update:model-value="draft.carrier = String($event ?? '')"
                 placeholder="All">
                  <option v-for="carrier in carrierOptions" :key="carrier" :value="carrier">
                    {{ carrier }}
                  </option>
                </NativeSelect>
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                GBS Site
                <NativeSelect
                  :class="fieldClass"
                  :model-value="draft.site"
                  @update:model-value="draft.site = String($event ?? '')"
                 placeholder="All">
                  <option v-for="site in siteOptions" :key="site" :value="site">
                    {{ site }}
                  </option>
                </NativeSelect>
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                Customer Country
                <NativeSelect
                  :class="fieldClass"
                  :model-value="draft.customerCountry"
                  @update:model-value="draft.customerCountry = String($event ?? '')"
                 placeholder="All">
                  <option
                    v-for="country in countryOptions"
                    :key="country"
                    :value="country"
                  >
                    {{ country }}
                  </option>
                </NativeSelect>
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                Status
                <NativeSelect
                  :class="fieldClass"
                  :model-value="draft.enabled"
                  @update:model-value="draft.enabled = String($event ?? '')"
                 placeholder="All">
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </NativeSelect>
              </label>
            </QueryPanel>

            <DataTable
              :columns="columns"
              :data="paged"
              :pending="pending"
              empty-text="No Toolkit is currently available."
              table-class="min-w-[1960px]"
              :get-row-id="(row) => row.id"
            />

            <TablePager
              :total="total"
              :page="page"
              :page-size="pageSize"
              label="toolkits"
              @update:page="page = $event"
              @update:page-size="
                (size) => {
                  pageSize = size
                  page = 1
                }
              "
            />
          </div>

          <div v-if="selectedToolkitId" class="grid gap-4">
            <Button
              variant="link"
              class="h-auto w-fit px-0 font-semibold"
              @click="selectedToolkitId = ''"
            >
              ← Back to Team toolkits
            </Button>
            <ListLoading v-if="detailQuery.isPending.value" />
            <p
              v-else-if="detailQuery.isError.value"
              class="py-6 text-center text-sm text-destructive"
            >
              {{
                detailQuery.error.value instanceof Error
                  ? detailQuery.error.value.message
                  : 'Could not load toolkit info.'
              }}
            </p>
            <ToolkitInfoPanel
              v-else
              embedded
              :snapshot="detailSnapshot"
              :alignment="detailQuery.data.value?.alignment"
            />
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
