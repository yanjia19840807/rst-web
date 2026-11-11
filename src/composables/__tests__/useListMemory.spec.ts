import { defineComponent, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { useListMemory } from '../useListMemory'

function host(key: string) {
  return defineComponent({
    setup() {
      const draft = reactive({ exerciseCode: '', countries: [] as string[] })
      const applied = reactive({ exerciseCode: '', countries: [] as string[] })
      const page = ref(1)
      const pageSize = ref(10)
      useListMemory(key, { draft, applied, page, pageSize })
      return { draft, applied, page, pageSize }
    },
    template: '<div />',
  })
}

describe('useListMemory', () => {
  it('restores filters, page, and scroll after the list unmounts', async () => {
    const key = 'list-memory-spec'
    const main = document.createElement('main')
    main.id = 'main-content'
    document.body.append(main)

    const first = mount(host(key))
    first.vm.draft.exerciseCode = 'RST-1'
    first.vm.draft.countries = ['CN', 'FR']
    first.vm.applied.exerciseCode = 'RST-1'
    first.vm.page = 3
    first.vm.pageSize = 25
    main.scrollTop = 180
    first.unmount()
    main.scrollTop = 0

    const second = mount(host(key))
    expect(second.vm.draft.exerciseCode).toBe('RST-1')
    expect(second.vm.draft.countries).toEqual(['CN', 'FR'])
    expect(second.vm.applied.exerciseCode).toBe('RST-1')
    expect(second.vm.page).toBe(3)
    expect(second.vm.pageSize).toBe(25)
    await nextTick()
    expect(main.scrollTop).toBe(180)

    second.unmount()
    main.remove()
  })
})
