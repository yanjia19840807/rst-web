import { computed, inject, provide, ref, toValue, type InjectionKey, type MaybeRefOrGetter } from 'vue'
import { toast } from 'vue-sonner'

import { exerciseApi } from '../api'
import { useExerciseMutations } from '../api/mutations'
import { resultClearPrompt, type ResultClearScope } from '../resultClear'

export const beforeAssociatedDataWriteKey: InjectionKey<
  (scope: ResultClearScope, action: string) => Promise<boolean>
> = Symbol('beforeAssociatedDataWrite')

export function provideAssociatedDataSaveGuard(exerciseId: MaybeRefOrGetter<string>) {
  const { clearCommittedResults } = useExerciseMutations()
  const confirmOpen = ref(false)
  const accepting = ref(false)
  const scenarioCount = ref(0)
  const pendingScope = ref<ResultClearScope>('ALL')
  const prompt = ref(resultClearPrompt('ALL', 'Saving Associated Data'))
  let waiter: ((agreed: boolean) => void) | null = null

  const pending = computed(() => accepting.value || clearCommittedResults.isPending.value)

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
    if (accepting.value || clearCommittedResults.isPending.value) return
    finish(false)
  }

  async function confirm() {
    if (!waiter || accepting.value || clearCommittedResults.isPending.value) return
    accepting.value = true
    try {
      await clearCommittedResults.mutateAsync({
        id: toValue(exerciseId),
        scope: pendingScope.value,
      })
      finish(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not clear saved results.')
      finish(false)
    }
  }

  async function beforeAssociatedDataWrite(
    scope: ResultClearScope,
    action: string,
  ): Promise<boolean> {
    pendingScope.value = scope
    prompt.value = resultClearPrompt(scope, action)
    try {
      const status = await exerciseApi.committedResults(toValue(exerciseId), scope)
      scenarioCount.value = status.scenarioCount
      if (status.scenarioCount > 0) return ask()
      return true
    } catch {
      scenarioCount.value = 0
      return ask()
    }
  }

  provide(beforeAssociatedDataWriteKey, beforeAssociatedDataWrite)

  return {
    confirmOpen,
    scenarioCount,
    prompt,
    pending,
    cancel,
    confirm,
    beforeAssociatedDataWrite,
  }
}

export function useBeforeAssociatedDataWrite() {
  return inject(beforeAssociatedDataWriteKey, async () => true)
}
