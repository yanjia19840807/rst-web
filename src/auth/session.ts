import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/api/client'

import { homePathForRoles } from '@/navigation/home'

import {
  clearDevIdentity,
  displayNameForCcgid,
  resolveDevIdentity,
} from './dev-identity'
import { readDelegationId, writeDelegationId } from './delegation'
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
  actor?: { ccgid: string; displayName: string } | null
  delegationId?: string | null
  /** Present on {@code dev}/{@code test} (and MSW) when test-login override is on. */
  devOverrideEnabled?: boolean | null
}

const GRANTABLE_ROLES: readonly AppRole[] = [
  'AGENT',
  'SUPERVISOR',
  'MANAGER',
  'CDH',
  'LTH',
]

const MAIL_ROLES: readonly AppRole[] = ['SUPERVISOR', 'MANAGER', 'CDH', 'LTH', 'ADMIN']

function userFromDevIdentity(): CurrentUser {
  const identity = resolveDevIdentity()
  const ccgid = (identity.ccgid || 'ADMIN001').toUpperCase()
  const role = (identity.role || 'ADMIN').toUpperCase()
  const displayName = displayNameForCcgid(ccgid)
  return {
    ccgid,
    displayName,
    email: `${ccgid.toLowerCase()}@dev.local`,
    roles: [role],
    scopes: ['TIMESHEET', 'SELF'],
    center: identity.center ?? null,
    actor: { ccgid, displayName },
    delegationId: null,
    devOverrideEnabled: true,
  }
}

/**
 * Client session. Query-param identity is applied first so the shell has a role
 * while {@code GET /api/v1/me} is in flight.
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

  const actingAs = computed(() => Boolean(user.value?.delegationId))
  const actorCcgid = computed(() => user.value?.actor?.ccgid ?? ccgid.value)
  const actorDisplayName = computed(() => user.value?.actor?.displayName ?? displayName.value)
  const delegationId = computed(() => user.value?.delegationId ?? readDelegationId())

  const contextLabel = computed(() => {
    if (!displayName.value) return ''
    return rolesLabel.value
      ? `${displayName.value} · ${rolesLabel.value}`
      : displayName.value
  })

  const canManageDelegation = computed(
    () => !actingAs.value && roles.value.some((role) => GRANTABLE_ROLES.includes(role)),
  )

  const canManageMailPreferences = computed(
    () => !actingAs.value && roles.value.some((role) => MAIL_ROLES.includes(role)),
  )

  function applyLocalIdentity() {
    user.value = userFromDevIdentity()
    signedOut.value = false
    error.value = null
  }

  async function load() {
    if (signedOut.value) return
    if (loadPromise) return loadPromise
    applyLocalIdentity()
    loading.value = true
    loadPromise = apiRequest<CurrentUser>('/api/v1/me')
      .then((me) => {
        const local = userFromDevIdentity()
        user.value = {
          ...local,
          displayName: me.ccgid === local.ccgid && me.displayName ? me.displayName : local.displayName,
          email: me.ccgid === local.ccgid && me.email ? me.email : local.email,
          scopes: me.scopes?.length ? me.scopes : local.scopes,
          actor: me.ccgid === local.ccgid && me.actor ? me.actor : local.actor,
          delegationId: me.delegationId ?? null,
          devOverrideEnabled: true,
        }
        signedOut.value = false
        if (!me.delegationId && readDelegationId()) {
          writeDelegationId(null)
        }
      })
      .catch((err: unknown) => {
        applyLocalIdentity()
        error.value = err instanceof Error ? err.message : 'Could not load current user.'
      })
      .finally(() => {
        loading.value = false
      })
    return loadPromise
  }

  async function reload() {
    loadPromise = null
    await load()
  }

  async function actAs(id: string) {
    writeDelegationId(id)
    await reload()
  }

  async function stopActing() {
    writeDelegationId(null)
    await reload()
  }

  function azureLogoutUrl() {
    const tenant = String(import.meta.env.VITE_AZURE_TENANT_ID ?? '').trim()
    if (!tenant || typeof window === 'undefined') return null
    const redirect = encodeURIComponent(`${window.location.origin}/`)
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/logout?post_logout_redirect_uri=${redirect}`
  }

  async function signOut() {
    writeDelegationId(null)
    clearDevIdentity()
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
    actingAs,
    actorCcgid,
    actorDisplayName,
    delegationId,
    canManageDelegation,
    canManageMailPreferences,
    applyLocalIdentity,
    load,
    reload,
    actAs,
    stopActing,
    signOut,
    signIn,
    hasPermission,
    hasAnyPermission,
  }
})
