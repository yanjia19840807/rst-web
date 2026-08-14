import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/api/client'

import {
  isAppRole,
  permissionsForRoles,
  ROLE_LABELS,
  type AppRole,
  type Permission,
} from './permissions'

export type CurrentUser = {
  ccgid: string
  displayName: string
  email: string
  roles: string[]
  scopes: string[]
}

/**
 * Client session backed by {@code GET /api/v1/me} (dev-identity or SSO principal).
 */
export const useSessionStore = defineStore('session', () => {
  const user = ref<CurrentUser | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let loadPromise: Promise<void> | null = null

  const displayName = computed(() => user.value?.displayName ?? '')
  const ccgid = computed(() => user.value?.ccgid ?? '')
  const email = computed(() => user.value?.email ?? '')
  const roles = computed<AppRole[]>(() =>
    (user.value?.roles ?? []).map((role) => role.toUpperCase()).filter(isAppRole),
  )
  const permissions = computed(() => permissionsForRoles(roles.value))

  const rolesLabel = computed(() =>
    roles.value.map((role) => ROLE_LABELS[role]).join(' · '),
  )

  const contextLabel = computed(() => {
    if (!displayName.value) return ''
    return rolesLabel.value
      ? `${displayName.value} · ${rolesLabel.value}`
      : displayName.value
  })

  async function load() {
    if (loadPromise) return loadPromise
    loading.value = true
    error.value = null
    loadPromise = apiRequest<CurrentUser>('/api/v1/me')
      .then((me) => {
        user.value = me
      })
      .catch((err: unknown) => {
        user.value = null
        error.value = err instanceof Error ? err.message : 'Could not load current user.'
      })
      .finally(() => {
        loading.value = false
      })
    return loadPromise
  }

  function hasPermission(permission: Permission) {
    return permissions.value.includes(permission)
  }

  function hasAnyPermission(required: readonly Permission[]) {
    return required.some((permission) => hasPermission(permission))
  }

  return {
    user,
    loading,
    error,
    displayName,
    ccgid,
    email,
    roles,
    permissions,
    rolesLabel,
    contextLabel,
    load,
    hasPermission,
    hasAnyPermission,
  }
})
