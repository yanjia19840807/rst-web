import { readonly, ref } from 'vue'
import { START_LOCATION, type Router } from 'vue-router'

/** Keep the bar visible long enough to read, even on a cached chunk. */
export const ROUTE_LOADING_MIN_VISIBLE_MS = 400

const routeLoading = ref(false)
const installedRouters = new WeakSet<Router>()
let hideTimer: ReturnType<typeof setTimeout> | undefined
let shownAt = 0

function clearTimers() {
  clearTimeout(hideTimer)
  hideTimer = undefined
}

function showRouteLoading() {
  clearTimers()
  if (!routeLoading.value) shownAt = Date.now()
  routeLoading.value = true
}

function hideRouteLoading() {
  clearTimers()
  if (!routeLoading.value) return
  const remain = Math.max(0, ROUTE_LOADING_MIN_VISIBLE_MS - (Date.now() - shownAt))
  hideTimer = setTimeout(() => {
    routeLoading.value = false
    shownAt = 0
    hideTimer = undefined
  }, remain)
}

export function installRouteLoading(router: Router) {
  if (installedRouters.has(router)) return
  installedRouters.add(router)

  router.beforeEach((to, from) => {
    if (from === START_LOCATION || to.fullPath === from.fullPath) return
    showRouteLoading()
  })

  router.afterEach(hideRouteLoading)
  router.onError(hideRouteLoading)
}

export function useRouteLoading() {
  return {
    routeLoading: readonly(routeLoading),
  }
}

export function resetRouteLoadingForTests() {
  clearTimers()
  routeLoading.value = false
  shownAt = 0
}
