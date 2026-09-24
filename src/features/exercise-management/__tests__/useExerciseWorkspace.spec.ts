import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

import { emptyScenarioForm, type ScenarioFormValues } from '../schemas/scenario'
import {
  provideExerciseWorkspace,
  scenarioFormKey,
  useExerciseWorkspace,
} from '../composables/useExerciseWorkspace'

function form(patch: Partial<ScenarioFormValues> = {}): ScenarioFormValues {
  return { ...emptyScenarioForm(), name: 'S1', rightSizingHc: 12, ...patch }
}

function mountWorkspace() {
  let api: ReturnType<typeof provideExerciseWorkspace> | null = null
  const Child = defineComponent({
    setup() {
      return () => h('div')
    },
  })
  const Parent = defineComponent({
    setup() {
      api = provideExerciseWorkspace()
      return () => h(Child)
    },
  })
  mount(Parent)
  return api!
}

describe('useExerciseWorkspace', () => {
  it('keeps drafts when values change', () => {
    const workspace = mountWorkspace()
    workspace.ensureSaved('s1', form({ rightSizingHc: 12 }))
    workspace.setDraft('s1', form({ rightSizingHc: 14 }))
    expect(workspace.getDraft('s1')?.rightSizingHc).toBe(14)

    workspace.markSaved('s1', form({ rightSizingHc: 14 }))
    expect(workspace.getDraft('s1')?.rightSizingHc).toBe(14)
  })

  it('saves identity without clearing HC or shift drafts', () => {
    const workspace = mountWorkspace()
    workspace.ensureSaved('s1', form({ name: 'Old', rightSizingHc: 12 }))
    workspace.setDraft('s1', form({ name: 'Old', rightSizingHc: 16 }))
    workspace.markIdentitySaved('s1', 'New name', 'note')
    expect(workspace.getDraft('s1')?.name).toBe('New name')
    expect(workspace.getDraft('s1')?.rightSizingHc).toBe(16)
  })

  it('drops drafts', () => {
    const workspace = mountWorkspace()
    workspace.ensureSaved('s2', form({ name: 'S2' }))
    workspace.dropDraft('s2')
    expect(workspace.getDraft('s2')).toBeNull()
  })

  it('scenarioFormKey ignores whitespace-only description changes', () => {
    const a = form({ description: '  note  ' })
    const b = form({ description: 'note' })
    expect(scenarioFormKey(a)).toBe(scenarioFormKey(b))
  })

  it('injects null outside a workspace', () => {
    let injected: ReturnType<typeof useExerciseWorkspace> = null
    const Orphan = defineComponent({
      setup() {
        injected = useExerciseWorkspace()
        return () => h('div')
      },
    })
    mount(Orphan)
    expect(injected).toBeNull()
  })
})
