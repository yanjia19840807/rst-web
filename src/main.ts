import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import { captureDevIdentityFromLocation } from './auth/dev-identity'
import { useSessionStore } from './auth/session'
import { queryClient } from './api/query-client'
import App from './App.vue'
import router from './router'
import './assets/main.css'

async function unregisterMockWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    registrations
      .filter((registration) =>
        (registration.active?.scriptURL ?? registration.installing?.scriptURL ?? '').includes(
          'mockServiceWorker',
        ),
      )
      .map((registration) => registration.unregister()),
  )
}

async function enableMocking() {
  // Only mock API data when explicitly enabled. Test login is frontend identity, not MSW.
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') {
    await unregisterMockWorker()
    return
  }

  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

async function bootstrap() {
  captureDevIdentityFromLocation()
  await enableMocking()

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  useSessionStore(pinia).applyLocalIdentity()
  app.use(router)
  app.use(VueQueryPlugin, { queryClient })
  app.mount('#app')
}

void bootstrap()
