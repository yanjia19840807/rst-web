import { createRouter, createWebHistory } from 'vue-router'

import { queryClient } from '@/api/query-client'
import { captureDevIdentityFromQuery, resolveDevIdentity, stripDevIdentityQuery } from '@/auth/dev-identity'
import { isSsoEnabled } from '@/auth/sso'
import { useSessionStore } from '@/auth/session'
import { useCenterCatalogStore } from '@/catalog/centerCatalog'
import { installRouteLoading } from '@/composables/useRouteLoading'

import { routes } from './routes'

const APP_TITLE = 'Right Sizing Tool'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  if (isSsoEnabled()) {
    const session = useSessionStore()
    await session.load()
    if (!session.user) {
      if (session.error || session.signedOut) return
      return false
    }
    await useCenterCatalogStore().load()
    if (to.name === 'home' || to.name === 'not-found') return session.homePath
    return
  }
  if (captureDevIdentityFromQuery(to.query)) {
    const session = useSessionStore()
    session.applyLocalIdentity()
    queryClient.clear()
    const query = stripDevIdentityQuery({ ...to.query }) ?? {}
    return { path: to.path, query, hash: to.hash, replace: true }
  }
  await useCenterCatalogStore().load()
  if (to.name !== 'home' && to.name !== 'not-found') return
  const session = useSessionStore()
  if (resolveDevIdentity().role) {
    session.applyLocalIdentity()
  } else {
    await session.load()
  }
  return session.homePath
})

router.afterEach((to) => {
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title.trim() : ''
  document.title = pageTitle && pageTitle !== APP_TITLE ? `${pageTitle} · ${APP_TITLE}` : APP_TITLE
})

installRouteLoading(router)

export default router
