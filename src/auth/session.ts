import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/api/client'

import { homePathForRoles } from '@/navigation/home'

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
  center?: string | null
}

/**
 * Client session backed by {@code GET /api/v1/me} (dev-identity or SSO principal).
 */
export const useSessionStore = defineStore('session', () => {
  const user = ref<CurrentUser | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const signedOut = ref(false)
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
  const homePath = computed(() => homePathForRoles(roles.value))

  const contextLabel = computed(() => {
    if (!displayName.value) return ''
    return rolesLabel.value
      ? `${displayName.value} · ${rolesLabel.value}`
      : displayName.value
  })

  async function load() {
    if (signedOut.value) return
    if (loadPromise) return loadPromise
    loading.value = true
    error.value = null
    loadPromise = apiRequest<CurrentUser>('/api/v1/me')
      .then((me) => {
        user.value = me
        signedOut.value = false
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

  function azureLogoutUrl() {
    const tenant = String(import.meta.env.VITE_AZURE_TENANT_ID ?? '').trim()
    if (!tenant || typeof window === 'undefined') return null
    const redirect = encodeURIComponent(`${window.location.origin}/`)
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/logout?post_logout_redirect_uri=${redirect}`
  }

  async function signOut() {
    user.value = null
    error.value = null
    loadPromise = null
    signedOut.value = true
    const logoutUrl = azureLogoutUrl()
    if (logoutUrl) {
      window.location.assign(logoutUrl)
    }
  }

  async function signIn() {
    signedOut.value = false
    loadPromise = null
    await load()
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
    signedOut,
    displayName,
    ccgid,
    email,
    roles,
    permissions,
    rolesLabel,
    homePath,
    contextLabel,
    load,
    signOut,
    signIn,
    hasPermission,
    hasAnyPermission,
  }
})
