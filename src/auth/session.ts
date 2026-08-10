import { computed } from 'vue'
import { defineStore } from 'pinia'

import {
  permissionsForRoles,
  ROLE_LABELS,
  type AppRole,
  type Permission,
} from './permissions'

/**
 * Temporary walkthrough identity until real authentication is wired.
 * Grants all roles so every permitted menu item can be exercised once.
 */
const DEV_USER = {
  displayName: 'Chen Wei',
  ccgid: 'SUPERVISOR001',
  email: 'chen.wei@dev.local',
  roles: ['AGENT', 'SUPERVISOR', 'APPROVER', 'HO'] as AppRole[],
}

export const useSessionStore = defineStore('session', () => {
  const displayName = computed(() => DEV_USER.displayName)
  const ccgid = computed(() => DEV_USER.ccgid)
  const email = computed(() => DEV_USER.email)
  const roles = computed(() => DEV_USER.roles)
  const permissions = computed(() => permissionsForRoles(roles.value))

  const rolesLabel = computed(() =>
    roles.value.map((role) => ROLE_LABELS[role]).join(' · '),
  )

  const contextLabel = computed(() => `${displayName.value} · ${rolesLabel.value}`)

  function hasPermission(permission: Permission) {
    return permissions.value.includes(permission)
  }

  function hasAnyPermission(required: readonly Permission[]) {
    return required.some((permission) => hasPermission(permission))
  }

  return {
    displayName,
    ccgid,
    email,
    roles,
    permissions,
    rolesLabel,
    contextLabel,
    hasPermission,
    hasAnyPermission,
  }
})
