import { computed, nextTick, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { useToolkitMutations } from '../api/mutations'
import {
  useSharedKpiCandidatesQuery,
  useToolkitHierarchyQuery,
  useToolkitQuery,
} from '../api/queries'
import { kpiKey } from '../kpiKey'
import { emptyToolkitForm, toolkitEditorSchema, type ToolkitFormValues } from '../schemas/toolkit'
import type { SharedKpiKey } from '../types'

function unique(values: string[]) {
  return [...new Set(values)]
}

export function useToolkitEditor(toolkitId: MaybeRefOrGetter<string | undefined>) {
  const router = useRouter()
  const mutations = useToolkitMutations()
  const resolvedId = computed(() => toValue(toolkitId))
  const hierarchyQuery = useToolkitHierarchyQuery()
  const toolkitQuery = useToolkitQuery(resolvedId)
  const selectedCountries = ref<string[]>([])
  const hydrating = ref(false)
  const initialized = ref(false)
  const kpiOpen = ref(false)
  const deleteOpen = ref(false)

  const {
    defineField,
    errors,
    handleSubmit,
    resetForm,
    setFieldError,
    setFieldValue,
    submitCount,
    values,
  } =
    useForm<ToolkitFormValues>({
      validationSchema: toTypedSchema(toolkitEditorSchema),
      initialValues: emptyToolkitForm(),
      validateOnMount: false,
    })

  const [name] = defineField('name')
  const [center] = defineField('center')
  const [domain] = defineField('domain')
  const [pl1] = defineField('pl1')
  const [pl2] = defineField('pl2')
  const [supervisorPositionId] = defineField('supervisorPositionId')
  const [combineSubtasksTime] = defineField('combineSubtasksTime')

  const candidatesQuery = useSharedKpiCandidatesQuery(
    () => values.pl3Code,
    () => values.supervisorPositionId,
    selectedCountries,
  )

  const hierarchy = computed(() => hierarchyQuery.data.value ?? [])
  const noTimesheetHierarchy = computed(
    () => hierarchyQuery.isSuccess.value && hierarchy.value.length === 0,
  )
  const centers = computed(() => unique(hierarchy.value.map((item) => item.center)))
  const domains = computed(() =>
    unique(hierarchy.value.filter((item) => item.center === values.center).map((item) => item.domain)),
  )
  const pl1s = computed(() =>
    unique(
      hierarchy.value
        .filter((item) => item.center === values.center && item.domain === values.domain)
        .map((item) => item.pl1),
    ),
  )
  const pl2s = computed(() =>
    unique(
      hierarchy.value
        .filter(
          (item) =>
            item.center === values.center &&
            item.domain === values.domain &&
            item.pl1 === values.pl1,
        )
        .map((item) => item.pl2),
    ),
  )
  const pl3s = computed(() =>
    hierarchy.value.filter(
      (item) =>
        item.center === values.center &&
        item.domain === values.domain &&
        item.pl1 === values.pl1 &&
        item.pl2 === values.pl2,
    ),
  )

  const candidates = computed(() => candidatesQuery.data.value?.items ?? [])
  const countries = computed(() => candidatesQuery.data.value?.customerCountries ?? [])
  const syncDate = computed(() => candidatesQuery.data.value?.syncDate ?? '')

  const subtasks = computed({
    get: () => values.subtasks,
    set: (next) => setFieldValue('subtasks', next),
  })

  const sharedKpiSelections = computed({
    get: () => values.sharedKpiSelections,
    set: (next) => {
      // Keep silent until Save; only clear a prior submit error when the field becomes valid.
      setFieldValue('sharedKpiSelections', next, false)
      if (next.length > 0) setFieldError('sharedKpiSelections', undefined)
    },
  })

  const selectedKpiRows = computed(() =>
    sharedKpiSelections.value.map((selection) => {
      const match = candidates.value.find((item) => kpiKey(item) === kpiKey(selection))
      return { ...selection, deliveryHc: match?.deliveryHc ?? null }
    }),
  )

  const totalHc = computed(() =>
    selectedKpiRows.value.reduce((sum, item) => sum + (item.deliveryHc ?? 0), 0).toFixed(2),
  )

  const loading = computed(
    () =>
      hierarchyQuery.isPending.value ||
      (Boolean(resolvedId.value) && toolkitQuery.isPending.value),
  )
  const busy = computed(
    () =>
      mutations.create.isPending.value ||
      mutations.update.isPending.value ||
      mutations.remove.isPending.value,
  )

  async function hydrate() {
    if (!hierarchyQuery.isSuccess.value || initialized.value) return
    if (resolvedId.value) {
      if (toolkitQuery.isError.value) {
        toast.error('Toolkit not found.')
        void router.push({ name: 'supervisor-toolkits' })
        return
      }
      if (!toolkitQuery.data.value) return
      hydrating.value = true
      const toolkit = toolkitQuery.data.value
      resetForm({
        values: {
          name: toolkit.name,
          description: toolkit.description ?? '',
          supervisorPositionId: toolkit.supervisorPositionId,
          center: toolkit.center,
          domain: toolkit.domain,
          pl1: toolkit.pl1,
          pl2: toolkit.pl2,
          pl3Code: toolkit.pl3Code,
          pl3Name: toolkit.pl3Name,
          combineSubtasksTime: toolkit.combineSubtasksTime,
          subtasks: toolkit.subtasks.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description ?? '',
            displayOrder: item.displayOrder,
            deletedAt: item.deletedAt,
          })),
          sharedKpiSelections: toolkit.sharedKpiSelections.map((item) => ({
            carrier: item.carrier,
            site: item.site,
            customerCountry: item.customerCountry,
          })),
          version: toolkit.version,
        },
      })
      selectedCountries.value = unique(
        toolkit.sharedKpiSelections.map((item) => item.customerCountry),
      )
      initialized.value = true
      await nextTick()
      hydrating.value = false
      return
    }
    hydrating.value = true
    resetForm({ values: emptyToolkitForm() })
    selectedCountries.value = []
    initialized.value = true
    await nextTick()
    hydrating.value = false
  }

  watch(
    [
      () => hierarchyQuery.isSuccess.value,
      () => toolkitQuery.data.value,
      () => toolkitQuery.isError.value,
      resolvedId,
    ],
    () => {
      void hydrate()
    },
    { immediate: true },
  )

  watch(resolvedId, () => {
    initialized.value = false
  })

  watch(center, () => {
    if (hydrating.value) return
    if (!domains.value.includes(values.domain)) setFieldValue('domain', '', false)
  })
  watch(domain, () => {
    if (hydrating.value) return
    if (!pl1s.value.includes(values.pl1)) setFieldValue('pl1', '', false)
  })
  watch(pl1, () => {
    if (hydrating.value) return
    if (!pl2s.value.includes(values.pl2)) setFieldValue('pl2', '', false)
  })
  watch(pl2, () => {
    if (hydrating.value) return
    if (!pl3s.value.some((item) => item.pl3Code === values.pl3Code)) {
      setFieldValue('pl3Code', '', false)
      setFieldValue('pl3Name', '', false)
      setFieldValue('supervisorPositionId', '', false)
      setFieldValue('sharedKpiSelections', [], false)
      selectedCountries.value = []
    }
  })
  watch(supervisorPositionId, (positionId) => {
    if (hydrating.value) return
    const selected = pl3s.value.find((item) => item.supervisorPositionId === positionId)
    if (selected) {
      setFieldValue('pl3Code', selected.pl3Code, false)
      setFieldValue('pl3Name', selected.pl3Name, false)
      return
    }
    setFieldValue('pl3Code', '', false)
    setFieldValue('pl3Name', '', false)
  })
  watch(selectedCountries, (next) => {
    if (hydrating.value) return
    sharedKpiSelections.value = sharedKpiSelections.value.filter((item) =>
      next.includes(item.customerCountry),
    )
  })

  function applyKpiSelection(items: SharedKpiKey[]) {
    sharedKpiSelections.value = items
  }

  function removeKpi(item: SharedKpiKey) {
    sharedKpiSelections.value = sharedKpiSelections.value.filter(
      (selection) => kpiKey(selection) !== kpiKey(item),
    )
  }

  const save = handleSubmit(
    async (payload) => {
      try {
        if (resolvedId.value) {
          await mutations.update.mutateAsync({ id: resolvedId.value, input: payload })
        } else {
          await mutations.create.mutateAsync(payload)
        }
        toast.success(resolvedId.value ? 'Toolkit updated.' : 'Toolkit created.')
        void router.push({ name: 'supervisor-toolkits' })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Toolkit could not be saved.')
      }
    },
    ({ errors: submitErrors }) => {
      const first = Object.values(submitErrors).find((message) => Boolean(message))
      toast.error(
        typeof first === 'string'
          ? first
          : 'Complete the hierarchy and at least one Shared KPI selection.',
      )
    },
  )

  async function confirmDelete() {
    if (!resolvedId.value) return
    try {
      await mutations.remove.mutateAsync(resolvedId.value)
      deleteOpen.value = false
      toast.success(`${values.name} deleted.`)
      void router.push({ name: 'supervisor-toolkits' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Toolkit could not be deleted.')
    }
  }

  const mappingErrors = computed(() =>
    submitCount.value > 0 ? errors.value : {},
  )
  const sharedKpiError = computed(() =>
    submitCount.value > 0 ? errors.value.sharedKpiSelections : undefined,
  )

  return {
    name,
    center,
    domain,
    pl1,
    pl2,
    supervisorPositionId,
    combineSubtasksTime,
    values,
    errors: mappingErrors,
    sharedKpiError,
    selectedCountries,
    centers,
    domains,
    pl1s,
    pl2s,
    pl3s,
    countries,
    candidates,
    syncDate,
    subtasks,
    sharedKpiSelections,
    selectedKpiRows,
    totalHc,
    noTimesheetHierarchy,
    loading,
    busy,
    kpiOpen,
    deleteOpen,
    applyKpiSelection,
    removeKpi,
    save,
    confirmDelete,
  }
}
