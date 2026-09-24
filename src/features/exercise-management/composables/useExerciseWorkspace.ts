import { inject, provide, reactive, ref, type InjectionKey, type Ref } from 'vue'

import type { ScenarioFormValues } from '../schemas/scenario'

function cloneForm(values: ScenarioFormValues): ScenarioFormValues {
  return JSON.parse(JSON.stringify(values)) as ScenarioFormValues
}

export function scenarioFormKey(values: ScenarioFormValues): string {
  return JSON.stringify({
    name: values.name?.trim() ?? '',
    description: values.description?.trim() ?? '',
    rightSizingHc: Number(values.rightSizingHc ?? 0),
    shifts: (values.shifts ?? []).map((shift) => ({
      shiftNo: shift.shiftNo,
      startTime: shift.startTime,
      durationHours: shift.durationHours,
      headcount: shift.headcount,
      weekendCode: shift.weekendCode,
    })),
  })
}

export type ExerciseWorkspaceApi = {
  associatedDataRevision: Ref<number>
  notifyAssociatedDataChanged: () => void
  setDraft: (scenarioId: string, values: ScenarioFormValues) => void
  getDraft: (scenarioId: string) => ScenarioFormValues | null
  ensureSaved: (scenarioId: string, values: ScenarioFormValues) => void
  markSaved: (scenarioId: string, values: ScenarioFormValues) => void
  markIdentitySaved: (scenarioId: string, name: string, description: string) => void
  dropDraft: (scenarioId: string) => void
}

const WORKSPACE_KEY: InjectionKey<ExerciseWorkspaceApi> = Symbol('exercise-workspace')

export function provideExerciseWorkspace(): ExerciseWorkspaceApi {
  const associatedDataRevision = ref(0)
  const drafts = reactive<Record<string, ScenarioFormValues>>({})

  const api: ExerciseWorkspaceApi = {
    associatedDataRevision,
    notifyAssociatedDataChanged: () => {
      associatedDataRevision.value += 1
    },
    setDraft: (scenarioId, values) => {
      drafts[scenarioId] = cloneForm(values)
    },
    getDraft: (scenarioId) => {
      const current = drafts[scenarioId]
      return current ? cloneForm(current) : null
    },
    ensureSaved: (scenarioId, values) => {
      if (drafts[scenarioId]) return
      drafts[scenarioId] = cloneForm(values)
    },
    markSaved: (scenarioId, values) => {
      drafts[scenarioId] = cloneForm(values)
    },
    markIdentitySaved: (scenarioId, name, description) => {
      const current = drafts[scenarioId]
      if (!current) return
      drafts[scenarioId] = {
        ...cloneForm(current),
        name,
        description,
      }
    },
    dropDraft: (scenarioId) => {
      delete drafts[scenarioId]
    },
  }

  provide(WORKSPACE_KEY, api)
  return api
}

export function useExerciseWorkspace(): ExerciseWorkspaceApi | null {
  return inject(WORKSPACE_KEY, null)
}
