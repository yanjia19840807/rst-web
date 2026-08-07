import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import { queryClient } from './api/query-client'
import App from './App.vue'
import router from './router'
import './assets/main.css'

async function enableMocking() {
  const shouldMock = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'true'
  if (!shouldMock || import.meta.env.VITE_ENABLE_MSW === 'false') return

  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

async function bootstrap() {
  await enableMocking()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(VueQueryPlugin, { queryClient })
  app.mount('#app')
}

void bootstrap()
