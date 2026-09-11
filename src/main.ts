import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import { captureDevIdentityFromLocation } from './auth/dev-identity'
import { isSsoEnabled } from './auth/sso'
import { useSessionStore } from './auth/session'
import { queryClient } from './api/query-client'
import App from './App.vue'
import router from './router'
import './assets/main.css'

async function bootstrap() {
  if (!isSsoEnabled()) {
    captureDevIdentityFromLocation()
  }

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  if (!isSsoEnabled()) {
    useSessionStore(pinia).applyLocalIdentity()
  }
  app.use(router)
  app.use(VueQueryPlugin, { queryClient })
  app.mount('#app')
}

void bootstrap()
