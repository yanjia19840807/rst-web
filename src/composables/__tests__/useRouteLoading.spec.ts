import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import {
  installRouteLoading,
  resetRouteLoadingForTests,
  ROUTE_LOADING_MIN_VISIBLE_MS,
  useRouteLoading,
} from '../useRouteLoading'

const Page = defineComponent({ template: '<div>page</div>' })

function delayedPage(ms: number) {
  return () =>
    new Promise<typeof Page>((resolve) => {
      setTimeout(() => resolve(Page), ms)
    })
}

describe('useRouteLoading', () => {
  afterEach(() => {
    resetRouteLoadingForTests()
  })

  it('shows loading while a slow route chunk is resolving', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Page },
        { path: '/detail', component: delayedPage(400) },
      ],
    })
    installRouteLoading(router)
    await router.push('/')
    await router.isReady()
    resetRouteLoadingForTests()

    const { routeLoading } = useRouteLoading()
    const navigation = router.push('/detail')
    await flushPromises()
    expect(routeLoading.value).toBe(true)

    await navigation
    expect(routeLoading.value).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, ROUTE_LOADING_MIN_VISIBLE_MS + 30))
    expect(routeLoading.value).toBe(false)
  })

  it('clears loading after the minimum visible time on a fast route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Page },
        { path: '/ready', component: Page },
      ],
    })
    installRouteLoading(router)
    await router.push('/')
    await router.isReady()
    resetRouteLoadingForTests()

    const { routeLoading } = useRouteLoading()
    await router.push('/ready')
    await flushPromises()
    expect(routeLoading.value).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, ROUTE_LOADING_MIN_VISIBLE_MS + 30))
    expect(routeLoading.value).toBe(false)
  })
})
