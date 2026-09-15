import { computed, inject, provide, ref, toValue, type InjectionKey, type MaybeRefOrGetter } from 'vue'
import { toast } from 'vue-sonner'

import { useExerciseMutations } from '../api/mutations'
import { useCommittedResultsQuery } from '../api/queries'

export const beforeAssociatedDataWriteKey: InjectionKey<() => Promise<boolean>> = Symbol(
  'beforeAssociatedDataWrite',
)

export function provideAssociatedDataSaveGuard(exerciseId: MaybeRefOrGetter<string>) {
  const query = useCommittedResultsQuery(exerciseId)
  const { clearCommittedResults } = useExerciseMutations()
  const confirmOpen = ref(false)
  const accepting = ref(false)
  let waiter: ((agreed: boolean) => void) | null = null

  const scenarioCount = computed(() => query.data.value?.scenarioCount ?? 0)
  const pending = computed(
    () => accepting.value || clearCommittedResults.isPending.value,
  )

  function finish(agreed: boolean) {
    const done = waiter
    waiter = null
    accepting.value = false
    confirmOpen.value = false
    done?.(agreed)
  }

  function ask(): Promise<boolean> {
    confirmOpen.value = true
    return new Promise((resolve) => {
      waiter = resolve
    })
  }

  function cancel() {
    // Confirm closes the dialog before mutate finishes; do not treat that as Cancel.
    if (accepting.value || clearCommittedResults.isPending.value) return
    finish(false)
  }

  async function confirm() {
    if (!waiter || accepting.value || clearCommittedResults.isPending.value) return
    accepting.value = true
    try {
      await clearCommittedResults.mutateAsync(toValue(exerciseId))
      finish(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not clear saved results.')
      finish(false)
    }
  }

  async function beforeAssociatedDataWrite(): Promise<boolean> {
    const result = await query.refetch()
    if (result.error || (result.data?.scenarioCount ?? 0) > 0) return ask()
    return true
  }

  provide(beforeAssociatedDataWriteKey, beforeAssociatedDataWrite)

  return {
    confirmOpen,
    scenarioCount,
    pending,
    cancel,
    confirm,
    beforeAssociatedDataWrite,
  }
}

export function useBeforeAssociatedDataWrite() {
  return inject(beforeAssociatedDataWriteKey, async () => true)
}
