import { createRouter, createWebHistory } from 'vue-router'

import { queryClient } from '@/api/query-client'
import { captureDevIdentityFromQuery, resolveDevIdentity, stripDevIdentityQuery } from '@/auth/dev-identity'
import { consumeSignedOutLanding, isSsoEnabled } from '@/auth/sso'
import { useSessionStore } from '@/auth/session'
import { useCenterCatalogStore } from '@/catalog/centerCatalog'
import { installRouteLoading } from '@/composables/useRouteLoading'

import { allowsRoute } from './access'
import { routes } from './routes'
import { unsignedSsoRedirect } from './ssoNavigation'

const APP_TITLE = 'Right Sizing Tool'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  if (isSsoEnabled()) {
    const session = useSessionStore()
    const returningSignedOut = consumeSignedOutLanding()
    if (returningSignedOut) session.acknowledgeSignedOut()
    const onSignIn = to.name === 'sign-in'
    await session.load({ redirectOnUnauthorized: false })
    if (!session.user) {
      const target = unsignedSsoRedirect(to.name)
      if (target === null) {
        if (onSignIn && to.query.ssoError != null) return { name: 'sign-in', replace: true }
        return
      }
      return target
    }
    await useCenterCatalogStore().load()
    if (onSignIn || to.name === 'home' || to.name === 'not-found') return session.homePath
    if (!allowsRoute(to, session.roles) && to.path !== session.homePath) return session.homePath
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
  const session = useSessionStore()
  if (resolveDevIdentity().role && !session.user) {
    session.applyLocalIdentity()
  }
  await session.load()
  if (to.name === 'sign-in' || to.name === 'home' || to.name === 'not-found') return session.homePath
  if (!allowsRoute(to, session.roles) && to.path !== session.homePath) return session.homePath
})

router.afterEach((to) => {
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title.trim() : ''
  document.title = pageTitle && pageTitle !== APP_TITLE ? `${pageTitle} · ${APP_TITLE}` : APP_TITLE
})

installRouteLoading(router)

export default router
