<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import PageActions from '@/components/PageActions.vue'
import TabStrip from '@/components/TabStrip.vue'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/auth/session'
import DomainHeadsDialog from '@/features/domain-heads/components/DomainHeadsDialog.vue'
import TimesheetSync from '@/features/timesheet-sync/components/TimesheetSync.vue'

import CenterSourceDialog from './CenterSourceDialog.vue'
import CurrentData from './CurrentData.vue'
import InterimSources from './InterimSources.vue'
import { useCenterSourcesQuery } from '../queries'

type SourceTab = 'timesheet' | 'interim' | 'current' | 'roles'

const session = useSessionStore()
const sourcesQuery = useCenterSourcesQuery()
const centerScoped = computed(() => session.roles.includes('LOCAL_TRANSFORMATION_HEAD'))
const ownCenter = computed(() => session.user?.center?.trim() ?? '')
const ownMode = computed(
  () => sourcesQuery.data.value?.find((row) => row.center === ownCenter.value)?.mode,
)
const tab = ref<SourceTab>(centerScoped.value ? 'current' : 'timesheet')
const centerSourceOpen = ref(false)

const tabs = computed(() => {
  const items: Array<{ key: SourceTab; label: string }> = []
  if (!centerScoped.value || ownMode.value === 'TIMESHEET') {
    items.push({ key: 'timesheet', label: 'Timesheet' })
  }
  if (!centerScoped.value) {
    items.push({ key: 'interim', label: 'MyHR & SKPI' })
  }
  items.push({ key: 'current', label: 'Current data' })
  items.push({ key: 'roles', label: 'Center Roles' })
  return items
})

watch(tabs, (items) => {
  if (!items.some((item) => item.key === tab.value)) {
    tab.value = items[0]?.key ?? 'current'
  }
})
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <PageActions v-if="!centerScoped">
      <Button variant="outline" @click="centerSourceOpen = true">Center source</Button>
    </PageActions>

    <TabStrip v-model="tab" :tabs="tabs" />

    <TimesheetSync
      v-if="tab === 'timesheet'"
      :show-center-roles="false"
      :lock-center="centerScoped ? ownCenter : ''"
      :show-alerts="!centerScoped"
      :allow-upload="!centerScoped || ownMode === 'TIMESHEET'"
    />
    <InterimSources v-else-if="tab === 'interim'" />
    <CurrentData v-else-if="tab === 'current'" :lock-center="centerScoped ? ownCenter : ''" />
    <DomainHeadsDialog v-else embedded />

    <CenterSourceDialog v-if="!centerScoped" v-model:open="centerSourceOpen" />
  </div>
</template>
