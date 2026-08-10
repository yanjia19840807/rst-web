import { createRouter, createWebHistory } from 'vue-router'

import { routes } from './routes'

const APP_TITLE = 'Right Sizing Tool'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.afterEach((to) => {
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title.trim() : ''
  document.title = pageTitle && pageTitle !== APP_TITLE ? `${pageTitle} · ${APP_TITLE}` : APP_TITLE
})

export default router
