import { computed, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { toast } from 'vue-sonner'

import {
  useCalendarQuery,
  useCycleTimeActiveQuery,
  useDailyVolumesQuery,
  useMonthlyVolumesQuery,
  useSlotVolumesQuery,
  useSupportQuery,
  useTeamSetupQuery,
} from '../api/queries'
import type {
  CalendarView,
  CycleTimeBaseline,
  DailyVolume,
  MonthlyVolume,
  SlotVolume,
  SupportItem,
  TeamSetup,
} from '../types'
import type { AdTab, MedianSourceMode } from '../components/associated-data/adTypes'

function syncRefFromQuery<T>(source: Ref<T | undefined>, target: Ref<T>, fallback: T) {
  watch(
    source,
    (value) => {
      if (value !== undefined) target.value = value
      else target.value = fallback
    },
    { immediate: true },
  )
}

export function useAssociatedDataPanel(exerciseId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(exerciseId))

  const teamSetupQuery = useTeamSetupQuery(id)
  const supportQuery = useSupportQuery(id)
  const calendarQuery = useCalendarQuery(id)
  const monthlyQuery = useMonthlyVolumesQuery(id)
  const dailyQuery = useDailyVolumesQuery(id)
  const slotQuery = useSlotVolumesQuery(id)
  const cycleTimeQuery = useCycleTimeActiveQuery(id)

  const activeTab = ref<AdTab>('team')
  const teamSetup = ref<TeamSetup | null>(null)
  const support = ref<SupportItem[]>([])
  const calendar = ref<CalendarView | null>(null)
  const monthly = ref<MonthlyVolume[]>([])
  const daily = ref<DailyVolume[]>([])
  const slot = ref<SlotVolume[]>([])
  const cycleTime = ref<CycleTimeBaseline | null>(null)

  const editorOpen = ref(false)
  const editor = ref<AdTab | null>(null)
  const medianSource = ref<MedianSourceMode>('system')

  syncRefFromQuery(teamSetupQuery.data, teamSetup, null)
  syncRefFromQuery(supportQuery.data, support, [])
  syncRefFromQuery(calendarQuery.data, calendar, null)
  syncRefFromQuery(monthlyQuery.data, monthly, [])
  syncRefFromQuery(dailyQuery.data, daily, [])
  syncRefFromQuery(slotQuery.data, slot, [])
  syncRefFromQuery(cycleTimeQuery.data, cycleTime, null)

  const loading = computed(
    () =>
      (teamSetupQuery.isPending.value && teamSetupQuery.data.value === undefined) ||
      (supportQuery.isPending.value && supportQuery.data.value === undefined) ||
      (calendarQuery.isPending.value && calendarQuery.data.value === undefined) ||
      (cycleTimeQuery.isPending.value && cycleTimeQuery.data.value === undefined),
  )

  const anyError = computed(
    () =>
      teamSetupQuery.isError.value ||
      supportQuery.isError.value ||
      calendarQuery.isError.value ||
      monthlyQuery.isError.value ||
      dailyQuery.isError.value ||
      slotQuery.isError.value ||
      cycleTimeQuery.isError.value,
  )

  watch(anyError, (isError) => {
    if (!isError) return
    const error =
      teamSetupQuery.error.value ||
      supportQuery.error.value ||
      calendarQuery.error.value ||
      monthlyQuery.error.value ||
      dailyQuery.error.value ||
      slotQuery.error.value ||
      cycleTimeQuery.error.value
    toast.error(error instanceof Error ? error.message : 'Could not load Associated Data.')
  })

  function syncMedianFromBaseline() {
    const ct = cycleTime.value
    if (!ct) {
      medianSource.value = 'system'
      return
    }
    if (ct.baselineType?.toUpperCase() === 'MANUAL') {
      medianSource.value = 'manual'
    } else {
      medianSource.value = 'system'
    }
  }

  watch(cycleTime, () => syncMedianFromBaseline(), { immediate: true })

  function openEditor(kind: AdTab) {
    editor.value = kind
    editorOpen.value = true
  }

  function onCycleTimeUpdated(value: CycleTimeBaseline) {
    cycleTime.value = value
    syncMedianFromBaseline()
  }

  return {
    tabs: ['team', 'tms', 'support', 'calendar', 'volume'] as AdTab[],
    activeTab,
    loading,
    teamSetup,
    support,
    calendar,
    monthly,
    daily,
    slot,
    cycleTime,
    editorOpen,
    editor,
    medianSource,
    openEditor,
    onCycleTimeUpdated,
  }
}
