import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { TmsSession } from '../types'

export const useTmsSessionStore = defineStore('tms-session', () => {
  const currentSession = ref<TmsSession | null>(null)

  function setCurrentSession(session: TmsSession | null) {
    currentSession.value = session
  }

  return { currentSession, setCurrentSession }
})
